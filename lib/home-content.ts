import { env } from 'cloudflare:workers';
import { catalogImageUrl } from './image-url';

/** Default wording of the home page, in both languages. The admin can override any of the keys listed in HOME_SECTIONS. */
export const HOME_TEXT = {
  vi: {
    hero: 'Xách vali đến. Mọi thứ còn lại, DRM Stays lo.',
    heroLead: 'Căn hộ đầy đủ nội thất tại Đà Nẵng, thuê từ ngắn ngày đến dài ngày. Kèm theo là dịch vụ tour, xe và spa liên kết chất lượng, để bạn không mất công đi tìm.',
    explore: 'Xem tòa nhà & phòng',
    introLabel: 'Đặt lịch xem phòng',
    introTitle: 'Chọn được phòng ưng ý, hãy hẹn lịch đến xem.',
    introBody: 'Ảnh, trang bị, giá và điều kiện thuê của từng phòng đều có sẵn tại đây. Để lại thông tin, đội ngũ sẽ xác nhận phòng trống và sắp xếp buổi xem phòng cho bạn. Hỗ trợ bằng tiếng Việt, Anh, Nhật, Hàn, Trung và Nga.',
    detailOne: 'Dọn vào ở ngay', detailOneBody: 'Nội thất, bếp, điều hòa, wifi đã sẵn sàng. Thuê theo tháng hoặc theo năm, linh hoạt theo kế hoạch của bạn.',
    detailTwo: 'Giá rõ ràng', detailTwoBody: 'Giá thuê, tiền cọc và phí dịch vụ nói rõ ngay từ đầu, không có phí ẩn.',
    detailThree: 'Chủ nhà hỗ trợ trực tiếp', detailThreeBody: 'Bạn nhắn, chúng tôi liên hệ lại trong vòng 30 phút. Sự cố được đội ngũ quản lý trực tiếp xử lý nhanh.',
    collection: 'Các tòa nhà đang vận hành', collectionLead: 'Chọn tòa, xem từng phòng và gửi yêu cầu tư vấn.',
    view: 'Xem tòa nhà', from: 'Từ', month: 'tháng', rooms: 'loại phòng',
    gallery: 'Một cái nhìn gần hơn', galleryLead: 'Khám phá hình ảnh không gian và từng phòng trước khi liên hệ.',
    journalLabel: 'DRM STAYS / CẨM NANG', journalTitle: 'Cẩm nang lưu trú', journalLead: 'Những điều nên biết trước khi chọn phòng và sắp xếp buổi xem thực tế.', journalAll: 'Xem tất cả bài viết', journalRead: 'Đọc bài viết',
    investorsLabel: 'DÀNH CHO CHỦ ĐẦU TƯ', investorsTitle: 'Bạn đang đầu tư bất động sản cho thuê?', investorsBody: 'DRM Stays đồng hành từ chọn mua, thiết kế, thi công đến vận hành và báo cáo tài chính hằng tháng, để tài sản tạo dòng tiền ổn định.', investors: 'Xem dịch vụ cho chủ đầu tư',
    contactTitle: 'Bắt đầu từ một cuộc trò chuyện.', contactBody: 'Cho chúng tôi biết bạn muốn ở khu vực nào, thời gian dự kiến và kiểu phòng phù hợp. Đội ngũ sẽ liên hệ trong giờ làm việc, 8:00 đến 17:00.', contact: 'Gửi yêu cầu tư vấn',
  },
  en: {
    hero: 'Just bring your suitcase. DRM Stays handles the rest.',
    heroLead: 'Fully furnished apartments in Da Nang, for short or long stays. Add trusted tour, transport and spa partners, so you never have to go looking.',
    explore: 'Explore buildings & rooms',
    introLabel: 'Book a viewing',
    introTitle: 'Found a room you like? Book a time to see it.',
    introBody: 'The photos, equipment, price and rental terms of every room are here. Leave your details and our team will confirm availability and arrange a viewing for you. Support in Vietnamese, English, Japanese, Korean, Chinese and Russian.',
    detailOne: 'Move in right away', detailOneBody: 'Furniture, kitchen, air conditioning and wifi are ready. Rent by the month or the year, flexible to your plans.',
    detailTwo: 'Clear pricing', detailTwoBody: 'Rent, deposit and service fees are stated upfront. No hidden charges.',
    detailThree: 'Direct support from your host', detailThreeBody: 'Send a message and we get back to you within 30 minutes. Issues are handled quickly by the team that manages the buildings.',
    collection: 'Buildings we operate', collectionLead: 'Pick a building, see each room and send an inquiry.',
    view: 'View building', from: 'From', month: 'month', rooms: 'room types',
    gallery: 'A closer look', galleryLead: 'Explore the spaces and individual rooms before getting in touch.',
    journalLabel: 'DRM STAYS / JOURNAL', journalTitle: 'The stay journal', journalLead: 'Useful details to consider before choosing a room and arranging a viewing.', journalAll: 'View all articles', journalRead: 'Read article',
    investorsLabel: 'FOR INVESTORS', investorsTitle: 'Investing in rental property?', investorsBody: 'DRM Stays works with you from purchase, design and construction to operation and monthly financial reports, so your asset earns steady cash flow.', investors: 'See services for investors',
    contactTitle: 'Start with a conversation.', contactBody: 'Tell us your preferred area, dates and room type. Our team will get back to you during office hours, 8:00–17:00.', contact: 'Send an inquiry',
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
  { id: 'investors', title: 'Dành cho chủ đầu tư', hint: 'Khối nhỏ dẫn khách là chủ đầu tư sang trang riêng.', fields: [{ key: 'investorsLabel', label: 'Nhãn nhỏ' }, { key: 'investorsTitle', label: 'Tiêu đề' }, { key: 'investorsBody', label: 'Nội dung', long: true }, { key: 'investors', label: 'Chữ trên nút' }] },
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
