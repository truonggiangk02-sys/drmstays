import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { consumeRateLimit, maybePruneRateLimits } from '@/lib/rate-limit';
import { clientIp, readLimitedBody } from '@/lib/request';
import { sendTelegram, telegramConfigured } from '@/lib/telegram';

const MAX_BODY_BYTES = 10_000;
const IP_LIMIT_PER_HOUR = 10;
const PHONE_LIMIT_PER_HOUR = 5;

export async function POST(request: NextRequest) {
  if (!env.DB) return new NextResponse('Contact form unavailable', { status: 503 });
  if (request.headers.get('origin') !== request.nextUrl.origin) return new NextResponse('Invalid origin', { status: 403 });
  const contentType = request.headers.get('content-type') || '';
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(contentType)) return new NextResponse('Invalid request format', { status: 415 });

  const ip = clientIp(request);
  if (ip && !(await consumeRateLimit('partner-ip', ip, IP_LIMIT_PER_HOUR))) return new NextResponse('Too many requests', { status: 429 });
  void maybePruneRateLimits();

  const raw = await readLimitedBody(request, MAX_BODY_BYTES);
  if (!raw) return new NextResponse('Request too large', { status: 413 });
  let form: FormData;
  try { form = await new Response(new Blob([raw]), { headers: { 'content-type': contentType } }).formData(); }
  catch { return new NextResponse('Invalid request body', { status: 400 }); }

  const lang = form.get('lang') === 'en' ? 'en' : 'vi';
  if (form.get('website')) return NextResponse.redirect(new URL(`/${lang}/partners?sent=1`, request.url), 303);
  const field = (key: string, max: number) => String(form.get(key) || '').trim().slice(0, max);
  const name = field('name', 100), phone = field('phone', 24), email = field('email', 254);
  const property = field('property', 200), message = field('message', 2000);
  if (!name || !/^\+?[\d\s().-]{8,24}$/.test(phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    return new NextResponse('Please check your contact details', { status: 400 });
  if (!(await consumeRateLimit('partner-phone', phone.replace(/\D/g, ''), PHONE_LIMIT_PER_HOUR))) return new NextResponse('Too many requests', { status: 429 });

  const alert = telegramConfigured();
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO partner_inquiries (id, name, phone, email, property, message, status, telegram_status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)")
    .bind(id, name, phone, email, property, message, alert ? 'pending' : 'not_applicable', new Date().toISOString()).run();
  if (alert) {
    let status = 'sent';
    try {
      await sendTelegram(`New DRM Stays partner inquiry\n\nName: ${name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}${property ? `\nBuilding / area: ${property}` : ''}${message ? `\nMessage: ${message}` : ''}\n\nOpen the admin to follow up.`);
    } catch (error) {
      console.error('Telegram alert failed', error instanceof Error ? error.name : 'unknown error');
      status = 'failed';
    }
    try { await env.DB.prepare('UPDATE partner_inquiries SET telegram_status = ? WHERE id = ?').bind(status, id).run(); }
    catch { console.error('Inquiry telegram status update failed'); }
  }
  return NextResponse.redirect(new URL(`/${lang}/partners?sent=1`, request.url), 303);
}
