import { CONTACT } from "./site";

type Lang = "vi" | "en";
type Meta = { title: string; description: string };

/** Title and description shown on Google for the home page. The title is used as-is; other pages get " | DRM Stays" appended. */
export const homeMeta: Record<Lang, Meta> = {
  vi: {
    title: "DRM Stays | Vận hành bất động sản cho thuê tại Đà Nẵng",
    description: "DRM Stays tư vấn phát triển, thiết kế và vận hành bất động sản cho thuê tại Đà Nẵng. Xem các tòa nhà đang vận hành và nhận tư vấn từ đội ngũ đã thực hiện hơn 10 dự án.",
  },
  en: {
    title: "DRM Stays | Rental Property Operations in Da Nang",
    description: "DRM Stays advises on the development, design and operation of rental property in Da Nang. View our buildings and get advice from a team that has handled more than 10 projects.",
  },
};

/** One distinct title and description per page, so Google does not see the same text everywhere. */
export const pageMeta: Record<Lang, Record<"stays" | "services" | "partners" | "about" | "journal" | "faq" | "contact", Meta>> = {
  vi: {
    stays: { title: "Căn hộ cho thuê tại An Thượng, Đà Nẵng", description: "Xem các tòa nhà DRM Stays vận hành gần An Thượng, Mỹ An: phòng có sẵn nội thất, thuê ngắn ngày và dài ngày." },
    services: { title: "Tư vấn và vận hành bất động sản cho thuê", description: "Từ chọn mua, thiết kế, thi công đến vận hành và báo cáo tài chính hằng tháng cho chủ đầu tư bất động sản cho thuê tại Đà Nẵng." },
    partners: { title: "Hợp tác cùng DRM Stays", description: "Dành cho chủ đầu tư: DRM Stays tư vấn và đảm nhận vận hành bất động sản cho thuê tại Đà Nẵng. Liên hệ để biết phí theo dự án." },
    about: { title: "Giới thiệu: 3 năm vận hành bất động sản cho thuê", description: "Hơn 10 dự án đã tư vấn, bốn tòa nhà đang trong vận hành. Tìm hiểu hệ sinh thái tư vấn từ thiết kế đến vận hành của DRM Stays." },
    journal: { title: "Cẩm nang bất động sản cho thuê", description: "Kinh nghiệm thuê phòng và vận hành bất động sản cho thuê tại Đà Nẵng từ đội ngũ DRM Stays." },
    faq: { title: "Câu hỏi thường gặp khi thuê phòng", description: "Giá thuê, tiền cọc, điện nước, thời gian thuê và ngôn ngữ hỗ trợ tại các tòa nhà DRM Stays ở Đà Nẵng." },
    contact: { title: "Liên hệ tư vấn và thuê phòng tại Đà Nẵng", description: `Gọi ${CONTACT.phone} hoặc gửi yêu cầu. Văn phòng làm việc 8:00 đến 17:00, hỗ trợ nhiều ngôn ngữ.` },
  },
  en: {
    stays: { title: "Apartments for rent in An Thượng, Da Nang", description: "Browse the DRM Stays buildings near An Thượng, Mỹ An: furnished rooms for short and long stays." },
    services: { title: "Rental property consulting and operations", description: "From buying and design to construction, operation and monthly financial reports for rental property investors in Da Nang." },
    partners: { title: "Partner with DRM Stays", description: "For investors: DRM Stays advises on and operates rental property in Da Nang. Contact us for a fee that fits your project." },
    about: { title: "About us: 3 years operating rental property", description: "More than 10 projects advised and four buildings under operation. Learn about the DRM Stays ecosystem, from design to operation." },
    journal: { title: "Rental property journal", description: "Tips on renting a room and operating rental property in Da Nang from the DRM Stays team." },
    faq: { title: "FAQ: renting a room in Da Nang", description: "Rent, deposit, utilities, stay length and languages supported at DRM Stays buildings in Da Nang." },
    contact: { title: "Contact us for advice or a room in Da Nang", description: `Call ${CONTACT.phone} or send an inquiry. Office open 8:00–17:00, multilingual support.` },
  },
};
