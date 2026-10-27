import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { getStaydeskCatalog } from '@/lib/staydesk-catalog';
import { getEditableContent, contentSections, sampleContent, type ContentSection } from '@/lib/site-content';

type ImageRow = {
  id: string;
  object_key: string;
  owner_type: string;
  owner_id: string;
  position: number;
};

export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request))
    return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB || !env.BUCKET) return new NextResponse('Image storage unavailable', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 5_500_000)
    return new NextResponse('Image too large', { status: 413 });
  const form = await request.formData();
  const action = String(form.get('action') || 'upload');
  const category = form.get('category') === 'floorplan' ? 'floorplan' : 'photo';
  const kind = String(form.get('kind') || '');
  const sourceId = String(form.get('sourceId') || '');
  if (!/^(?:[0-9a-f-]{36}|sample-[a-z0-9-]+)$/i.test(sourceId) || !['building', 'room', 'content'].includes(kind))
    return new NextResponse('Invalid source item', { status: 400 });
  let exists = false;
  if (kind === 'content') {
    const sample = sampleContent.find(item => item.id === sourceId);
    const section = sample?.section || (await env.DB.prepare('SELECT section FROM site_content_items WHERE id = ? AND deleted = 0').bind(sourceId).first<{ section: string }>())?.section;
    if (section && contentSections.includes(section as ContentSection))
      exists = (await getEditableContent(section as ContentSection)).some(item => item.id === sourceId);
  } else {
    let source;
    try { source = await getStaydeskCatalog(); }
    catch { return new NextResponse('Staydesk catalog unavailable', { status: 503 }); }
    exists = kind === 'building'
      ? source.buildings.some(item => item.id === sourceId)
      : source.buildings.some(item => item.rooms.some(room => room.id === sourceId));
  }
  if (!exists) return new NextResponse('Item not found', { status: 404 });

  if (action === 'upload') {
    const file = form.get('image');
    if (
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > 5_000_000 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    )
      return new NextResponse('Use a JPG, PNG or WebP image under 5 MB', { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid =
      file.type === 'image/jpeg'
        ? bytes[0] === 0xff && bytes[1] === 0xd8
        : file.type === 'image/png'
          ? bytes.slice(0, 4).join() === '137,80,78,71'
          : bytes.slice(0, 4).join() === '82,73,70,70' &&
            String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (!valid) return new NextResponse('Invalid image file', { status: 400 });
    const id = crypto.randomUUID();
    const objectKey = `catalog/${kind}/${sourceId}/${id}`;
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM catalog_images WHERE owner_type = ? AND owner_id = ?',
    )
      .bind(kind, sourceId)
      .first<{ total: number }>();
    if ((count?.total || 0) >= 20)
      return new NextResponse('Maximum 20 images per item', { status: 400 });
    await env.BUCKET.put(objectKey, bytes, { httpMetadata: { contentType: file.type } });
    try {
      await env.DB.prepare(
        'INSERT INTO catalog_images (id, owner_type, owner_id, object_key, mime, alt, position, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(
          id,
          kind,
          sourceId,
          objectKey,
          file.type,
          String(form.get('alt') || '')
            .trim()
            .slice(0, 150),
          count?.total || 0,
          category,
        )
        .run();
    } catch (error) {
      await env.BUCKET.delete(objectKey);
      throw error;
    }
  } else if (action === 'delete' || action === 'cover') {
    const imageId = String(form.get('imageId') || '');
    const row = await env.DB.prepare(
      'SELECT id, object_key, owner_type, owner_id, position FROM catalog_images WHERE id = ? AND owner_type = ? AND owner_id = ?',
    )
      .bind(imageId, kind, sourceId)
      .first<ImageRow>();
    if (!row) return new NextResponse('Image not found', { status: 404 });
    if (action === 'delete') {
      await env.DB.prepare('DELETE FROM catalog_images WHERE id = ?').bind(imageId).run();
      await env.BUCKET.delete(row.object_key);
    } else {
      const rows = await env.DB.prepare(
        "SELECT id FROM catalog_images WHERE owner_type = ? AND owner_id = ? AND category = 'photo' ORDER BY position, id",
      )
        .bind(kind, sourceId)
        .all<{ id: string }>();
      const ids = (rows.results || []).map((item) => item.id);
      const index = ids.indexOf(imageId);
      if (index < 0) return new NextResponse('Only photos can be set as cover', { status: 400 });
      if (index > 0) {
        ids.splice(index, 1);
        ids.unshift(imageId);
        await env.DB.batch(
          ids.map((id, position) =>
            env
              .DB!.prepare('UPDATE catalog_images SET position = ? WHERE id = ?')
              .bind(position, id),
          ),
        );
      }
    }
  } else return new NextResponse('Invalid action', { status: 400 });
  const returnTo = form.get('returnTo') === 'media' || kind === 'content' ? 'media' : 'catalog';
  const destination = new URL(`/admin/${returnTo}`, request.url);
  if (returnTo === 'media') destination.searchParams.set('open', sourceId);
  destination.hash = `item-${sourceId}`;
  return NextResponse.redirect(destination, 303);
}
