import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { validDateRange } from '@/lib/dates';
import { getPublicCatalog } from '@/lib/public-catalog';
import { consumeRateLimit, maybePruneRateLimits } from '@/lib/rate-limit';
import { clientIp, readLimitedBody } from '@/lib/request';
import { sendTelegram, telegramConfigured } from '@/lib/telegram';

const MAX_BODY_BYTES = 10_000;
const IP_LIMIT_PER_HOUR = 10;
const PHONE_LIMIT_PER_HOUR = 5;

export async function POST(request: NextRequest) {
  if (!env.DB) return new NextResponse('Contact form unavailable', { status: 503 });
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return new NextResponse('Invalid origin', { status: 403 });
  const contentType = request.headers.get('content-type') || '';
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(contentType))
    return new NextResponse('Invalid request format', { status: 415 });

  const ip = clientIp(request);
  if (ip && !(await consumeRateLimit('catalog-ip', ip, IP_LIMIT_PER_HOUR)))
    return new NextResponse('Too many requests', { status: 429 });
  void maybePruneRateLimits();

  const body = await readLimitedBody(request, MAX_BODY_BYTES);
  if (!body) return new NextResponse('Request too large', { status: 413 });
  let form: FormData;
  try {
    form = await new Response(new Blob([body]), { headers: { 'content-type': contentType } }).formData();
  } catch {
    return new NextResponse('Invalid request body', { status: 400 });
  }

  const lang = form.get('lang') === 'vi' ? 'vi' : form.get('lang') === 'en' ? 'en' : null;
  const destination = (roomId: string) => lang ? `/${lang}/${roomId ? `rooms/${roomId}` : 'contact'}?sent=1` : '/thanks';
  if (form.get('website')) return NextResponse.redirect(new URL(destination(''), request.url), 303);
  const text = (key: string, max: number) =>
    String(form.get(key) || '')
      .trim()
      .slice(0, max);
  const sourceRoomId = text('sourceRoomId', 36);
  const name = text('name', 100),
    phone = text('phone', 24),
    email = text('email', 254),
    message = text('message', 1000);
  const checkIn = text('checkIn', 10),
    checkOut = text('checkOut', 10);
  if (
    (sourceRoomId !== '' && !/^[0-9a-f-]{36}$/i.test(sourceRoomId)) ||
    !name ||
    !/^\+?[\d\s().-]{8,24}$/.test(phone) ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    !!checkIn !== !!checkOut ||
    (checkIn && !validDateRange(checkIn, checkOut))
  )
    return new NextResponse('Please check your contact details', { status: 400 });

  let roomName = '';
  let buildingName = '';
  if (sourceRoomId) {
    let catalog;
    try {
      catalog = await getPublicCatalog();
    } catch {
      return new NextResponse('Contact form unavailable', { status: 503 });
    }
    const building = catalog.buildings.find((item) => item.rooms.some((room) => room.id === sourceRoomId));
    const room = building?.rooms.find((item) => item.id === sourceRoomId);
    if (!building || !room) return new NextResponse('Room unavailable', { status: 404 });
    roomName = room.name;
    buildingName = building.name;
  }

  const phoneDigits = phone.replace(/\D/g, '');
  if (!(await consumeRateLimit('catalog-phone', phoneDigits, PHONE_LIMIT_PER_HOUR)))
    return new NextResponse('Too many requests', { status: 429 });

  const alert = telegramConfigured();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO catalog_inquiries (id, source_room_id, name, phone, email, check_in, check_out, message, status, telegram_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)",
  )
    .bind(id, sourceRoomId, name, phone, email, checkIn, checkOut, message, alert ? 'pending' : 'not_applicable', new Date().toISOString())
    .run();

  // Saved first: an alert failure is recorded for the admin but must not fail the visitor's request.
  if (alert) {
    let status = 'sent';
    try {
      await sendTelegram(
        `New DRM Stays inquiry\n\n${roomName ? `Room: ${roomName}\nBuilding: ${buildingName}\n` : ''}${checkIn ? `Dates: ${checkIn} to ${checkOut}\n` : ''}Name: ${name}\nPhone: ${phone}${email ? `\nEmail: ${email}` : ''}${message ? `\nMessage: ${message}` : ''}\n\nOpen the admin to follow up.`,
      );
    } catch (error) {
      console.error('Telegram alert failed', error instanceof Error ? error.name : 'unknown error');
      status = 'failed';
    }
    try {
      await env.DB.prepare('UPDATE catalog_inquiries SET telegram_status = ? WHERE id = ?').bind(status, id).run();
    } catch {
      console.error('Inquiry telegram status update failed');
    }
  }
  return NextResponse.redirect(new URL(destination(sourceRoomId), request.url), 303);
}
