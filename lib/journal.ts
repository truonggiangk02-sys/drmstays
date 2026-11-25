import { env } from 'cloudflare:workers';
import { summarize } from './site';
import { bodyWords, plainText } from './journal-markdown';
import { isIntent, isLevel, isStatus, isTemplate, isTopic, type Intent, type Level, type Status, type Template, type Topic } from './blog-standard';

export { slugify, plainText, renderMarkdown, renderMarkdownFull, formatPostDate, readingMinutes } from './journal-markdown';

export type JournalLang = 'vi' | 'en';

/** A journal row as stored (site_content_items, section 'journal'). Columns from slug on come from migration 0019, from seo_title_en on from 0020. */
export type JournalRow = {
  id: string; title_vi: string; title_en: string; body_vi: string; body_en: string; published: number; deleted: number; position: number;
  slug: string; excerpt_vi: string; excerpt_en: string; published_at: string; updated_at: string;
  seo_title_en: string; primary_keyword: string; keyword_variations: string; search_intent: string; post_template: string; post_level: string; topic: string;
  author_id: string; status: string; checks_json: string; checked_by: string; checked_at: string; cover_alt_en: string;
};

/** One post as a page shows it, in one language. */
export type JournalPost = {
  id: string; slug: string; lang: JournalLang; title: string; excerpt: string; body: string;
  publishedAt: string; updatedAt: string; languages: JournalLang[];
  /** The title shown on Google (the page adds the site name); the H1 when none was written. */
  seoTitle: string; keyword: string; variations: string[]; topic: Topic | ''; template: Template | ''; level: Level | ''; intent: Intent | '';
  authorId: string; status: Status; words: number;
};

const V19 = 'SELECT id, title_vi, title_en, body_vi, body_en, published, deleted, position, slug, excerpt_vi, excerpt_en, published_at, updated_at FROM site_content_items WHERE section = ?';
const FULL = 'SELECT id, title_vi, title_en, body_vi, body_en, published, deleted, position, slug, excerpt_vi, excerpt_en, published_at, updated_at, seo_title_en, primary_keyword, keyword_variations, search_intent, post_template, post_level, topic, author_id, status, checks_json, checked_by, checked_at, cover_alt_en FROM site_content_items WHERE section = ?';
const BASIC = 'SELECT id, title_vi, title_en, body_vi, body_en, published, deleted, position FROM site_content_items WHERE section = ?';

/** Whether the post has a title and a body in this language. Journal posts may exist in English only. */
export const hasLanguage = (row: Pick<JournalRow, 'title_vi' | 'title_en' | 'body_vi' | 'body_en'>, lang: JournalLang) =>
  lang === 'en' ? !!row.title_en.trim() && !!row.body_en.trim() : !!row.title_vi.trim() && !!row.body_vi.trim();

export const rowLanguages = (row: JournalRow): JournalLang[] => (['en', 'vi'] as const).filter(lang => hasLanguage(row, lang));


/** The post in one language, or null when it has no text in that language. */
export function postFor(row: JournalRow, lang: JournalLang): JournalPost | null {
  if (!hasLanguage(row, lang)) return null;
  const vi = lang === 'vi';
  const body = vi ? row.body_vi : row.body_en;
  const excerpt = (vi ? row.excerpt_vi : row.excerpt_en).trim() || summarize(plainText(body));
  const title = (vi ? row.title_vi : row.title_en).trim();
  return {
    id: row.id, slug: row.slug || row.id, lang, title, excerpt, body,
    publishedAt: row.published_at, updatedAt: row.updated_at || row.published_at, languages: rowLanguages(row),
    // The Google title and the keywords are written for the English page; the Vietnamese page keeps its own title.
    seoTitle: (!vi && row.seo_title_en.trim()) || title, keyword: vi ? '' : row.primary_keyword.trim(),
    variations: vi ? [] : row.keyword_variations.split(';').map(item => item.trim()).filter(Boolean),
    topic: isTopic(row.topic) ? row.topic : '', template: isTemplate(row.post_template) ? row.post_template : '', level: isLevel(row.post_level) ? row.post_level : '',
    intent: isIntent(row.search_intent) ? row.search_intent : '', authorId: row.author_id, status: isStatus(row.status) ? row.status : row.published === 1 ? 'published' : 'draft', words: bodyWords(body),
  };
}

const withDefaults = (row: Partial<JournalRow>): JournalRow => ({
  id: String(row.id), title_vi: row.title_vi || '', title_en: row.title_en || '', body_vi: row.body_vi || '', body_en: row.body_en || '',
  published: Number(row.published || 0), deleted: Number(row.deleted || 0), position: Number(row.position || 0),
  slug: row.slug || '', excerpt_vi: row.excerpt_vi || '', excerpt_en: row.excerpt_en || '', published_at: row.published_at || '', updated_at: row.updated_at || '',
  seo_title_en: row.seo_title_en || '', primary_keyword: row.primary_keyword || '', keyword_variations: row.keyword_variations || '', search_intent: row.search_intent || '',
  post_template: row.post_template || '', post_level: row.post_level || '', topic: row.topic || '', author_id: row.author_id || '',
  status: row.status || (Number(row.published || 0) === 1 ? 'published' : 'draft'), checks_json: row.checks_json || '', checked_by: row.checked_by || '', checked_at: row.checked_at || '', cover_alt_en: row.cover_alt_en || '',
});

/** Every journal row (admin view: hidden ones included, deleted ones left out). Works before migration 0019 too. */
export async function getJournalRows(): Promise<JournalRow[]> {
  const db = env.DB;
  if (!db) return [];
  let rows: Partial<JournalRow>[];
  // Older databases lack the newer columns: fall back to what migrations 0019 / 0000 have.
  try { rows = (await db.prepare(FULL).bind('journal').all<JournalRow>()).results || []; }
  catch {
    try { rows = (await db.prepare(V19).bind('journal').all<JournalRow>()).results || []; }
    catch { rows = (await db.prepare(BASIC).bind('journal').all<JournalRow>()).results || []; }
  }
  return rows.map(withDefaults).filter(row => row.deleted !== 1)
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || '') || a.position - b.position || a.id.localeCompare(b.id));
}

/** One row of the admin list by id (any status), or undefined. */
export async function getJournalRow(id: string): Promise<JournalRow | undefined> {
  return (await getJournalRows()).find(row => row.id === id);
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

/** The current address of a post reached through an old address (one changed after publishing), or undefined. */
export async function findJournalRedirect(key: string): Promise<string | undefined> {
  if (!env.DB) return undefined;
  try {
    const hit = await env.DB.prepare('SELECT post_id FROM journal_redirects WHERE old_slug = ?').bind(key).first<{ post_id: string }>();
    return hit ? (await getPublishedJournal()).find(row => row.id === hit.post_id)?.slug || undefined : undefined;
  } catch { return undefined; } // migration 0021 not applied yet
}

/** Up to `limit` other posts of the same topic, newest first. */
export function relatedPosts<T extends { id: string; topic: string; publishedAt: string }>(posts: T[], current: { id: string; topic: string }, limit = 3): T[] {
  if (!current.topic) return [];
  return posts.filter(post => post.id !== current.id && post.topic === current.topic).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit);
}

