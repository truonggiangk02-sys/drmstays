import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { InquiryFilters } from '@/components/inquiry-filters';
import { isAdmin } from '@/lib/admin';
import { listInquiries } from '@/lib/inquiries';

export const dynamic = 'force-dynamic';
type Inquiry = { id: string; name: string; phone: string; email: string; property: string; message: string; status: string; telegram_status: string; created_at: string; note?: string };
export default async function PartnerInquiries({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!env.DB) return <AdminShell title="Partner inquiries"><p>Database unavailable.</p></AdminShell>;
  const query = await searchParams;
  const list = await listInquiries<Inquiry>('partner_inquiries', 'id, name, phone, email, property, message, status, telegram_status, created_at', ['name', 'phone', 'email', 'property', 'message'], { status: query.status, q: query.q });
  return <AdminShell title="Partner inquiries"><p className="admin-hint">Requests from building owners and partners. Each request is also sent to Telegram; if the alert shows Failed, contact the sender from this list.</p>{!list.hasNote && <p className="cx-flash" role="alert">Chưa áp dụng migration <strong>0018_inquiry_notes</strong>: chưa lưu được ghi chú. Deploy với -Migrate (Windows) hoặc --migrate (Mac).</p>}<InquiryFilters base="/admin/partner-inquiries" status={query.status} q={query.q} counts={list.counts} /><div className="admin-table-wrap cms-inquiries"><table><thead><tr><th>Received</th><th>Contact</th><th>Building / area</th><th>Message</th><th>Status</th></tr></thead><tbody>{list.rows.map(item => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td><strong>{item.name}</strong><small>{item.phone}</small><small>{item.email}</small></td><td>{item.property}</td><td>{item.message}</td><td><form action="/api/admin/partner-inquiries" method="post" data-save-in-place=""><input type="hidden" name="id" value={item.id} /><select name="status" defaultValue={item.status}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select>{list.hasNote && <textarea name="note" rows={2} maxLength={1000} defaultValue={item.note || ''} placeholder="Ghi chú nội bộ (chỉ admin thấy)" />}<button>Save</button></form><small className={item.telegram_status === 'failed' ? 'alert-failed' : undefined}>{item.telegram_status === 'failed' ? 'Telegram alert FAILED' : item.telegram_status === 'sent' ? 'Telegram alert sent' : item.telegram_status === 'pending' ? 'Telegram alert pending' : 'No Telegram alert'}</small>{item.telegram_status !== 'sent' && <form action="/api/admin/inquiry-alerts" method="post"><input type="hidden" name="kind" value="partner" /><input type="hidden" name="id" value={item.id} /><button>Resend Telegram alert</button></form>}</td></tr>)}</tbody></table>{!list.rows.length && <p className="empty">No partner inquiries yet.</p>}</div></AdminShell>;
}
