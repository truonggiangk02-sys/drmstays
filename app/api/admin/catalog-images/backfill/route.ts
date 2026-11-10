import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { imageSize } from '@/lib/image-size';

const BATCH = 20;
/** Image headers (including EXIF) sit at the start of the file; this much is plenty and avoids downloading whole photos. */
const HEAD_BYTES = 262_144;

/** Fills in width/height for photos uploaded before sizes were recorded, a batch at a time. Reads storage, writes only the two columns. */
export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB || !env.BUCKET) return new NextResponse('Image storage unavailable', { status: 503 });
  const rows = await env.DB.prepare('SELECT id, object_key FROM catalog_images WHERE width IS NULL OR height IS NULL ORDER BY id LIMIT ?')
    .bind(BATCH)
    .all<{ id: string; object_key: string }>();
  let filled = 0;
  for (const row of rows.results || []) {
    const object = await env.BUCKET.get(row.object_key, { range: { offset: 0, length: HEAD_BYTES } });
    const size = object ? imageSize(new Uint8Array(await new Response(object.body).arrayBuffer())) : null;
    if (!size) continue;
    await env.DB.prepare('UPDATE catalog_images SET width = ?, height = ? WHERE id = ?').bind(size.width, size.height, row.id).run();
    filled += 1;
  }
  const destination = new URL('/admin/media', request.url);
  destination.searchParams.set('sizes', String(filled));
  return NextResponse.redirect(destination, 303);
}
