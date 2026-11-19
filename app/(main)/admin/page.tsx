import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { SITE_AREAS } from '@/lib/admin-map';

export const dynamic = 'force-dynamic';

const others = [
  { title: 'Yêu cầu của khách', summary: 'Người để lại thông tin trên web.', links: [{ label: 'Khách đặt phòng', href: '/admin/catalog-inquiries' }, { label: 'Chủ tòa liên hệ', href: '/admin/partner-inquiries' }] },
  { title: 'Ảnh hàng loạt', summary: 'Tải và sắp xếp nhiều ảnh cùng lúc.', links: [{ label: 'Ảnh & mặt bằng', href: '/admin/media' }] },
  { title: 'Kiểm tra và sao lưu', summary: 'Web có ổn không, sao lưu database.', links: [{ label: 'Kiểm tra web', href: '/admin/health' }] },
];

export default async function AdminOverview() {
  if (!(await isAdmin())) redirect('/admin/login');
  return <AdminShell title="Bạn muốn sửa gì?">
    <p className="admin-hint">Chọn trang khách nhìn thấy. Khi đang đăng nhập, mỗi trang trên web có nút tròn <strong>✎</strong> ở góc trái, bấm vào là tới đúng chỗ sửa. Chính sách (bảo mật, hủy phòng, điều khoản) chưa sửa được ở đây, cần nhờ Claude.</p>
    <ul className="adm-grid">
      {SITE_AREAS.map(area => <li key={area.id}>
        <h2>{area.title}</h2><p>{area.summary}</p>
        <div className="adm-links">{area.links.map(link => <Link key={link.href} href={link.href}>{link.label} →</Link>)}<a className="adm-view" href={`/vi${area.publicPath}`} target="_blank" rel="noreferrer">Xem trang này ↗</a></div>
      </li>)}
    </ul>
    <h2 className="adm-sub">Việc khác</h2>
    <ul className="adm-grid">
      {others.map(item => <li key={item.title}><h2>{item.title}</h2><p>{item.summary}</p><div className="adm-links">{item.links.map(link => <Link key={link.href} href={link.href}>{link.label} →</Link>)}</div></li>)}
    </ul>
  </AdminShell>;
}
