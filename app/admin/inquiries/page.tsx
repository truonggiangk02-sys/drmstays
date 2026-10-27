import { env } from "cloudflare:workers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getRoomNames } from "@/lib/data";
import { AdminShell } from "@/components/admin-shell";
export const dynamic = "force-dynamic";
type Inquiry = { id: number; apartment_id: number; name: string; email: string; phone: string; check_in: string; check_out: string; status: string; created_at: string };
const pageSize = 50;
export default async function Inquiries({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!await isAdmin()) redirect("/admin/login");
  if (!env.DB) return <AdminShell title="Inquiries"><p>Database unavailable.</p></AdminShell>;
  const requestedPage = Number((await searchParams).page || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && Number.isSafeInteger((requestedPage - 1) * pageSize) ? requestedPage : 1;
  const [roomNames, result] = await Promise.all([getRoomNames(), env.DB.prepare("SELECT id, apartment_id, name, email, phone, check_in, check_out, status, created_at FROM inquiries ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?").bind(pageSize + 1, (page - 1) * pageSize).all<Inquiry>()]);
  const items = (result.results || []).slice(0, pageSize);
  const hasNext = (result.results || []).length > pageSize;
  return <AdminShell title="Guest inquiries"><p className="admin-hint">Saved inquiries, newest first. Open WhatsApp to follow up with a guest.</p><div className="admin-table-wrap cms-inquiries"><table><thead><tr><th>Date received</th><th>Guest name</th><th>WhatsApp phone</th><th>Selected room</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th>Contact</th><th>Status</th></tr></thead><tbody>{items.map(item => { const nights = Math.max(0, Math.round((Date.parse(item.check_out) - Date.parse(item.check_in)) / 86400000)); const digits = item.phone.replace(/\D/g, ""); const phone = item.phone.startsWith("+") ? digits : digits.startsWith("0") ? `84${digits.slice(1)}` : digits; return <tr key={item.id}><td>{new Date(item.created_at).toLocaleString("en-GB", { timeZone: "Asia/Ho_Chi_Minh" })}</td><td><strong>{item.name}</strong></td><td>{item.phone || "—"}</td><td>{roomNames.get(item.apartment_id) || `Room #${item.apartment_id}`}</td><td>{item.check_in}</td><td>{item.check_out}</td><td>{nights}</td><td>{phone ? <a className="cms-whatsapp" href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a> : <a href={`mailto:${item.email}`}>Email guest ↗</a>}</td><td><form action="/api/admin/inquiries" method="post"><input type="hidden" name="id" value={item.id}/><select name="status" defaultValue={item.status}><option value="new">New</option><option value="contacted">Contacted</option><option value="confirmed">Confirmed</option><option value="closed">Closed</option></select><button>Save</button></form></td></tr>; })}</tbody></table>{!items.length && <p className="empty">No inquiries on this page.</p>}</div><nav aria-label="Inquiry pages">{page > 1 && <Link href={`/admin/inquiries?page=${page - 1}`}>← Previous</Link>}<span> Page {page} </span>{hasNext && <Link href={`/admin/inquiries?page=${page + 1}`}>Next →</Link>}</nav></AdminShell>;
}


