import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

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
    const visible = row.owner_type === 'building'
      ? await env.DB.prepare('SELECT 1 FROM catalog_buildings WHERE source_id = ? AND published = 1').bind(row.owner_id).first()
      : await env.DB.prepare('SELECT 1 FROM catalog_rooms r JOIN catalog_buildings b ON b.source_id = r.building_source_id WHERE r.source_id = ? AND r.published = 1 AND b.published = 1').bind(row.owner_id).first();
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
