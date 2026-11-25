import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { AUTHOR_KINDS, AUTHOR_LIMITS, authorPhotoUrl, getAuthors } from '@/lib/authors';
import { STATUSES, TOPICS, isStatus, isTopic, type Status } from '@/lib/blog-standard';
import { checkPost } from '@/lib/blog-check';
import { getJournalRows } from '@/lib/journal';
import { pendingMigrations } from '@/lib/migrations';
import { getContentImages, type ContentItem } from '@/lib/site-content';

export const dynamic = 'force-dynamic';

const messages: Record<string, string> = {
  'saved:author': 'Đã lưu tác giả.', 'saved:deleted': 'Đã xóa.',
  'error:name': 'Cần nhập tên tác giả.', 'error:url': 'Trang giới thiệu phải là địa chỉ https://…', 'error:photo': 'Không lưu được ảnh (chỉ JPG, PNG, WebP, tối đa 3 MB).',
  'error:migration': 'Chưa áp dụng migration 0021 (deploy với --migrate) nên chưa lưu được tác giả.',
};

async function appliedMigrations(): Promise<string[] | null> {
  try { return ((await env.DB!.prepare('SELECT name FROM d1_migrations').all<{ name: string }>()).results || []).map(row => row.name); } catch { return null; }
}

/** The journal: list of posts with their status and check results, and the list of authors. */
export default async function JournalAdmin({ searchParams }: { searchParams: Promise<{ status?: string; topic?: string; saved?: string; error?: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const query = await searchParams;
  const [rows, authors, applied] = await Promise.all([getJournalRows().catch(() => []), getAuthors(), appliedMigrations()]);
  const images = await getContentImages(rows.map(row => ({ id: row.id }) as ContentItem)).catch(() => ({} as Record<string, unknown[]>));
  const pending = applied ? pendingMigrations(applied).filter(name => name === '0020_journal_standard' || name === '0021_authors') : [];
  const others = rows.map(row => ({ id: row.id, slug: row.slug, h1: row.title_en, keyword: row.primary_keyword, status: row.status }));
  const status = isStatus(query.status) ? query.status : '';
  const topic = isTopic(query.topic) ? query.topic : '';
  const shown = rows.filter(row => (!status || row.status === status) && (!topic || row.topic === topic));
  const authorName = new Map(authors.map(author => [author.id, author.name]));
  const flash = messages[query.saved ? `saved:${query.saved}` : query.error ? `error:${query.error}` : ''];
  const link = (patch: Record<string, string>) => `/admin/journal?${new URLSearchParams(Object.entries({ status, topic, ...patch }).filter(([, value]) => value))}`;

  return <AdminShell title="Cẩm nang (blog)">
    {pending.length > 0 && <p className="translation-error" role="alert">Chưa áp dụng migration: {pending.join(', ')}. Deploy với <code>--migrate</code> (Mac) hoặc <code>-Migrate</code> (Windows) trước khi viết bài.</p>}
    {flash && <p className={query.error ? 'translation-error' : 'cx-flash'} role={query.error ? 'alert' : 'status'}>{flash}</p>}
    <div className="jl-top">
      <p className="admin-hint">Bài nào cũng phải đạt tiêu chuẩn SEO–GEO (24 quy tắc) trước khi đăng. Make viết nháp, người duyệt sửa rồi dán vào đây.</p>
      <Link className="jl-new" href="/admin/journal/edit">Viết bài mới</Link>
      <Link className="jl-new is-ghost" href="/admin/journal/edit?paste=1">Dán cả bài</Link>
    </div>
    <nav className="jl-filters" aria-label="Lọc bài">
      <Link href={link({ status: '' })} className={!status ? 'is-on' : ''}>Tất cả ({rows.length})</Link>
      {(Object.keys(STATUSES) as Status[]).map(key => <Link key={key} href={link({ status: key })} className={status === key ? 'is-on' : ''}>{STATUSES[key]} ({rows.filter(row => row.status === key).length})</Link>)}
      <span aria-hidden="true">·</span>
      {Object.entries(TOPICS).map(([key, label]) => <Link key={key} href={link({ topic: topic === key ? '' : key })} className={topic === key ? 'is-on' : ''}>{label}</Link>)}
    </nav>
    {shown.length ? <div className="jl-wrap"><table className="jl-table">
      <thead><tr><th>Tiêu đề (H1)</th><th>Trạng thái</th><th>Từ khóa chính</th><th>Mẫu</th><th>Tác giả</th><th>Ngày đăng</th><th>Lỗi chặn</th><th>Cảnh báo</th></tr></thead>
      <tbody>{shown.map(row => {
        const found = checkPost({ h1: row.title_en, seoTitle: row.seo_title_en, meta: row.excerpt_en, slug: row.slug, keyword: row.primary_keyword, variations: row.keyword_variations, intent: row.search_intent, template: row.post_template, level: row.post_level, topic: row.topic, authorId: row.author_id, body: row.body_en, coverAlt: row.cover_alt_en, hasCover: (images[row.id] || []).length > 0 },
          { selfId: row.id, others, knownPrices: [] }).filter(check => check.code !== 'R18'); // prices are compared in the editor, which has the live price list
        const blocks = found.filter(check => check.level === 'block').length, warns = found.filter(check => check.level === 'warn').length;
        return <tr key={row.id}>
          <td><Link href={`/admin/journal/edit?id=${row.id}`}>{row.title_en || row.title_vi || '(chưa có tiêu đề)'}</Link></td>
          <td><span className={`je-status is-${row.status}`}>{isStatus(row.status) ? STATUSES[row.status] : row.status}</span></td>
          <td>{row.primary_keyword || '—'}</td><td>{row.post_template || '—'}</td><td>{authorName.get(row.author_id) || '—'}</td><td>{row.published_at || '—'}</td>
          <td className={blocks ? 'is-bad' : 'is-good'}>{blocks || '✓'}</td><td className={warns ? 'is-warn' : ''}>{warns || '—'}</td>
        </tr>;
      })}</tbody>
    </table></div> : <p className="admin-hint">{rows.length ? 'Không có bài nào khớp bộ lọc.' : 'Chưa có bài nào. Bấm “Viết bài mới” hoặc “Dán cả bài”.'}</p>}

    <section id="authors" className="jl-authors">
      <h2>Tác giả</h2>
      <p className="admin-hint">Mỗi bài có một tác giả: một người, hoặc cả đội nhóm (ví dụ “DRM Stays Marketing Team”). Đội nhóm được khai với Google là tổ chức. Không ghi chung “Admin”.</p>
      {authors.map(author => <details key={author.id} className="jl-author">
        <summary>{author.name}{author.role && <small> · {author.role}</small>}</summary>
        <form action="/api/admin/authors" method="post" encType="multipart/form-data">
          <input type="hidden" name="action" value="save" /><input type="hidden" name="id" value={author.id} />
          <label>Loại<select name="kind" defaultValue={author.kind}>{Object.entries(AUTHOR_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Tên<input name="name" defaultValue={author.name} required maxLength={AUTHOR_LIMITS.name} /></label>
          <label>Chức danh<input name="role" defaultValue={author.role} maxLength={AUTHOR_LIMITS.role} /></label>
          <label>Tiểu sử ngắn (tối đa {AUTHOR_LIMITS.bio} ký tự)<textarea name="bio" defaultValue={author.bio} rows={3} maxLength={AUTHOR_LIMITS.bio} /></label>
          <label>Trang giới thiệu (https://…, không bắt buộc)<input name="url" defaultValue={author.url} maxLength={AUTHOR_LIMITS.url} /></label>
          <label>Ảnh (JPG, PNG, WebP, tối đa 3 MB){author.photo_id && <img className="jl-photo" src={authorPhotoUrl(author)} alt={author.name} width={72} height={72} />}<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
          <button>Lưu tác giả</button>
        </form>
        <form action="/api/admin/authors" method="post"><input type="hidden" name="action" value="delete" /><input type="hidden" name="id" value={author.id} /><button className="content-delete">Xóa tác giả</button></form>
      </details>)}
      <details className="jl-author" open={authors.length === 0}>
        <summary>Thêm tác giả</summary>
        <form action="/api/admin/authors" method="post" encType="multipart/form-data">
          <input type="hidden" name="action" value="save" />
          <label>Loại<select name="kind" defaultValue="team">{Object.entries(AUTHOR_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Tên<input name="name" required maxLength={AUTHOR_LIMITS.name} placeholder="DRM Stays Marketing Team" /></label>
          <label>Chức danh<input name="role" maxLength={AUTHOR_LIMITS.role} placeholder="Local hosts and marketing team" /></label>
          <label>Tiểu sử ngắn (tối đa {AUTHOR_LIMITS.bio} ký tự)<textarea name="bio" rows={3} maxLength={AUTHOR_LIMITS.bio} /></label>
          <label>Trang giới thiệu (https://…, không bắt buộc)<input name="url" maxLength={AUTHOR_LIMITS.url} /></label>
          <label>Ảnh (JPG, PNG, WebP, tối đa 3 MB)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>
          <button>Thêm tác giả</button>
        </form>
      </details>
    </section>
  </AdminShell>;
}
