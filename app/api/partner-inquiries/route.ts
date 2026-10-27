import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!env.DB) return new NextResponse('Contact form unavailable', { status: 503 });
  if (request.headers.get('origin') !== request.nextUrl.origin) return new NextResponse('Invalid origin', { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 10_000) return new NextResponse('Request too large', { status: 413 });
  const form = await request.formData();
  const lang = form.get('lang') === 'en' ? 'en' : 'vi';
  if (form.get('website')) return NextResponse.redirect(new URL(`/${lang}/partners?sent=1`, request.url), 303);
  const field = (key: string, max: number) => String(form.get(key) || '').trim().slice(0, max);
  const name = field('name', 100), phone = field('phone', 24), email = field('email', 254);
  const property = field('property', 200), message = field('message', 2000);
  if (!name || !/^\+?[\d\s().-]{8,24}$/.test(phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    return new NextResponse('Please check your contact details', { status: 400 });
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))), byte => byte.toString(16).padStart(2, '0')).join('');
  const bucket = new Date().toISOString().slice(0, 13);
  const limit = await env.DB.prepare('INSERT INTO inquiry_rate_limits (key, count) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count')
    .bind(`partner:${bucket}:${hash}`).first<{ count: number }>();
  if (!limit || limit.count > 5) return new NextResponse('Too many requests', { status: 429 });
  await env.DB.prepare("INSERT INTO partner_inquiries (id, name, phone, email, property, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'new', ?)")
    .bind(crypto.randomUUID(), name, phone, email, property, message, new Date().toISOString()).run();
  return NextResponse.redirect(new URL(`/${lang}/partners?sent=1`, request.url), 303);
}
