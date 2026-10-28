import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { getPublicCatalog } from '@/lib/public-catalog';

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(request: NextRequest) {
  if (!env.DB) return new NextResponse('Contact form unavailable', { status: 503 });
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return new NextResponse('Invalid origin', { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 10_000)
    return new NextResponse('Request too large', { status: 413 });
  const form = await request.formData();
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
    (checkIn && (!validDate(checkIn) || !validDate(checkOut) || checkOut <= checkIn)) ||
    message.length > 1000
  )
    return new NextResponse('Please check your contact details', { status: 400 });
  if (sourceRoomId) {
    let catalog;
    try {
      catalog = await getPublicCatalog();
    } catch {
      return new NextResponse('Contact form unavailable', { status: 503 });
    }
    if (!catalog.buildings.some((building) => building.rooms.some((room) => room.id === sourceRoomId)))
      return new NextResponse('Room unavailable', { status: 404 });
  }
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
  const bucket = new Date().toISOString().slice(0, 13);
  const limit = await env.DB.prepare(
    'INSERT INTO inquiry_rate_limits (key, count) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count',
  )
    .bind(`catalog:${bucket}:${hash}`)
    .first<{ count: number }>();
  if (!limit || limit.count > 5) return new NextResponse('Too many requests', { status: 429 });
  await env.DB.prepare(
    "INSERT INTO catalog_inquiries (id, source_room_id, name, phone, email, check_in, check_out, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)",
  )
    .bind(
      crypto.randomUUID(),
      sourceRoomId,
      name,
      phone,
      email,
      checkIn,
      checkOut,
      message,
      new Date().toISOString(),
    )
    .run();
  return NextResponse.redirect(new URL(destination(sourceRoomId), request.url), 303);
}
