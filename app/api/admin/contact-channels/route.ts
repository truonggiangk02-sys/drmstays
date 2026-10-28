import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { channelNames, normalizeContactUrl } from '@/lib/contact-channels';

export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 4_000) return new NextResponse('Request too large', { status: 413 });
  const form = await request.formData();
  const rows = channelNames.map(channel => ({ channel, url: normalizeContactUrl(channel, String(form.get(`${channel}Url`) || '')), published: form.get(`${channel}Published`) === 'on' }));
  if (rows.some(row => row.url === null || (row.published && !row.url))) return NextResponse.redirect(new URL('/admin/contact-channels?error=invalid', request.url), 303);
  try {
    await env.DB.batch(rows.map(row => env.DB!.prepare('INSERT INTO contact_channels (channel, url, published) VALUES (?, ?, ?) ON CONFLICT(channel) DO UPDATE SET url=excluded.url, published=excluded.published').bind(row.channel, row.url, row.published ? 1 : 0)));
  } catch {
    return new NextResponse('Could not save contact channels', { status: 503 });
  }
  return NextResponse.redirect(new URL('/admin/contact-channels?saved=1', request.url), 303);
}
