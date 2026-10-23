import Link from "next/link";
import { AdminRouteLink } from "./admin-route-link";
export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="admin"><header><Link href="/admin" className="brand"><span className="brand-mark">D</span><span>DORAEMON LAND<small>OWNER CMS</small></span></Link><nav><AdminRouteLink href="/admin">Overview</AdminRouteLink><AdminRouteLink href="/admin/rooms">Rooms</AdminRouteLink><AdminRouteLink href="/admin/inquiries">Inquiries</AdminRouteLink></nav><form action="/api/admin/logout" method="post"><button type="submit" className="cms-logout">Sign out</button></form></header><div className="admin-body"><div className="admin-title"><div><span className="eyebrow">DORAEMON LAND CMS</span><h1>{title}</h1></div><Link href="/" className="cms-site-link">View site ↗</Link></div>{children}</div></main>;
}

