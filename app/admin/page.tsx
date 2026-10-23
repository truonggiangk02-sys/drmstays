import Link from "next/link";
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { AdminRouteLink } from "@/components/admin-route-link";
export const dynamic = "force-dynamic";
export default async function Admin() {
  if (!await isAdmin()) redirect("/admin/login");
  const counts = env.DB ? await env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS fresh FROM inquiries").first<{ total: number; fresh: number }>() : null;
  return <main className="admin"><header><Link href="/" className="brand"><span className="brand-mark">D</span><span>DORAEMON LAND<small>OWNER CMS</small></span></Link><nav><AdminRouteLink href="/admin/rooms">Rooms</AdminRouteLink><AdminRouteLink href="/admin/inquiries">Inquiries</AdminRouteLink></nav><form action="/api/admin/logout" method="post"><button type="submit" className="cms-logout">Sign out</button></form></header><div className="admin-body"><div className="admin-title"><div><span className="eyebrow">DORAEMON LAND CMS</span><h1>Welcome back.</h1><p>Manage your rooms, rates, photos, and guest requests.</p></div><div className="admin-stat"><strong>{counts?.fresh || 0}</strong><span>New inquiries</span></div></div><div className="cms-cards"><AdminRouteLink href="/admin/rooms"><span>01 / LISTINGS</span><h2>Rooms &amp; rates</h2><p>Edit descriptions, amenities, features, pricing, visibility, and photos.</p><b>Manage rooms</b></AdminRouteLink><AdminRouteLink href="/admin/inquiries"><span>02 / GUESTS</span><h2>Inquiries</h2><p>Review {counts?.total || 0} guest requests and open direct WhatsApp chats.</p><b>View inquiries</b></AdminRouteLink></div></div></main>;
}

