import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { contentSections, getContentItems, sampleContent, type ContentSection } from '@/lib/site-content';

/** Photos never change once uploaded (a new upload gets a new id), so browsers may keep them for a long time. */
const PUBLIC_CACHE = 'public, max-age=2592000, immutable';

/** Streams a catalog image from R2. Photos of items that are not published are visible to the admin only. */
export async function serveCatalogImage(request: Request, id: string): Promise<Response> {
  if (!env.DB || !env.BUCKET) return new NextResponse('Not found', { status: 404 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  const row = await env.DB.prepare('SELECT object_key, mime, owner_type, owner_id FROM catalog_images WHERE id = ?')
    .bind(id)
    .first<{ object_key: string; mime: string; owner_type: string; owner_id: string }>();
  if (!row) return new NextResponse('Not found', { status: 404 });
  const admin = await isAdmin();
  if (!admin) {
    let visible = false;
    if (row.owner_type === 'home') {
      visible = true;
    } else if (row.owner_type === 'content') {
      const sample = sampleContent.find(item => item.id === row.owner_id);
      const section = sample?.section || (await env.DB.prepare('SELECT section FROM site_content_items WHERE id = ?').bind(row.owner_id).first<{ section: string }>())?.section;
      if (section && contentSections.includes(section as ContentSection))
        visible = (await getContentItems(section as ContentSection)).some(item => item.id === row.owner_id);
    } else if (row.owner_type === 'building') {
      visible = !!(await env.DB.prepare('SELECT 1 FROM catalog_buildings WHERE source_id = ? AND published = 1').bind(row.owner_id).first());
    } else if (row.owner_type === 'room') {
      visible = !!(await env.DB.prepare('SELECT 1 FROM catalog_rooms r JOIN catalog_buildings b ON b.source_id = r.building_source_id WHERE r.source_id = ? AND r.published = 1 AND b.published = 1').bind(row.owner_id).first());
    } else if (row.owner_type === 'roomtype') {
      visible = !!(await env.DB.prepare('SELECT 1 FROM catalog_room_types t JOIN catalog_buildings b ON b.source_id = t.building_source_id WHERE t.id = ? AND t.published = 1 AND b.published = 1').bind(row.owner_id).first());
    }
    if (!visible) return new NextResponse('Not found', { status: 404 });
  }
  const object = await env.BUCKET.get(row.object_key);
  if (!object) return new NextResponse('Not found', { status: 404 });
  const etag = (object as { httpEtag?: string }).httpEtag;
  const headers: Record<string, string> = {
    'Content-Type': row.mime,
    'Cache-Control': admin ? 'private, no-store' : PUBLIC_CACHE,
    'X-Content-Type-Options': 'nosniff',
  };
  if (etag && !admin) {
    headers.ETag = etag;
    if (request.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers });
  }
  return new NextResponse(object.body, { headers });
}
