import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { HOME_KEYS, HOME_TEXT } from '@/lib/home-content';

/** Saves the home page wording. A field left empty (or identical to the default) goes back to the default text. */
export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request))
    return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 60_000)
    return new NextResponse('Request too large', { status: 413 });
  const form = await request.formData();
  const statements = [];
  for (const lang of ['vi', 'en'] as const) {
    for (const key of HOME_KEYS) {
      const value = String(form.get(`${key}.${lang}`) ?? '').replace(/\r\n/g, '\n').trim().slice(0, 1500);
      const standard = (HOME_TEXT[lang] as Record<string, string>)[key];
      if (!value || value === standard) statements.push(env.DB.prepare('DELETE FROM home_texts WHERE key = ? AND lang = ?').bind(key, lang));
      else statements.push(env.DB.prepare('INSERT INTO home_texts (key, lang, value) VALUES (?, ?, ?) ON CONFLICT(key, lang) DO UPDATE SET value = excluded.value').bind(key, lang, value));
    }
  }
  await env.DB.batch(statements);
  return NextResponse.redirect(new URL('/admin/home?saved=1', request.url), 303);
}
