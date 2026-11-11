import { CONTACT } from "./site";

type Lang = "vi" | "en";
type Meta = { title: string; description: string };
type PageMeta = Meta & { /** The visible main heading (H1); describes the page better than the short menu name. */ h1: string };

/** Title and description shown on Google for the home page. The title is used as-is; other pages get " | DRM Stays" appended. */
export const homeMeta: Record<Lang, Meta> = {
  vi: {
    title: "DRM Stays | Căn hộ cho thuê tại An Thượng, Đà Nẵng",
    description: "Căn hộ có sẵn nội thất gần An Thượng, Mỹ An, Đà Nẵng. Thuê ngắn ngày và dài ngày, hỗ trợ tiếng Việt, Anh, Nhật, Hàn, Trung, Nga.",
  },
  en: {
    title: "DRM Stays | Apartments for Rent in An Thượng, Da Nang",
    description: "Furnished apartments near An Thượng, Mỹ An, Da Nang. Short and long stays, with support in Vietnamese, English, Japanese, Korean, Chinese and Russian.",
  },
};

/** One distinct title and description per page, so Google does not see the same text everywhere. */
export const pageMeta: Record<Lang, Record<"stays" | "services" | "partners" | "about" | "journal" | "faq" | "contact", PageMeta>> = {
  vi: {
    stays: { h1: "Phòng cho thuê tại An Thượng, Đà Nẵng", title: "Xem tòa nhà và phòng cho thuê tại An Thượng", description: "Doraemon's Land Đỗ Bá và AnLiu Apartment: phòng có sẵn nội thất, thuê ngắn ngày và dài ngày. Xem ảnh, giá và gửi yêu cầu." },
    services: { h1: "Dịch vụ và chi phí khi thuê phòng", title: "Dịch vụ và chi phí khi thuê phòng", description: "Thuê ngắn ngày và dài ngày, phòng có sẵn nội thất, chi phí điện nước rõ ràng và hỗ trợ nhiều ngôn ngữ tại các tòa nhà DRM Stays." },
    partners: { h1: "Dành cho chủ đầu tư bất động sản cho thuê", title: "Dành cho chủ đầu tư: tư vấn và vận hành", description: "Tư vấn chọn mua, thiết kế, thi công và vận hành bất động sản cho thuê tại Đà Nẵng, kèm báo cáo tài chính hằng tháng. Liên hệ để biết phí." },
    about: { h1: "DRM Stays: tư vấn và vận hành bất động sản cho thuê", title: "Giới thiệu: 3 năm vận hành bất động sản cho thuê", description: "DRM Stays vận hành bốn tòa nhà tại Đà Nẵng và đã tư vấn hơn 10 dự án. Tìm hiểu về đội ngũ và hệ sinh thái từ thiết kế đến vận hành." },
    journal: { h1: "Cẩm nang bất động sản cho thuê", title: "Cẩm nang bất động sản cho thuê", description: "Kinh nghiệm thuê phòng và vận hành bất động sản cho thuê tại Đà Nẵng từ đội ngũ DRM Stays." },
    faq: { h1: "Câu hỏi thường gặp khi thuê phòng", title: "Câu hỏi thường gặp khi thuê phòng", description: "Giá thuê, tiền cọc, điện nước, thời gian thuê và ngôn ngữ hỗ trợ tại các tòa nhà DRM Stays ở Đà Nẵng." },
    contact: { h1: "Liên hệ DRM Stays tại Đà Nẵng", title: "Liên hệ tư vấn và thuê phòng tại Đà Nẵng", description: `Gọi ${CONTACT.phoneDisplay} hoặc gửi yêu cầu. Văn phòng làm việc 8:00 đến 17:00, hỗ trợ nhiều ngôn ngữ.` },
  },
  en: {
    stays: { h1: "Rooms for rent in An Thượng, Da Nang", title: "Buildings and rooms for rent in An Thượng", description: "Doraemon's Land Đỗ Bá and AnLiu Apartment: furnished rooms for short and long stays. See photos, prices and send an inquiry." },
    services: { h1: "Services and costs when renting a room", title: "Services and costs when renting a room", description: "Short and long stays, furnished rooms, clear utility costs and multilingual support at DRM Stays buildings." },
    partners: { h1: "For rental property investors", title: "For investors: consulting and operations", description: "Advice on buying, design, construction and operation of rental property in Da Nang, with monthly financial reports. Contact us for fees." },
    about: { h1: "DRM Stays: rental property consulting and operations", title: "About us: 3 years operating rental property", description: "DRM Stays operates four buildings in Da Nang and has advised more than 10 projects. Learn about the team and our ecosystem from design to operation." },
    journal: { h1: "Rental property journal", title: "Rental property journal", description: "Tips on renting a room and operating rental property in Da Nang from the DRM Stays team." },
    faq: { h1: "FAQ: renting a room in Da Nang", title: "FAQ: renting a room in Da Nang", description: "Rent, deposit, utilities, stay length and languages supported at DRM Stays buildings in Da Nang." },
    contact: { h1: "Contact DRM Stays in Da Nang", title: "Contact us for advice or a room in Da Nang", description: `Call ${CONTACT.phoneDisplay} or send an inquiry. Office open 8:00–17:00, multilingual support.` },
  },
};
