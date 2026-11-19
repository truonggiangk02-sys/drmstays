/**
 * Where each page of the public site is edited in the admin. One list feeds the admin start page and the
 * "Sửa trang này" button that admins see on the public pages, so they cannot disagree.
 */
export type AdminLink = { label: string; href: string };
export type SiteArea = { id: string; title: string; publicPath: string; summary: string; links: AdminLink[] };

export const SITE_AREAS: SiteArea[] = [
  { id: 'home', title: 'Trang chủ', publicPath: '', summary: 'Tiêu đề, ảnh bìa, giới thiệu, điểm nổi bật.', links: [{ label: 'Chữ và ảnh trang chủ', href: '/admin/home' }] },
  { id: 'stays', title: 'Tòa nhà & phòng', publicPath: '/stays', summary: 'Mô tả, giá, ảnh của tòa, loại phòng, phòng.', links: [{ label: 'Tòa, loại phòng, phòng', href: '/admin/catalog' }, { label: 'Vị trí trên bản đồ', href: '/admin/locations' }] },
  { id: 'about', title: 'Về DRM Stays', publicPath: '/about', summary: 'Câu chuyện, tầm nhìn, số liệu.', links: [{ label: 'Trang Giới thiệu', href: '/admin/content#about' }, { label: 'Các con số', href: '/admin/content#metrics' }] },
  { id: 'services', title: 'Dịch vụ', publicPath: '/services', summary: 'Dịch vụ và chi phí cho người thuê.', links: [{ label: 'Trang Dịch vụ', href: '/admin/content#services' }] },
  { id: 'faq', title: 'Câu hỏi thường gặp', publicPath: '/faq', summary: 'Hỏi đáp khi thuê phòng.', links: [{ label: 'Câu hỏi thường gặp', href: '/admin/content#faq' }] },
  { id: 'partners', title: 'Dành cho chủ đầu tư', publicPath: '/partners', summary: 'Tư vấn, vận hành cho chủ tòa.', links: [{ label: 'Trang Chủ đầu tư', href: '/admin/content#partners' }, { label: 'Sửa các con số', href: '/admin/content#metrics' }] },
  { id: 'journal', title: 'Cẩm nang', publicPath: '/journal', summary: 'Bài viết (ẩn đến khi có bài đầu).', links: [{ label: 'Bài viết', href: '/admin/content#journal' }] },
  { id: 'reviews', title: 'Đánh giá của khách', publicPath: '/', summary: 'Đánh giá thật từ Airbnb, Google.', links: [{ label: 'Đánh giá', href: '/admin/content#reviews' }] },
  { id: 'contact', title: 'Liên hệ', publicPath: '/contact', summary: 'Điện thoại, Zalo, WhatsApp, mạng xã hội.', links: [{ label: 'Kênh liên hệ nhanh', href: '/admin/contact-channels' }] },
];

/** Pages with no editor in the admin: the wording lives in the code, so changes go through Claude. */
export const CODE_ONLY_PAGES = ['Chính sách bảo mật, hủy phòng, điều khoản (privacy, cancellation, terms)'];

const CONTENT_PAGES: Record<string, string> = { about: 'about', services: 'services', faq: 'faq', partners: 'partners', journal: 'journal' };

/** The admin page that edits what the visitor is looking at, from a public path such as /vi/about. */
export function adminTargetFor(pathname: string): AdminLink | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'vi' && parts[0] !== 'en') return null;
  const [, section, id] = parts;
  if (!section) return { label: 'Sửa trang chủ', href: '/admin/home' };
  if (section in CONTENT_PAGES) return { label: 'Sửa trang này', href: `/admin/content#${CONTENT_PAGES[section]}` };
  if (section === 'contact') return { label: 'Sửa kênh liên hệ', href: '/admin/contact-channels' };
  if (section === 'buildings' && id && /^[0-9a-f-]{36}$/i.test(id)) return { label: 'Sửa tòa này', href: `/admin/catalog?b=${id}` };
  if (section === 'stays' || section === 'room-types' || section === 'buildings' || section === 'types' || section === 'rooms') return { label: 'Sửa tòa & phòng', href: '/admin/catalog' };
  return null;
}
