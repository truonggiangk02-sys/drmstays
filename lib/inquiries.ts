import { env } from 'cloudflare:workers';

export const INQUIRY_STATUSES = ['new', 'contacted', 'closed'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export const STATUS_LABEL: Record<InquiryStatus, string> = { new: 'Mới', contacted: 'Đã liên hệ', closed: 'Đã chốt' };
export const PAGE_SIZE = 50;

export type InquiryFilter = { status?: string; q?: string; page?: number };
export type InquiryList<Row> = { rows: Row[]; hasNext: boolean; counts: Record<InquiryStatus | 'all', number>; hasNote: boolean };

const clean = (value: string | undefined) => (value || '').trim().slice(0, 80);
/** LIKE patterns treat % and _ as wildcards; a search for "50%" must find "50%", not everything. */
const likeEscape = (value: string) => value.replace(/[\\%_]/g, char => `\\${char}`);

/**
 * One list for guest requests and partner requests: newest first, optional status and text filter (name, phone,
 * email, message), counts per status. Works before migration 0018 is applied (the note column is then left out).
 */
export async function listInquiries<Row>(table: 'catalog_inquiries' | 'partner_inquiries', columns: string, searchColumns: string[], filter: InquiryFilter): Promise<InquiryList<Row>> {
  const db = env.DB!;
  const status = INQUIRY_STATUSES.find(item => item === filter.status);
  const q = clean(filter.q);
  const page = Number.isSafeInteger(filter.page) && (filter.page as number) > 0 && Number.isSafeInteger(((filter.page as number) - 1) * PAGE_SIZE) ? (filter.page as number) : 1;
  const where: string[] = [], args: unknown[] = [];
  if (status) { where.push('status = ?'); args.push(status); }
  if (q) { where.push(`(${searchColumns.map(column => `${column} LIKE ? ESCAPE '\\'`).join(' OR ')})`); for (const _ of searchColumns) args.push(`%${likeEscape(q)}%`); }
  const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const query = (withNote: boolean) => db.prepare(`SELECT ${columns}${withNote ? ', note' : ''} FROM ${table}${clause} ORDER BY created_at DESC, id DESC LIMIT ${PAGE_SIZE + 1} OFFSET ?`).bind(...args, (page - 1) * PAGE_SIZE).all<Row>();
  let hasNote = true;
  let result;
  try { result = await query(true); } catch { hasNote = false; result = await query(false); }
  const grouped = await db.prepare(`SELECT status, COUNT(*) AS n FROM ${table} GROUP BY status`).all<{ status: string; n: number }>();
  const counts = { all: 0, new: 0, contacted: 0, closed: 0 } as Record<InquiryStatus | 'all', number>;
  for (const row of grouped.results || []) { counts.all += row.n; if ((INQUIRY_STATUSES as readonly string[]).includes(row.status)) counts[row.status as InquiryStatus] = row.n; }
  const all = result.results || [];
  return { rows: all.slice(0, PAGE_SIZE), hasNext: all.length > PAGE_SIZE, counts, hasNote };
}

/** Saves status and, when the form sent one, the note. */
export async function saveInquiry(table: 'catalog_inquiries' | 'partner_inquiries', id: string, status: string, note: string | null): Promise<void> {
  const db = env.DB!;
  if (note === null) { await db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).bind(status, id).run(); return; }
  try { await db.prepare(`UPDATE ${table} SET status = ?, note = ? WHERE id = ?`).bind(status, note.replace(/\r\n/g, '\n').trim().slice(0, 1000), id).run(); }
  catch { await db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).bind(status, id).run(); } // migration 0018 not applied yet
}
