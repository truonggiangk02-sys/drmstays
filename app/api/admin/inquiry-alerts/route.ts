import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { sendTelegram, telegramConfigured } from '@/lib/telegram';

type Row = { id: string; name: string; phone: string; email: string; message: string; check_in?: string; check_out?: string; property?: string; telegram_status: string };

/** Sends the Telegram alert again for a contact whose first alert failed (or never went out). */
export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  const form = await request.formData();
  const kind = String(form.get('kind') || ''), id = String(form.get('id') || '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || (kind !== 'catalog' && kind !== 'partner')) return new NextResponse('Invalid contact', { status: 400 });
  const back = new URL(kind === 'catalog' ? '/admin/catalog-inquiries' : '/admin/partner-inquiries', request.url);
  if (!telegramConfigured()) { back.searchParams.set('alert', 'unconfigured'); return NextResponse.redirect(back, 303); }

  const table = kind === 'catalog' ? 'catalog_inquiries' : 'partner_inquiries';
  const columns = kind === 'catalog' ? 'id, name, phone, email, message, check_in, check_out, telegram_status' : 'id, name, phone, email, message, property, telegram_status';
  const row = await env.DB.prepare(`SELECT ${columns} FROM ${table} WHERE id = ?`).bind(id).first<Row>();
  if (!row) return new NextResponse('Contact not found', { status: 404 });

  const lines = [
    kind === 'catalog' ? 'DRM Stays inquiry (re-sent)' : 'DRM Stays partner inquiry (re-sent)', '',
    row.check_in ? `Dates: ${row.check_in} to ${row.check_out}` : '', row.property ? `Building / area: ${row.property}` : '',
    `Name: ${row.name}`, `Phone: ${row.phone}`, row.email ? `Email: ${row.email}` : '', row.message ? `Message: ${row.message}` : '', '', 'Open the admin to follow up.',
  ].filter((line, index) => line !== '' || index === 1);
  let status = 'sent';
  try { await sendTelegram(lines.join('\n')); } catch (error) { console.error('Telegram resend failed', error instanceof Error ? error.name : 'unknown error'); status = 'failed'; }
  await env.DB.prepare(`UPDATE ${table} SET telegram_status = ? WHERE id = ?`).bind(status, id).run();
  back.searchParams.set('alert', status);
  return NextResponse.redirect(back, 303);
}
