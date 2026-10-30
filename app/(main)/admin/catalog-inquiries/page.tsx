import { env } from 'cloudflare:workers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { getFreshStaydeskCatalog } from '@/lib/staydesk-catalog';

export const dynamic = 'force-dynamic';
type Contact = {
  id: string;
  source_room_id: string;
  name: string;
  phone: string;
  email: string;
  check_in: string;
  check_out: string;
  message: string;
  status: string;
  telegram_status: string;
  created_at: string;
};

export default async function CatalogInquiries({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!env.DB)
    return (
      <AdminShell title="Catalog contacts">
        <p>Database unavailable.</p>
      </AdminShell>
    );
  const requestedPage = Number((await searchParams).page || 1);
  const page =
    Number.isSafeInteger(requestedPage) &&
    requestedPage > 0 &&
    Number.isSafeInteger((requestedPage - 1) * 50)
      ? requestedPage
      : 1;
  const [rows, source] = await Promise.all([
    env.DB.prepare(
      'SELECT id, source_room_id, name, phone, email, check_in, check_out, message, status, telegram_status, created_at FROM catalog_inquiries ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET ?',
    )
      .bind((page - 1) * 50)
      .all<Contact>(),
    getFreshStaydeskCatalog().catch(() => null),
  ]);
  const names = new Map(
    source?.buildings.flatMap((building) =>
      building.rooms.map((room) => [room.id, room.name] as const),
    ) || [],
  );
  const items = (rows.results || []).slice(0, 50);
  const hasNext = (rows.results || []).length > 50;
  return (
    <AdminShell title="Catalog contacts">
      <p className="admin-hint">
        Guest requests saved from the public catalog. Each request is also sent to Telegram; if the alert shows Failed, contact the guest from this list.
      </p>
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
                <td>{item.source_room_id ? names.get(item.source_room_id) || item.source_room_id : 'General inquiry'}</td>
                <td>
                  {item.check_in && item.check_out
                    ? `${item.check_in} → ${item.check_out}`
                    : 'Not specified'}
                </td>
                <td>{item.message || '—'}</td>
                <td>
                  <form action="/api/admin/catalog-inquiries" method="post">
                    <input type="hidden" name="id" value={item.id} />
                    <select name="status" defaultValue={item.status}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button>Save</button>
                  </form>
                  <small className={item.telegram_status === 'failed' ? 'alert-failed' : undefined}>
                    {item.telegram_status === 'failed' ? 'Telegram alert FAILED' : item.telegram_status === 'sent' ? 'Telegram alert sent' : item.telegram_status === 'pending' ? 'Telegram alert pending' : 'No Telegram alert'}
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="empty">No contacts on this page.</p>}
      </div>
      <nav aria-label="Contact pages">
        {page > 1 && <Link href={`/admin/catalog-inquiries?page=${page - 1}`}>← Previous</Link>}
        <span> Page {page} </span>
        {hasNext && <Link href={`/admin/catalog-inquiries?page=${page + 1}`}>Next →</Link>}
      </nav>
    </AdminShell>
  );
}
