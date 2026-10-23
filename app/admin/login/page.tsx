import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
export const dynamic = "force-dynamic";
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return <main className="admin-gate cms-login"><Link href="/" className="brand"><span className="brand-mark">D</span><span>DORAEMON LAND<small>OWNER CMS</small></span></Link><span className="eyebrow">SECURE OWNER ACCESS</span><h1>Welcome, host.</h1><p>Enter the master password to manage rooms and guest inquiries.</p><form action="/api/admin/login" method="post"><label htmlFor="admin-password">Master password</label><input id="admin-password" type="password" name="password" autoComplete="current-password" required autoFocus/>{error && <p role="alert" className="inquiry-error">{error === "limited" ? "Too many attempts. Please try again in 15 minutes." : "Incorrect password. Please try again."}</p>}<button type="submit">Open dashboard →</button></form><Link className="back-link" href="/">← Return to Doraemon Land</Link></main>;
}
