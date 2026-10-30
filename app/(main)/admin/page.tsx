import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  if (!(await isAdmin())) redirect('/admin/login');
  return <AdminShell title="Website overview">
    <p className="admin-hint">DRM Stays company website. Doraemon Land is one of the listed properties. This preview uses sample catalog data; live Staydesk availability is not connected.</p>
    <div className="cms-cards">
      <Link href="/admin/catalog"><span>01 / CATALOG</span><h2>Buildings & rooms</h2><p>Choose published items and manage bilingual details, monthly rent, photos and floor plans.</p><b>Manage catalog →</b></Link>
      <Link href="/admin/content"><span>02 / CONTENT</span><h2>Company & articles</h2><p>Edit or delete company copy, services, partner content, journal articles and FAQ in Vietnamese and English.</p><b>Manage content →</b></Link>
      <Link href="/admin/catalog-inquiries"><span>02 / GUESTS</span><h2>Guest inquiries</h2><p>Review requests sent by guests and update follow-up status.</p><b>View requests →</b></Link>
      <Link href="/admin/partner-inquiries"><span>03 / PARTNERS</span><h2>Owner inquiries</h2><p>Review inquiries from building owners and partners.</p><b>View partners →</b></Link>
      <Link href="/vi"><span>04 / WEBSITE</span><h2>Vietnamese site</h2><p>Review the public site structure in Vietnamese.</p><b>Open site →</b></Link>
      <Link href="/en"><span>05 / WEBSITE</span><h2>English site</h2><p>Review the same structure in English.</p><b>Open site →</b></Link>
    </div>
    <p className="admin-hint">Company copy is provisional. Replace it with official information in Website content when ready.</p>
  </AdminShell>;
}

