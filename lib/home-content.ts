import { env } from 'cloudflare:workers';
import { catalogImageUrl } from './image-url';

/** Default wording of the home page, in both languages. The admin can override any of the keys listed in HOME_SECTIONS. */
export const HOME_TEXT = {
  vi: {
    hero: 'Một nơi ở vừa vặn với nhịp sống của bạn.',
    heroLead: 'Khám phá những căn hộ dịch vụ tại Đà Nẵng. Xem từng tòa, từng phòng và liên hệ trực tiếp khi bạn tìm thấy nơi phù hợp.',
    explore: 'Khám phá tòa nhà & phòng',
    introLabel: 'Cách chúng tôi giới thiệu nơi ở',
    introTitle: 'Xem rõ không gian trước khi quyết định.',
    introBody: 'DRM Stays giúp bạn xem hình ảnh, trang bị và thông tin thuê của từng phòng trong cùng một nơi. Khi cần thêm chi tiết, đội ngũ sẽ kiểm tra và tư vấn trực tiếp.',
    detailOne: 'Xem từng phòng', detailOneBody: 'Ảnh, diện tích, vật dụng và tiện ích được trình bày theo từng loại phòng.',
    detailTwo: 'Tìm theo tòa', detailTwoBody: 'So sánh khu vực, vị trí tham khảo và các lựa chọn trong cùng một tòa nhà.',
    detailThree: 'Hỏi trước khi thuê', detailThreeBody: 'Gửi ngày dự kiến và nhu cầu của bạn để được xác nhận tình trạng phòng.',
    collection: 'Những tòa nhà đang giới thiệu', collectionLead: 'Từ không gian đến khu vực xung quanh, bắt đầu tìm nơi ở phù hợp với bạn.',
    view: 'Xem tòa nhà', from: 'Từ', month: 'tháng', rooms: 'loại phòng',
    gallery: 'Một cái nhìn gần hơn', galleryLead: 'Khám phá hình ảnh không gian và từng phòng trước khi liên hệ.',
    journalLabel: 'DRM STAYS / CẨM NANG', journalTitle: 'Cẩm nang lưu trú', journalLead: 'Những điều nên biết trước khi chọn phòng và sắp xếp buổi xem thực tế.', journalAll: 'Xem tất cả bài viết', journalRead: 'Đọc bài viết',
    contactTitle: 'Bắt đầu từ một cuộc trò chuyện.', contactBody: 'Cho chúng tôi biết bạn muốn ở khu vực nào, thời gian dự kiến và kiểu phòng phù hợp. Đội ngũ sẽ liên hệ để xác nhận thông tin thực tế.', contact: 'Gửi yêu cầu tư vấn',
  },
  en: {
    hero: 'A place that fits the way you live.',
    heroLead: 'Explore serviced apartments in Da Nang. See every building and room, then contact us directly when you find the right fit.',
    explore: 'Explore buildings & rooms',
    introLabel: 'How we present each stay',
    introTitle: 'See the space before you decide.',
    introBody: 'DRM Stays brings each room’s photos, equipment and rental details together. When you need more information, our team will check and help you directly.',
    detailOne: 'Explore each room', detailOneBody: 'Photos, size, furniture and amenities are shown for each room type.',
    detailTwo: 'Browse by building', detailTwoBody: 'Compare neighborhoods, approximate locations and options within each building.',
    detailThree: 'Ask before you rent', detailThreeBody: 'Share your preferred dates and needs so our team can confirm availability.',
    collection: 'Buildings to explore', collectionLead: 'From the interior to the neighborhood, start finding a stay that fits.',
    view: 'View building', from: 'From', month: 'month', rooms: 'room types',
    gallery: 'A closer look', galleryLead: 'Explore the spaces and individual rooms before getting in touch.',
    journalLabel: 'DRM STAYS / JOURNAL', journalTitle: 'The stay journal', journalLead: 'Useful details to consider before choosing a room and arranging a viewing.', journalAll: 'View all articles', journalRead: 'Read article',
    contactTitle: 'Start with a conversation.', contactBody: 'Tell us your preferred area, dates and room type. Our team will contact you to confirm the details.', contact: 'Send an inquiry',
  },
} as const;
export type HomeLang = 'vi' | 'en';
export type HomeKey = keyof typeof HOME_TEXT.vi;
export type HomePhoto = { id: string; url: string; alt: string; width?: number; height?: number };

/** Where the editable text is shown on the page, in the order of the page. */
export const HOME_SECTIONS: Array<{ id: string; title: string; hint: string; fields: Array<{ key: HomeKey; label: string; long?: boolean }>; slot?: HomeSlot }> = [
  { id: 'hero', title: 'Đầu trang (ảnh bìa)', hint: 'Phần lớn nhất khách thấy đầu tiên.', slot: 'home-hero', fields: [{ key: 'hero', label: 'Tiêu đề lớn' }, { key: 'heroLead', label: 'Dòng giới thiệu', long: true }, { key: 'explore', label: 'Chữ trên nút' }] },
  { id: 'intro', title: 'Giới thiệu', hint: 'Khối chữ bên trái, một ảnh bên phải.', slot: 'home-intro', fields: [{ key: 'introLabel', label: 'Nhãn nhỏ' }, { key: 'introTitle', label: 'Tiêu đề' }, { key: 'introBody', label: 'Nội dung', long: true }] },
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
