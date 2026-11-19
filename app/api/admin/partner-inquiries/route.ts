import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { saveInquiry } from '@/lib/inquiries';

export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  const form = await request.formData();
  const id = String(form.get('id') || ''), status = String(form.get('status') || '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['new', 'contacted', 'closed'].includes(status)) return new NextResponse('Invalid inquiry', { status: 400 });
  await saveInquiry('partner_inquiries', id, status, form.has('note') ? String(form.get('note') || '') : null);
  return NextResponse.redirect(new URL('/admin/partner-inquiries', request.url), 303);
}
