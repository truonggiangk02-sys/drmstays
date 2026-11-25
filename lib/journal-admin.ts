import { env } from 'cloudflare:workers';
import { BLOG, REVIEW_ITEMS, isIntent, isLevel, isTemplate, isTopic, type Status } from './blog-standard';
import { blockers, checkPost, type BlogDraft, type Check } from './blog-check';
import { validDate } from './dates';
import { getJournalRows } from './journal';
import { slugify } from './journal-markdown';

/*
 * What the journal editor's buttons do on the server. The checks (rules R01-R24) run again here on every save: the
 * browser shows them while typing, but only this code decides whether a post may be marked ready or go live.
 */

export const JOURNAL_ACTIONS = ['save', 'ready', 'publish', 'update', 'unpublish', 'archive', 'unarchive', 'delete'] as const;
export type JournalAction = (typeof JOURNAL_ACTIONS)[number];

export type JournalPayload = {
  id: string; action: JournalAction;
  h1: string; seoTitle: string; meta: string; slug: string; keyword: string; variations: string;
  intent: string; template: string; level: string; topic: string; authorId: string; date: string;
  body: string; coverAlt: string; titleVi: string; metaVi: string; bodyVi: string;
  /** The six hand-ticked boxes (BLOG REVIEW_ITEMS), in order. */
  reviews: boolean[];
  /** The reviewer accepted changing the address of a post that is already live (the old address then redirects). */
  confirmSlugChange: boolean;
};

export type ActionResult =
  | { ok: true; status: Status | 'deleted'; slug: string; updatedAt: string; checks: Check[]; notice?: string }
  | { ok: false; code: number; error: string; checks?: Check[] };

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim().slice(0, max) : '');

/** Reads the JSON the editor sends; null when it is not an object with a valid id and action. */
export function parsePayload(raw: unknown): JournalPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;
  const action = String(input.action || '') as JournalAction;
  const id = String(input.id || '');
  if (!JOURNAL_ACTIONS.includes(action) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const s = BLOG.store;
  return {
    id, action, h1: text(input.h1, s.h1), seoTitle: text(input.seoTitle, s.seoTitle), meta: text(input.meta, s.meta), slug: text(input.slug, s.slug),
    keyword: text(input.keyword, s.keyword).toLowerCase(), variations: text(input.variations, s.variations), intent: text(input.intent, 20), template: text(input.template, 2),
    level: text(input.level, 2), topic: text(input.topic, 20), authorId: text(input.authorId, 40), date: text(input.date, 10), body: text(input.body, s.body), coverAlt: text(input.coverAlt, s.coverAlt),
    titleVi: text(input.titleVi, s.h1), metaVi: text(input.metaVi, s.meta), bodyVi: text(input.bodyVi, s.body),
    reviews: Array.isArray(input.reviews) ? input.reviews.map(item => item === true) : [], confirmSlugChange: input.confirmSlugChange === true,
  };
}

type Stored = { id: string; status: string; published: number; slug: string; published_at: string; checked_at: string; position: number };

const fail = (code: number, error: string, checks?: Check[]): ActionResult => ({ ok: false, code, error, checks });
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Applies one button of the editor. `save` and `ready` write the whole form; the others change the status. */
export async function runJournalAction(payload: JournalPayload, now = new Date()): Promise<ActionResult> {
  const db = env.DB;
  if (!db) return fail(503, 'Database unavailable');
  let stored: Stored | null;
  try {
    stored = await db.prepare("SELECT id, status, published, slug, published_at, checked_at, position FROM site_content_items WHERE id = ? AND section = 'journal' AND deleted = 0").bind(payload.id).first<Stored>();
  } catch {
    return fail(409, 'Chưa áp dụng migration 0020 (deploy với --migrate) nên chưa lưu được bài.');
  }
  const today = isoDate(now);
  const { action, id } = payload;

  // Buttons that only change the status.
  if (action === 'unpublish' || action === 'archive' || action === 'unarchive' || action === 'delete') {
    if (!stored) return fail(404, 'Không tìm thấy bài.');
    if (action === 'delete') {
      if (stored.status === 'published') return fail(400, 'Hãy gỡ bài xuống trước khi xóa.');
      await db.prepare("UPDATE site_content_items SET deleted = 1, published = 0 WHERE id = ? AND section = 'journal'").bind(id).run();
      return { ok: true, status: 'deleted', slug: stored.slug, updatedAt: today, checks: [] };
    }
    if (action === 'unpublish' && stored.status !== 'published') return fail(400, 'Bài này chưa được đăng.');
    if (action === 'unarchive' && stored.status !== 'archived') return fail(400, 'Bài này chưa được lưu trữ.');
    const next: Status = action === 'archive' ? 'archived' : 'draft';
    await db.prepare("UPDATE site_content_items SET status = ?, published = 0 WHERE id = ? AND section = 'journal'").bind(next, id).run();
    return { ok: true, status: next, slug: stored.slug, updatedAt: today, checks: [] };
  }

  // Buttons that write the form.
  if (action === 'save' && stored?.status === 'published') return fail(400, 'Bài đang đăng: bấm "Cập nhật bài đã đăng", hoặc "Gỡ xuống" để quay về nháp.');
  if (stored?.status === 'archived') return fail(400, 'Bài đã lưu trữ: bấm "Khôi phục" trước khi sửa.');
  if (action === 'publish' && stored?.status !== 'ready') return fail(400, 'Hãy bấm "Đánh dấu sẵn sàng" trước khi đăng.');
  if (action === 'update' && stored?.status !== 'published') return fail(400, 'Bài này chưa được đăng.');

  const authorOk = payload.authorId ? !!(await db.prepare('SELECT 1 FROM authors WHERE id = ?').bind(payload.authorId).first().catch(() => null)) : false;
  const authorId = authorOk ? payload.authorId : '';
  const cover = await db.prepare("SELECT COUNT(*) AS n FROM catalog_images WHERE owner_type = 'content' AND owner_id = ? AND category = 'photo'").bind(id).first<{ n: number }>();
  const rows = await getJournalRows();
  const draft: BlogDraft = {
    h1: payload.h1, seoTitle: payload.seoTitle, meta: payload.meta, slug: payload.slug || slugify(payload.h1), keyword: payload.keyword, variations: payload.variations,
    intent: payload.intent, template: payload.template, level: payload.level, topic: payload.topic, authorId, body: payload.body, coverAlt: payload.coverAlt, hasCover: (cover?.n || 0) > 0,
  };
  const checks = checkPost(draft, { selfId: id, others: rows.map(row => ({ id: row.id, slug: row.slug, h1: row.title_en, keyword: row.primary_keyword, status: row.status })), knownPrices: [] });

  // The editor shows warnings; only blocks stop a post from becoming ready, live or updated.
  if (action !== 'save' && blockers(checks).length) return fail(422, `Còn ${blockers(checks).length} lỗi chặn, chưa thể ${action === 'ready' ? 'đánh dấu sẵn sàng' : action === 'publish' ? 'đăng' : 'cập nhật'}.`, checks);
  if (action === 'publish' && (payload.reviews.length !== REVIEW_ITEMS.length || payload.reviews.some(ticked => !ticked))) return fail(422, `Người duyệt phải tích đủ ${REVIEW_ITEMS.length} ô trước khi đăng.`, checks);

  // Address: unique; frozen once the post has been live (changing it needs a confirmation and leaves a redirect).
  let slug = slugify(draft.slug) || slugify(payload.h1) || id;
  if (action === 'save') {
    // A draft is kept even with a taken address (the editor flags it): it gets a number until the reviewer chooses another.
    const base = slug;
    for (let n = 2; await db.prepare('SELECT 1 FROM site_content_items WHERE slug = ? AND id != ?').bind(slug, id).first(); n++) slug = `${base}-${n}`.slice(0, BLOG.store.slug);
  }
  const wasLive = !!stored && !!stored.slug && (stored.status === 'published' || !!stored.checked_at);
  const changedSlug = wasLive && slug !== stored!.slug;
  if (changedSlug && !payload.confirmSlugChange) return fail(409, `Bài đã từng đăng: đổi địa chỉ từ "${stored!.slug}" sang "${slug}" sẽ làm link cũ chuyển hướng (301). Xác nhận để tiếp tục.`, checks);

  const publishedAt = validDate(payload.date) ? payload.date : stored?.published_at || today;
  const status: Status = action === 'publish' || action === 'update' ? 'published' : action === 'ready' ? 'ready' : 'draft';
  const updatedAt = action === 'publish' ? publishedAt : action === 'update' ? (today > publishedAt ? today : publishedAt) : today;
  let position = stored?.position;
  if (position === undefined) position = ((await db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS n FROM site_content_items WHERE section = 'journal'").first<{ n: number }>())?.n) || 1;

  // Column names below are fixed here, never taken from the request; every value is bound.
  const values: Record<string, string | number> = {
    title_en: payload.h1, title_vi: payload.titleVi, body_en: payload.body, body_vi: payload.bodyVi, excerpt_en: payload.meta, excerpt_vi: payload.metaVi,
    published: status === 'published' ? 1 : 0, deleted: 0, position, slug, published_at: publishedAt, updated_at: updatedAt,
    seo_title_en: payload.seoTitle, primary_keyword: payload.keyword, keyword_variations: payload.variations,
    search_intent: isIntent(payload.intent) ? payload.intent : '', post_template: isTemplate(payload.template) ? payload.template : '', post_level: isLevel(payload.level) ? payload.level : '',
    topic: isTopic(payload.topic) ? payload.topic : '', author_id: authorId, status, cover_alt_en: payload.coverAlt,
  };
  if (action === 'publish') Object.assign(values, { checks_json: JSON.stringify(payload.reviews), checked_by: 'admin', checked_at: now.toISOString() });
  const names = Object.keys(values);
  try {
    await db.prepare(`INSERT INTO site_content_items (id, section, ${names.join(', ')}) VALUES (?, 'journal', ${names.map(() => '?').join(', ')}) ON CONFLICT(id) DO UPDATE SET ${names.map(name => `${name} = excluded.${name}`).join(', ')}`)
      .bind(id, ...names.map(name => values[name])).run();
  } catch {
    return fail(409, 'Không lưu được bài (chưa áp dụng migration 0020, hoặc địa chỉ bài trùng). Deploy với --migrate rồi thử lại.');
  }

  let notice: string | undefined;
  try {
    if (changedSlug) await db.prepare('INSERT OR REPLACE INTO journal_redirects (old_slug, post_id) VALUES (?, ?)').bind(stored!.slug, id).run();
    await db.prepare('DELETE FROM journal_redirects WHERE old_slug = ?').bind(slug).run();
  } catch {
    if (changedSlug) notice = 'Đã lưu, nhưng chưa chuyển hướng được địa chỉ cũ (chưa áp dụng migration 0021).';
  }
  return { ok: true, status, slug, updatedAt, checks, notice };
}
