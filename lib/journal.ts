import { env } from 'cloudflare:workers';
import { summarize } from './site';

export type JournalLang = 'vi' | 'en';

/** A journal row as stored (site_content_items, section 'journal'). The last five columns come from migration 0019. */
export type JournalRow = {
  id: string; title_vi: string; title_en: string; body_vi: string; body_en: string; published: number; deleted: number; position: number;
  slug: string; excerpt_vi: string; excerpt_en: string; published_at: string; updated_at: string;
};

/** One post as a page shows it, in one language. */
export type JournalPost = {
  id: string; slug: string; lang: JournalLang; title: string; excerpt: string; body: string;
  publishedAt: string; updatedAt: string; languages: JournalLang[];
};

const FULL = 'SELECT id, title_vi, title_en, body_vi, body_en, published, deleted, position, slug, excerpt_vi, excerpt_en, published_at, updated_at FROM site_content_items WHERE section = ?';
const BASIC = 'SELECT id, title_vi, title_en, body_vi, body_en, published, deleted, position FROM site_content_items WHERE section = ?';

/** Readable address part from a title: "Monthly rent in Da Nang: 2027 prices" -> "monthly-rent-in-da-nang-2027-prices". */
export function slugify(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
}

/** Whether the post has a title and a body in this language. Journal posts may exist in English only. */
export const hasLanguage = (row: Pick<JournalRow, 'title_vi' | 'title_en' | 'body_vi' | 'body_en'>, lang: JournalLang) =>
  lang === 'en' ? !!row.title_en.trim() && !!row.body_en.trim() : !!row.title_vi.trim() && !!row.body_vi.trim();

export const rowLanguages = (row: JournalRow): JournalLang[] => (['en', 'vi'] as const).filter(lang => hasLanguage(row, lang));

/** Plain text of a markdown body, for summaries and reading time. */
export function plainText(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '').replace(/^\s*\|?[-:\s|]+\|?\s*$/gm, ' ').replace(/[*_`]/g, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
}

export const readingMinutes = (markdown: string) => Math.max(1, Math.round(plainText(markdown).split(' ').filter(Boolean).length / 220));

/** The post in one language, or null when it has no text in that language. */
export function postFor(row: JournalRow, lang: JournalLang): JournalPost | null {
  if (!hasLanguage(row, lang)) return null;
  const vi = lang === 'vi';
  const body = vi ? row.body_vi : row.body_en;
  const excerpt = (vi ? row.excerpt_vi : row.excerpt_en).trim() || summarize(plainText(body));
  return {
    id: row.id, slug: row.slug || row.id, lang, title: (vi ? row.title_vi : row.title_en).trim(), excerpt, body,
    publishedAt: row.published_at, updatedAt: row.updated_at || row.published_at, languages: rowLanguages(row),
  };
}

const withDefaults = (row: Partial<JournalRow>): JournalRow => ({
  id: String(row.id), title_vi: row.title_vi || '', title_en: row.title_en || '', body_vi: row.body_vi || '', body_en: row.body_en || '',
  published: Number(row.published || 0), deleted: Number(row.deleted || 0), position: Number(row.position || 0),
  slug: row.slug || '', excerpt_vi: row.excerpt_vi || '', excerpt_en: row.excerpt_en || '', published_at: row.published_at || '', updated_at: row.updated_at || '',
});

/** Every journal row (admin view: hidden ones included, deleted ones left out). Works before migration 0019 too. */
export async function getJournalRows(): Promise<JournalRow[]> {
  const db = env.DB;
  if (!db) return [];
  let rows: Partial<JournalRow>[];
  try { rows = (await db.prepare(FULL).bind('journal').all<JournalRow>()).results || []; }
  catch { rows = (await db.prepare(BASIC).bind('journal').all<JournalRow>()).results || []; } // migration 0019 not applied yet
  return rows.map(withDefaults).filter(row => row.deleted !== 1)
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '') || a.position - b.position || a.id.localeCompare(b.id));
}

/** Published rows, newest first. */
export async function getPublishedJournal(): Promise<JournalRow[]> {
  return (await getJournalRows()).filter(row => row.published === 1 && rowLanguages(row).length > 0);
}

/** Published posts written in this language, newest first. */
export async function getJournalPosts(lang: JournalLang): Promise<JournalPost[]> {
  return (await getPublishedJournal()).map(row => postFor(row, lang)).filter((post): post is JournalPost => !!post);
}

/** A published row by its slug or (older links) its id. */
export async function findJournalRow(key: string): Promise<JournalRow | undefined> {
  return (await getPublishedJournal()).find(row => (row.slug && row.slug === key) || row.id === key);
}

/** "2027-01-15" -> "15 January 2027" / "15 tháng 1, 2027"; "" when not a date. */
export function formatPostDate(date: string, lang: JournalLang): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  if (!match) return '';
  const value = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(value);
}

/* ---------- Markdown ---------- */

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Links may only go to web pages, this site, an anchor, email or phone: never javascript: or data:. */
function safeHref(url: string): string | null {
  const href = url.trim();
  if (/^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(href)) return href;
  return null;
}

/** Bold, italic, inline code and links inside one line. The text is escaped first, so no HTML from the post gets through. */
function inline(text: string): string {
  const codes: string[] = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, code: string) => { codes.push(code); return `\u0000${codes.length - 1}\u0000`; });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, url: string) => {
    const href = safeHref(url.replace(/&amp;/g, '&'));
    if (!href) return label;
    const external = /^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?drmstays\.vn/i.test(href);
    return `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${codes[Number(i)]}</code>`);
}

const headingId = (text: string, used: Set<string>) => {
  const base = slugify(plainText(text)) || 'section';
  let id = base, n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
};

/**
 * A safe subset of Markdown for journal posts: ## and ### headings (a single # is shown as ##, the page has its own H1),
 * paragraphs, - and 1. lists, > quotes, --- rules, | tables |, **bold**, *italic*, `code` and [links](https://...).
 * Everything else is shown as text; no HTML in the post is ever rendered.
 */
export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  const used = new Set<string>();
  let i = 0;
  const isBlockStart = (line: string) => /^\s*(#{1,6}\s|>|[-*+]\s|\d+\.\s|\|)/.test(line) || /^\s*(-{3,}|\*{3,})\s*$/.test(line);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length <= 2 ? 2 : 3;
      html.push(`<h${level} id="${headingId(heading[2], used)}">${inline(heading[2].trim())}</h${level}>`);
      i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { html.push('<hr>'); i++; continue; }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      html.push(`<blockquote><p>${quote.map(inline).join('<br>')}</p></blockquote>`);
      continue;
    }
    if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      const ordered = /^\s*\d+\.\s/.test(line);
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(pattern, ''))}</li>`);
      html.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
      const isDivider = (row: string) => /^\s*\|?[\s:-]+(\|[\s:-]+)*\|?\s*$/.test(row);
      const hasHeader = rows.length > 1 && isDivider(rows[1]);
      const head = hasHeader ? `<thead><tr>${cells(rows[0]).map(cell => `<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead>` : '';
      const bodyRows = (hasHeader ? rows.slice(2) : rows).filter(row => !isDivider(row));
      html.push(`<div class="journal-table"><table>${head}<tbody>${bodyRows.map(row => `<tr>${cells(row).map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !(para.length && isBlockStart(lines[i]))) para.push(lines[i++].trim());
    html.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return html.join('\n');
}
