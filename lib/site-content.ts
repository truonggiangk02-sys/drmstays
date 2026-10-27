import { env } from 'cloudflare:workers';

export const contentSections = ['about', 'services', 'partners', 'journal', 'faq'] as const;
export type ContentSection = typeof contentSections[number];
export type ContentItem = {
  id: string; section: ContentSection; title_vi: string; title_en: string;
  body_vi: string; body_en: string; published: number; deleted: number; position: number;
};
export type ContentImage = { id: string; url: string; alt: string };

export async function getContentImages(items: ContentItem[]): Promise<Record<string, ContentImage[]>> {
  if (!env.DB || !items.length) return {};
  const ids = new Set(items.map(item => item.id));
  const result = await env.DB.prepare("SELECT id, owner_id, alt FROM catalog_images WHERE owner_type = 'content' AND category = 'photo' ORDER BY position, id").all<{ id: string; owner_id: string; alt: string }>();
  const images: Record<string, ContentImage[]> = {};
  for (const row of result.results || []) {
    if (!ids.has(row.owner_id)) continue;
    (images[row.owner_id] ||= []).push({ id: row.id, url: `/api/catalog-images/${row.id}`, alt: row.alt });
  }
  return images;
}

const sample = (id: string, section: ContentSection, position: number, title_vi: string, title_en: string, body_vi: string, body_en: string): ContentItem => ({ id, section, position, title_vi, title_en, body_vi, body_en, published: 1, deleted: 0 });

export const sampleContent: ContentItem[] = [
  sample('sample-about', 'about', 1, 'DRM Stays', 'DRM Stays', 'DRM Stays kết nối khách hàng với những không gian lưu trú được giới thiệu rõ ràng về phòng, giá và điều kiện thuê. Đội ngũ tiếp nhận yêu cầu, tư vấn và sắp xếp lịch xem phù hợp. Đây là nội dung giới thiệu tạm để bạn thay bằng hồ sơ công ty chính thức.', 'DRM Stays helps guests explore stays with clear room information, pricing and rental terms. Our team receives inquiries, advises guests and arranges viewings. This is temporary copy for you to replace with the official company profile.'),
  sample('sample-service-1', 'services', 1, 'Tìm nơi ở phù hợp', 'Find the right stay', 'Xem danh sách tòa nhà và từng phòng, so sánh diện tích, tiện ích, nội thất và giá thuê tháng trước khi gửi yêu cầu.', 'Browse buildings and individual rooms, comparing size, amenities, furniture and monthly rent before sending an inquiry.'),
  sample('sample-service-2', 'services', 2, 'Tư vấn và sắp xếp lịch xem', 'Advice and viewings', 'Bạn có thể để lại nhu cầu, ngày dự kiến và thông tin liên hệ. Nhân viên sẽ xác nhận thông tin thực tế và sắp xếp buổi xem phòng.', 'Share your needs, preferred dates and contact details. A team member will confirm current information and arrange a viewing.'),
  sample('sample-service-3', 'services', 3, 'Thông tin lưu trú minh bạch', 'Clear stay information', 'Mỗi phòng được trình bày với ảnh, diện tích, trang bị, giá và các điều kiện liên quan để khách chủ động tìm hiểu.', 'Each room is presented with photos, size, equipment, pricing and relevant terms so guests can make an informed inquiry.'),
  sample('sample-partner-1', 'partners', 1, 'Giới thiệu tòa nhà của bạn', 'Introduce your building', 'Chủ tòa có thể gửi thông tin cơ bản về tòa nhà, khu vực và nhu cầu hợp tác. DRM Stays sẽ liên hệ để tìm hiểu thêm.', 'Building owners can share basic property details, location and partnership goals. DRM Stays will follow up to learn more.'),
  sample('sample-partner-2', 'partners', 2, 'Trao đổi phương án hợp tác', 'Discuss a partnership', 'Mỗi tòa nhà có đặc điểm riêng. Các điều kiện hợp tác cụ thể sẽ được hai bên trao đổi trực tiếp sau khi nhận thông tin.', 'Every building is different. Specific partnership terms can be discussed directly after an initial inquiry.'),
  sample('sample-journal-1', 'journal', 1, 'Cần xem gì khi chọn phòng thuê tháng?', 'What to check before renting monthly', 'Khi chọn phòng, hãy xem diện tích sử dụng, ánh sáng, bố trí nội thất, phí dịch vụ, tiền cọc và thời hạn thuê. Ảnh và sơ đồ mặt bằng giúp bạn hình dung không gian, nhưng buổi xem thực tế vẫn là bước quan trọng trước khi quyết định.', 'Before renting monthly, check usable area, daylight, furniture layout, service fees, deposit and minimum term. Photos and floor plans help you understand the space, while an in-person viewing remains important before making a decision.'),
  sample('sample-journal-2', 'journal', 2, 'Câu hỏi nên đặt trước buổi xem phòng', 'Questions to ask before a viewing', 'Hỏi rõ những khoản đã bao gồm trong giá, thời điểm phòng có thể nhận, quy định sử dụng và cách liên hệ khi cần hỗ trợ. Chuẩn bị trước các câu hỏi giúp buổi xem phòng hiệu quả hơn.', 'Ask what the rent includes, when the room is available, which house rules apply and how to reach the team for support. Preparing questions makes a viewing more useful.'),
  sample('sample-faq-1', 'faq', 1, 'Gửi form có phải là đặt phòng không?', 'Does submitting a form reserve a room?', 'Không. Form chỉ ghi nhận yêu cầu để nhân viên liên hệ, kiểm tra thông tin và tư vấn tiếp.', 'No. The form only sends an inquiry so a team member can check details and contact you.'),
  sample('sample-faq-2', 'faq', 2, 'Giá hiển thị là giá nào?', 'Which price is displayed?', 'Trang phòng hiển thị giá thuê theo tháng. Tiền cọc và phí dịch vụ được ghi riêng nếu đã có thông tin công khai.', 'Room pages show monthly rent. Deposits and service fees appear separately when public details are available.'),
  sample('sample-faq-3', 'faq', 3, 'Tôi có thể xem phòng trước không?', 'Can I view a room first?', 'Có thể gửi yêu cầu qua form và ghi ngày giờ mong muốn. Nhân viên sẽ liên hệ để xác nhận lịch phù hợp.', 'Send an inquiry with your preferred time. A team member will contact you to confirm a suitable viewing.'),
];

export async function getContentItems(section: ContentSection): Promise<ContentItem[]> {
  const defaults = sampleContent.filter(item => item.section === section);
  if (!env.DB) return defaults;
  const result = await env.DB.prepare('SELECT id, section, title_vi, title_en, body_vi, body_en, published, deleted, position FROM site_content_items WHERE section = ? ORDER BY position, id').bind(section).all<ContentItem>();
  const overrides = new Map((result.results || []).map(item => [item.id, item]));
  const merged = [...defaults.map(item => overrides.get(item.id) || item), ...(result.results || []).filter(item => !defaults.some(defaultItem => defaultItem.id === item.id))];
  return merged.filter(item => item.published === 1 && item.deleted !== 1).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

export async function getEditableContent(section: ContentSection): Promise<ContentItem[]> {
  const defaults = sampleContent.filter(item => item.section === section);
  if (!env.DB) return defaults;
  const result = await env.DB.prepare('SELECT id, section, title_vi, title_en, body_vi, body_en, published, deleted, position FROM site_content_items WHERE section = ? ORDER BY position, id').bind(section).all<ContentItem>();
  const overrides = new Map((result.results || []).map(item => [item.id, item]));
  return [...defaults.map(item => overrides.get(item.id) || item), ...(result.results || []).filter(item => !defaults.some(defaultItem => defaultItem.id === item.id))].filter(item => item.deleted !== 1).sort((a,b) => a.position - b.position || a.id.localeCompare(b.id));
}

export async function getDeletedContent(section: ContentSection): Promise<ContentItem[]> {
  if (!env.DB) return [];
  const result = await env.DB.prepare('SELECT id, section, title_vi, title_en, body_vi, body_en, published, deleted, position FROM site_content_items WHERE section = ? AND deleted = 1 ORDER BY position, id').bind(section).all<ContentItem>();
  return (result.results || []).map(item => sampleContent.find(sampleItem => sampleItem.id === item.id) || item);
}
