import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { contentSections, sampleContent, type ContentSection } from '@/lib/site-content';
import { translateContent } from '@/lib/translate-content';
import { slugify } from '@/lib/journal';

export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  // Journal posts are long (a few thousand words of Markdown, both languages); other sections stay small.
  if (Number(request.headers.get('content-length') || 0) > 300_000) return new NextResponse('Request too large', { status: 413 });
  const form = await request.formData();
  const section = String(form.get('section') || '') as ContentSection;
  if (!contentSections.includes(section)) return new NextResponse('Invalid section', { status: 400 });
  const action = String(form.get('action') || '');
  if (section !== 'journal' && Number(request.headers.get('content-length') || 0) > 30_000) return new NextResponse('Request too large', { status: 413 });
  if (section === 'journal' && (action === 'save' || action === 'create')) return saveJournalPost(request, form, action);
  const id = action === 'create' ? crypto.randomUUID() : String(form.get('id') || '');
  if (!/^(?:[0-9a-f-]{36}|(?:sample|review)-[a-z0-9-]+)$/i.test(id)) return new NextResponse('Invalid item', { status: 400 });
  if (action === 'delete') {
    const sample = sampleContent.find(item => item.id === id && item.section === section);
    if (sample) {
      await env.DB.prepare('INSERT INTO site_content_items (id, section, title_vi, title_en, body_vi, body_en, published, deleted, position) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET deleted=1')
        .bind(id, section, sample.title_vi, sample.title_en, sample.body_vi, sample.body_en, sample.published, sample.position).run();
    } else await env.DB.prepare('UPDATE site_content_items SET deleted = 1 WHERE id = ? AND section = ?').bind(id, section).run();
  } else if (action === 'restore') {
    const sample = sampleContent.find(item => item.id === id && item.section === section);
    const saved = sample ? await env.DB.prepare('SELECT title_vi FROM site_content_items WHERE id = ? AND section = ?').bind(id, section).first<{ title_vi: string }>() : null;
    if (sample && saved && !saved.title_vi) {
      // Older deleted sample rows only stored the ID. Restore their default copy.
      await env.DB.prepare('UPDATE site_content_items SET title_vi = ?, title_en = ?, body_vi = ?, body_en = ?, published = ?, position = ?, deleted = 0 WHERE id = ? AND section = ?')
        .bind(sample.title_vi, sample.title_en, sample.body_vi, sample.body_en, sample.published, sample.position, id, section).run();
    } else await env.DB.prepare('UPDATE site_content_items SET deleted = 0 WHERE id = ? AND section = ?').bind(id, section).run();
  } else if (action === 'save' || action === 'create') {
    const value = (key: string, max: number) => String(form.get(key) || '').trim().slice(0, max);
    const titleVi = value('titleVi', 180);
    if (!titleVi) return new NextResponse('Vietnamese title is required', { status: 400 });
    const bodyVi = value('bodyVi', 8000);
    let titleEn = value('titleEn', 180), bodyEn = value('bodyEn', 8000);
    if (form.get('autoTranslate') === 'on') {
      try {
        const translated = await translateContent(titleVi, bodyVi);
        titleEn = translated.title;
        bodyEn = translated.body;
      } catch {
        return NextResponse.redirect(new URL('/admin/content?error=translation', request.url), 303);
      }
    } else if (!titleEn) return new NextResponse('English title is required when auto translation is off', { status: 400 });
    const position = Number(form.get('position') || 0);
    if (!Number.isSafeInteger(position) || position < 0 || position > 1000) return new NextResponse('Invalid order', { status: 400 });
    await env.DB.prepare('INSERT INTO site_content_items (id, section, title_vi, title_en, body_vi, body_en, published, deleted, position) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?) ON CONFLICT(id) DO UPDATE SET section=excluded.section, title_vi=excluded.title_vi, title_en=excluded.title_en, body_vi=excluded.body_vi, body_en=excluded.body_en, published=excluded.published, deleted=0, position=excluded.position')
      .bind(id, section, titleVi, titleEn, bodyVi, bodyEn, form.get('published') === 'on' || action === 'create' ? 1 : 0, position).run();
  } else return new NextResponse('Invalid action', { status: 400 });
  return NextResponse.redirect(new URL('/admin/content', request.url), 303);
}

/**
 * Saves a journal (blog) post. English is the main language: an English title and body are required, Vietnamese is
 * optional. The address (slug) comes from the English title unless one is typed, and is made unique.
 */
async function saveJournalPost(request: NextRequest, form: FormData, action: string) {
  const db = env.DB!;
  const value = (key: string, max: number) => String(form.get(key) || '').trim().slice(0, max);
  const id = action === 'create' ? crypto.randomUUID() : String(form.get('id') || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Invalid item', { status: 400 });
  const titleEn = value('titleEn', 180), bodyEn = value('bodyEn', 60_000);
  if (!titleEn || !bodyEn) return new NextResponse('English title and English content are required', { status: 400 });
  const titleVi = value('titleVi', 180), bodyVi = value('bodyVi', 60_000);
  const excerptEn = value('excerptEn', 300), excerptVi = value('excerptVi', 300);
  const date = value('publishedAt', 10);
  const today = new Date().toISOString().slice(0, 10);
  const publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  let slug = slugify(value('slug', 120) || titleEn) || id;
  for (let n = 2; await db.prepare('SELECT 1 FROM site_content_items WHERE slug = ? AND id != ?').bind(slug, id).first(); n++) slug = `${slugify(value('slug', 120) || titleEn)}-${n}`;
  const position = Number(form.get('position') || 0);
  const published = form.get('published') === 'on' || action === 'create' ? 1 : 0;
  await db.prepare(`INSERT INTO site_content_items (id, section, title_vi, title_en, body_vi, body_en, published, deleted, position, slug, excerpt_vi, excerpt_en, published_at, updated_at)
    VALUES (?, 'journal', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title_vi=excluded.title_vi, title_en=excluded.title_en, body_vi=excluded.body_vi, body_en=excluded.body_en,
      published=excluded.published, position=excluded.position, slug=excluded.slug, excerpt_vi=excluded.excerpt_vi, excerpt_en=excluded.excerpt_en,
      published_at=excluded.published_at, updated_at=excluded.updated_at`)
    .bind(id, titleVi, titleEn, bodyVi, bodyEn, published, Number.isSafeInteger(position) ? position : 0, slug, excerptVi, excerptEn, publishedAt, today).run();
  return NextResponse.redirect(new URL('/admin/content#journal', request.url), 303);
}
