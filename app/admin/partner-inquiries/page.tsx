import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';
type Inquiry = { id: string; name: string; phone: string; email: string; property: string; message: string; status: string; created_at: string };
export default async function PartnerInquiries() {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!env.DB) return <AdminShell title="Partner inquiries"><p>Database unavailable.</p></AdminShell>;
  const rows = await env.DB.prepare('SELECT id, name, phone, email, property, message, status, created_at FROM partner_inquiries ORDER BY created_at DESC, id DESC LIMIT 100').all<Inquiry>();
  return <AdminShell title="Partner inquiries"><p className="admin-hint">Requests from building owners and partners. Notifications are not configured yet.</p><div className="admin-table-wrap cms-inquiries"><table><thead><tr><th>Received</th><th>Contact</th><th>Building / area</th><th>Message</th><th>Status</th></tr></thead><tbody>{(rows.results || []).map(item => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td><strong>{item.name}</strong><small>{item.phone}</small><small>{item.email}</small></td><td>{item.property}</td><td>{item.message}</td><td><form action="/api/admin/partner-inquiries" method="post"><input type="hidden" name="id" value={item.id} /><select name="status" defaultValue={item.status}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select><button>Save</button></form></td></tr>)}</tbody></table>{!rows.results?.length && <p className="empty">No partner inquiries yet.</p>}</div></AdminShell>;
}
