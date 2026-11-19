import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { CODE_ONLY_PAGES, SITE_AREAS } from '@/lib/admin-map';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  if (!(await isAdmin())) redirect('/admin/login');
  return <AdminShell title="Bạn muốn sửa gì?">
    <p className="admin-hint">Tìm theo <strong>trang trên website</strong>: mỗi dòng dưới đây là một trang khách nhìn thấy, bên cạnh là nơi sửa nó. Khi đang đăng nhập admin, mỗi trang trên web còn có nút <strong>“✎ Sửa trang này”</strong> ở dưới màn hình, bấm vào là tới đúng chỗ sửa.</p>
    <ul className="adm-map">
      {SITE_AREAS.map(area => <li key={area.id}>
        <div><h2>{area.title}</h2><p>{area.summary}</p><a href={`/vi${area.publicPath}`} target="_blank" rel="noreferrer">Xem trang này trên web ↗</a></div>
        <div className="adm-map-links">{area.links.map(link => <Link key={link.href} href={link.href}>{link.label} →</Link>)}</div>
      </li>)}
    </ul>
    <h2 className="adm-sub">Việc khác</h2>
    <ul className="adm-map">
      <li><div><h2>Yêu cầu của khách và chủ tòa</h2><p>Người để lại thông tin trên web. Có trạng thái, ghi chú và ô tìm.</p></div><div className="adm-map-links"><Link href="/admin/catalog-inquiries">Yêu cầu của khách →</Link><Link href="/admin/partner-inquiries">Yêu cầu của chủ tòa →</Link></div></li>
      <li><div><h2>Ảnh hàng loạt</h2><p>Tải và sắp xếp ảnh cho nhiều mục cùng lúc.</p></div><div className="adm-map-links"><Link href="/admin/media">Ảnh & mặt bằng →</Link></div></li>
      <li><div><h2>Kiểm tra web và sao lưu</h2><p>Xem web có đang ổn không, bấm sao lưu database.</p></div><div className="adm-map-links"><Link href="/admin/health">Kiểm tra web →</Link></div></li>
      {CODE_ONLY_PAGES.map(name => <li key={name}><div><h2>Chưa sửa được trong admin</h2><p>{name}: chữ nằm trong mã nguồn, cần nhờ Claude sửa.</p></div></li>)}
    </ul>
  </AdminShell>;
}
