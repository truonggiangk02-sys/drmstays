import { env } from 'cloudflare:workers';
import { catalogImageUrl } from './image-url';

/** Default wording of the home page, in both languages. The admin can override any of the keys listed in HOME_SECTIONS. */
export const HOME_TEXT = {
  vi: {
    hero: 'Tư vấn, thiết kế và vận hành bất động sản cho thuê tại Đà Nẵng.',
    heroLead: 'DRM Stays đồng hành cùng chủ đầu tư từ thiết kế, thi công đến vận hành để tạo dòng tiền ổn định. Chúng tôi cũng cho thuê phòng tại các tòa nhà do mình vận hành.',
    explore: 'Xem tòa nhà & phòng cho thuê', investors: 'Dịch vụ cho chủ đầu tư',
    introLabel: 'Hệ sinh thái DRM Stays',
    introTitle: 'Từ ý tưởng đến dòng tiền ổn định.',
    introBody: 'Trong 3 năm, DRM Stays đã tư vấn hơn 10 dự án. Chúng tôi đi cùng chủ đầu tư từ chọn mua, thiết kế, thi công đến vận hành và báo cáo tài chính hằng tháng.',
    detailOne: 'Tư vấn đầu tư và thiết kế', detailOneBody: 'Chọn mua bất động sản phù hợp, tư vấn thiết kế và thi công để xây dựng cho thuê.',
    detailTwo: 'Vận hành cho thuê', detailTwoBody: 'Đảm nhận vận hành cho thuê và quản lý đội ngũ vận hành tại tòa nhà.',
    detailThree: 'Báo cáo minh bạch', detailThreeBody: 'Báo cáo tài chính hằng tháng rõ ràng để chủ đầu tư nắm được hiệu quả.',
    collection: 'Các tòa nhà đang vận hành', collectionLead: 'Phòng có sẵn nội thất, cho thuê ngắn ngày và dài ngày tại khu vực gần An Thượng, Mỹ An.',
    view: 'Xem tòa nhà', from: 'Từ', month: 'tháng', rooms: 'loại phòng',
    gallery: 'Một cái nhìn gần hơn', galleryLead: 'Khám phá hình ảnh không gian và từng phòng trước khi liên hệ.',
    journalLabel: 'DRM STAYS / CẨM NANG', journalTitle: 'Cẩm nang lưu trú', journalLead: 'Những điều nên biết trước khi chọn phòng và sắp xếp buổi xem thực tế.', journalAll: 'Xem tất cả bài viết', journalRead: 'Đọc bài viết',
    contactTitle: 'Bắt đầu từ một cuộc trò chuyện.', contactBody: 'Dù bạn là chủ đầu tư hay khách thuê phòng, hãy cho chúng tôi biết nhu cầu. Đội ngũ sẽ liên hệ trong giờ làm việc, 8:00 đến 17:00.', contact: 'Gửi yêu cầu tư vấn',
  },
  en: {
    hero: 'Consulting, design and operation of rental property in Da Nang.',
    heroLead: 'DRM Stays works with investors from design and construction through operation to build steady cash flow. We also rent rooms in the buildings we operate.',
    explore: 'View buildings & rooms to rent', investors: 'Services for investors',
    introLabel: 'The DRM Stays ecosystem',
    introTitle: 'From an idea to steady cash flow.',
    introBody: 'In 3 years DRM Stays has advised more than 10 projects. We work with investors from purchase, design and construction to operation and monthly financial reports.',
    detailOne: 'Investment and design advice', detailOneBody: 'Choosing the right property, plus design and construction advice for a rental building.',
    detailTwo: 'Rental operation', detailTwoBody: 'We take over rental operation and manage the operating team at the building.',
    detailThree: 'Transparent reporting', detailThreeBody: 'A clear monthly financial report so investors can follow performance.',
    collection: 'Buildings we operate', collectionLead: 'Furnished rooms for short and long stays near An Thượng, Mỹ An.',
    view: 'View building', from: 'From', month: 'month', rooms: 'room types',
    gallery: 'A closer look', galleryLead: 'Explore the spaces and individual rooms before getting in touch.',
    journalLabel: 'DRM STAYS / JOURNAL', journalTitle: 'The stay journal', journalLead: 'Useful details to consider before choosing a room and arranging a viewing.', journalAll: 'View all articles', journalRead: 'Read article',
    contactTitle: 'Start with a conversation.', contactBody: 'Whether you are an investor or looking for a room, tell us what you need. Our team will get back to you during office hours, 8:00–17:00.', contact: 'Send an inquiry',
  },
} as const;
export type HomeLang = 'vi' | 'en';
export type HomeKey = keyof typeof HOME_TEXT.vi;
export type HomePhoto = { id: string; url: string; alt: string; width?: number; height?: number };

/** Where the editable text is shown on the page, in the order of the page. */
export const HOME_SECTIONS: Array<{ id: string; title: string; hint: string; fields: Array<{ key: HomeKey; label: string; long?: boolean }>; slot?: HomeSlot }> = [
  { id: 'hero', title: 'Đầu trang (ảnh bìa)', hint: 'Phần lớn nhất khách thấy đầu tiên.', slot: 'home-hero', fields: [{ key: 'hero', label: 'Tiêu đề lớn' }, { key: 'heroLead', label: 'Dòng giới thiệu', long: true }, { key: 'explore', label: 'Chữ trên nút' }] },
  { id: 'intro', title: 'Giới thiệu', hint: 'Khối chữ bên trái, một ảnh bên phải.', slot: 'home-intro', fields: [{ key: 'investors', label: 'Liên kết: dịch vụ cho chủ đầu tư' }, { key: 'introLabel', label: 'Nhãn nhỏ' }, { key: 'introTitle', label: 'Tiêu đề' }, { key: 'introBody', label: 'Nội dung', long: true }] },
  { id: 'details', title: 'Ba điểm nổi bật', hint: 'Ba cột dưới phần giới thiệu.', fields: [{ key: 'detailOne', label: 'Điểm 1: tiêu đề' }, { key: 'detailOneBody', label: 'Điểm 1: nội dung', long: true }, { key: 'detailTwo', label: 'Điểm 2: tiêu đề' }, { key: 'detailTwoBody', label: 'Điểm 2: nội dung', long: true }, { key: 'detailThree', label: 'Điểm 3: tiêu đề' }, { key: 'detailThreeBody', label: 'Điểm 3: nội dung', long: true }] },
  { id: 'collection', title: 'Danh sách tòa nhà', hint: 'Các thẻ tòa nhà tự lấy từ mục Properties; ở đây chỉ sửa tiêu đề.', fields: [{ key: 'collection', label: 'Tiêu đề' }, { key: 'collectionLead', label: 'Dòng mô tả', long: true }] },
  { id: 'gallery', title: 'Thư viện ảnh', hint: 'Hàng ảnh "Một cái nhìn gần hơn".', slot: 'home-gallery', fields: [{ key: 'gallery', label: 'Tiêu đề' }, { key: 'galleryLead', label: 'Dòng mô tả', long: true }] },
  { id: 'journal', title: 'Cẩm nang', hint: 'Các bài viết sửa ở mục Website content.', fields: [{ key: 'journalTitle', label: 'Tiêu đề' }, { key: 'journalLead', label: 'Dòng mô tả', long: true }] },
  { id: 'contact', title: 'Cuối trang (liên hệ)', hint: 'Khối kêu gọi liên hệ, kèm một ảnh.', slot: 'home-contact', fields: [{ key: 'contactTitle', label: 'Tiêu đề' }, { key: 'contactBody', label: 'Nội dung', long: true }, { key: 'contact', label: 'Chữ trên nút' }] },
];

/** Photo areas of the home page. Without photos of its own, an area falls back to photos of the buildings. */
export const HOME_SLOTS = {
  'home-hero': { label: 'Ảnh bìa', max: 1 },
  'home-intro': { label: 'Ảnh khối giới thiệu', max: 1 },
  'home-gallery': { label: 'Thư viện ảnh', max: 8 },
  'home-contact': { label: 'Ảnh khối liên hệ', max: 1 },
} as const;
export type HomeSlot = keyof typeof HOME_SLOTS;
export const isHomeSlot = (value: string): value is HomeSlot => value in HOME_SLOTS;
export const HOME_KEYS = new Set<string>(HOME_SECTIONS.flatMap(section => section.fields.map(field => field.key)));

export type HomeContent = { text: Record<HomeKey, string>; overrides: Partial<Record<HomeKey, string>>; images: Record<HomeSlot, HomePhoto[]> };

/** Defaults with the owner's edits laid over them. Any database problem just yields the defaults, so the home page never breaks. */
export async function getHomeContent(lang: HomeLang): Promise<HomeContent> {
  const overrides: Partial<Record<HomeKey, string>> = {};
  const images: HomeContent['images'] = { 'home-hero': [], 'home-intro': [], 'home-gallery': [], 'home-contact': [] };
  if (env.DB) {
    try {
      const texts = await env.DB.prepare('SELECT key, value FROM home_texts WHERE lang = ?').bind(lang).all<{ key: string; value: string }>();
      for (const row of texts.results || []) if (HOME_KEYS.has(row.key) && row.value.trim()) overrides[row.key as HomeKey] = row.value;
    } catch { /* table missing: defaults */ }
    try {
      const rows = await env.DB.prepare("SELECT id, owner_id, alt, width, height FROM catalog_images WHERE owner_type = 'home' ORDER BY position, id").all<{ id: string; owner_id: string; alt: string; width: number | null; height: number | null }>();
      for (const row of rows.results || []) if (isHomeSlot(row.owner_id)) images[row.owner_id].push({ id: row.id, url: catalogImageUrl(row.id), alt: row.alt, ...(row.width && row.height ? { width: row.width, height: row.height } : {}) });
    } catch { /* no photos of its own */ }
  }
  return { text: { ...HOME_TEXT[lang], ...overrides }, overrides, images };
}
