import { NextResponse } from 'next/server';
import { catalogImageUrl } from '@/lib/image-url';

/** The old address (under /api/, which robots.txt hides from crawlers) now points at the public one. The Location is relative so it keeps whatever scheme and host the visitor used. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  return new Response(null, { status: 301, headers: { Location: catalogImageUrl(id), 'Cache-Control': 'public, max-age=86400' } });
}
