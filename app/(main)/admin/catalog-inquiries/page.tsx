import { env } from 'cloudflare:workers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { InquiryFilters } from '@/components/inquiry-filters';
import { listInquiries } from '@/lib/inquiries';
import { getFreshStaydeskCatalog } from '@/lib/staydesk-catalog';

export const dynamic = 'force-dynamic';
type Contact = {
  id: string;
  source_room_id: string;
  source_type_id: string;
  name: string;
  phone: string;
  email: string;
  check_in: string;
  check_out: string;
  message: string;
  status: string;
  telegram_status: string;
  created_at: string;
  note?: string;
};

export default async function CatalogInquiries({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!env.DB)
    return (
      <AdminShell title="Catalog contacts">
        <p>Database unavailable.</p>
      </AdminShell>
    );
  const query = await searchParams;
  const page = Number(query.page || 1);
  const [list, source, typeRows] = await Promise.all([
    listInquiries<Contact>('catalog_inquiries', 'id, source_room_id, source_type_id, name, phone, email, check_in, check_out, message, status, telegram_status, created_at', ['name', 'phone', 'email', 'message'], { status: query.status, q: query.q, page }),
    getFreshStaydeskCatalog().catch(() => null),
    env.DB.prepare('SELECT id, name_vi, name_en FROM catalog_room_types').all<{ id: string; name_vi: string; name_en: string }>(),
  ]);
  const typeNames = new Map((typeRows.results || []).map((row) => [row.id, row.name_vi || row.name_en] as const));
  const names = new Map(
    source?.buildings.flatMap((building) =>
      building.rooms.map((room) => [room.id, room.name] as const),
    ) || [],
  );
  const items = list.rows;
  const hasNext = list.hasNext;
  const keep = new URLSearchParams(); if (query.status) keep.set('status', query.status); if (query.q) keep.set('q', query.q);
  const pageHref = (n: number) => { const params = new URLSearchParams(keep); params.set('page', String(n)); return `/admin/catalog-inquiries?${params}`; };
  return (
    <AdminShell title="Catalog contacts">
      <p className="admin-hint">
        Guest requests saved from the public catalog. Each request is also sent to Telegram; if the alert shows Failed, contact the guest from this list.
      </p>
      {!list.hasNote && <p className="cx-flash" role="alert">Chưa áp dụng migration <strong>0018_inquiry_notes</strong>: chưa lưu được ghi chú. Deploy với -Migrate (Windows) hoặc --migrate (Mac).</p>}
      <InquiryFilters base="/admin/catalog-inquiries" status={query.status} q={query.q} counts={list.counts} />
      <div className="admin-table-wrap cms-inquiries">
        <table>
          <thead>
            <tr>
              <th>Received</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Preferred dates</th>
              <th>Message</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {new Date(item.created_at).toLocaleString('en-GB', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                  })}
                </td>
                <td>
                  <strong>{item.name}</strong>
                  <small>{item.phone}</small>
                  <small>{item.email}</small>
                </td>
                <td>{item.source_type_id ? `Loại: ${typeNames.get(item.source_type_id) || item.source_type_id}` : item.source_room_id ? names.get(item.source_room_id) || item.source_room_id : 'General inquiry'}</td>
                <td>
                  {item.check_in && item.check_out
                    ? `${item.check_in} → ${item.check_out}`
                    : 'Not specified'}
                </td>
                <td>{item.message || '—'}</td>
                <td>
                  <form action="/api/admin/catalog-inquiries" method="post" data-save-in-place="">
                    <input type="hidden" name="id" value={item.id} />
                    <select name="status" defaultValue={item.status}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                    {list.hasNote && <textarea name="note" rows={2} maxLength={1000} defaultValue={item.note || ''} placeholder="Ghi chú nội bộ (chỉ admin thấy)" />}
                    <button>Save</button>
                  </form>
                  <small className={item.telegram_status === 'failed' ? 'alert-failed' : undefined}>
                    {item.telegram_status === 'failed' ? 'Telegram alert FAILED' : item.telegram_status === 'sent' ? 'Telegram alert sent' : item.telegram_status === 'pending' ? 'Telegram alert pending' : 'No Telegram alert'}
                  </small>
                  {item.telegram_status !== 'sent' && <form action="/api/admin/inquiry-alerts" method="post"><input type="hidden" name="kind" value="catalog" /><input type="hidden" name="id" value={item.id} /><button>Resend Telegram alert</button></form>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="empty">{query.q || query.status ? 'Không có yêu cầu nào khớp bộ lọc.' : 'No contacts on this page.'}</p>}
      </div>
      <nav aria-label="Contact pages">
        {page > 1 && <Link href={pageHref(page - 1)}>← Previous</Link>}
        <span> Page {page} </span>
        {hasNext && <Link href={pageHref(page + 1)}>Next →</Link>}
      </nav>
    </AdminShell>
  );
}
