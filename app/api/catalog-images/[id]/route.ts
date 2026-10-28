import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { contentSections, getContentItems, sampleContent, type ContentSection } from '@/lib/site-content';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.DB || !env.BUCKET) return new NextResponse('Not found', { status: 404 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  const row = await env.DB.prepare('SELECT object_key, mime, owner_type, owner_id FROM catalog_images WHERE id = ?')
    .bind(id)
    .first<{ object_key: string; mime: string; owner_type: string; owner_id: string }>();
  if (!row) return new NextResponse('Not found', { status: 404 });
  const admin = await isAdmin();
  if (!admin) {
    let visible = false;
    if (row.owner_type === 'content') {
      const sample = sampleContent.find(item => item.id === row.owner_id);
      const section = sample?.section || (await env.DB.prepare('SELECT section FROM site_content_items WHERE id = ?').bind(row.owner_id).first<{ section: string }>())?.section;
      if (section && contentSections.includes(section as ContentSection))
        visible = (await getContentItems(section as ContentSection)).some(item => item.id === row.owner_id);
    } else if (row.owner_type === 'building') {
      visible = !!(await env.DB.prepare('SELECT 1 FROM catalog_buildings WHERE source_id = ? AND published = 1').bind(row.owner_id).first());
    } else if (row.owner_type === 'room') {
      visible = !!(await env.DB.prepare('SELECT 1 FROM catalog_rooms r JOIN catalog_buildings b ON b.source_id = r.building_source_id WHERE r.source_id = ? AND r.published = 1 AND b.published = 1').bind(row.owner_id).first());
    }
    if (!visible) return new NextResponse('Not found', { status: 404 });
  }
  const object = await env.BUCKET.get(row.object_key);
  if (!object) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(object.body, {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': admin ? 'private, no-store' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
