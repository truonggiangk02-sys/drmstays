import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { normalizeSocialUrl, socialNetworks } from '@/lib/social-links';

export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 4_000) return new NextResponse('Request too large', { status: 413 });
  const form = await request.formData();
  const rows = socialNetworks.map(network => ({ network, url: normalizeSocialUrl(network, String(form.get(`${network}Url`) || '')), published: form.get(`${network}Published`) === 'on' }));
  if (rows.some(row => row.url === null || (row.published && !row.url))) return NextResponse.redirect(new URL('/admin/contact-channels?socialError=invalid', request.url), 303);
  try {
    await env.DB.batch(rows.map(row => env.DB!.prepare('INSERT INTO social_links (network, url, published) VALUES (?, ?, ?) ON CONFLICT(network) DO UPDATE SET url=excluded.url, published=excluded.published').bind(row.network, row.url, row.published ? 1 : 0)));
  } catch {
    return new NextResponse('Could not save social links (has migration 0015 been applied?)', { status: 503 });
  }
  return NextResponse.redirect(new URL('/admin/contact-channels?socialSaved=1', request.url), 303);
}
