export const policySections = ['privacy', 'cancellation', 'terms'] as const;
export type PolicySection = (typeof policySections)[number];
type Block = { heading: string; paragraphs: string[] };
type Policy = { title: string; intro: string; blocks: Block[] };

export const POLICIES_UPDATED = '2026-11-01';

// DRAFT wording: the owner reviews and approves it before the site goes live. It deliberately states no refund
// percentages, deadlines or legal entity details; those are agreed per room and in the written agreement.
export const policies: Record<'vi' | 'en', Record<PolicySection, Policy>> = {
  vi: {
    privacy: {
      title: 'Chính sách quyền riêng tư',
      intro: 'DRM Stays chỉ thu thập thông tin cần thiết để trả lời yêu cầu của bạn về phòng ở.',
      blocks: [
        { heading: 'Thông tin chúng tôi thu thập', paragraphs: [
          'Khi bạn gửi form tư vấn hoặc hợp tác: họ tên, số điện thoại, email (nếu có), ngày dự kiến, nội dung bạn nhập và phòng hoặc tòa nhà bạn quan tâm.',
          'Để chống gửi tự động và lạm dụng, hệ thống ghi tạm thời địa chỉ IP của thiết bị gửi form.',
        ] },
        { heading: 'Mục đích sử dụng', paragraphs: [
          'Liên hệ lại để tư vấn phòng, xác nhận tình trạng phòng, lịch xem và điều kiện thuê.',
          'Quản lý yêu cầu nội bộ và bảo vệ website khỏi lạm dụng. Chúng tôi không bán thông tin của bạn và không dùng để gửi quảng cáo của bên thứ ba.',
        ] },
        { heading: 'Chia sẻ thông tin', paragraphs: [
          'Thông tin được lưu và xử lý trên hạ tầng của nhà cung cấp dịch vụ lưu trữ web (Cloudflare) và được chuyển cho nhân viên DRM Stays qua kênh nhắn tin nội bộ để xử lý yêu cầu.',
          'Chúng tôi chỉ cung cấp thông tin cho cơ quan nhà nước khi pháp luật yêu cầu.',
        ] },
        { heading: 'Thời gian lưu trữ', paragraphs: ['Thông tin được giữ trong thời gian cần thiết để xử lý yêu cầu và các nghĩa vụ liên quan, sau đó được xóa hoặc ẩn danh.'] },
        { heading: 'Quyền của bạn', paragraphs: ['Bạn có quyền yêu cầu xem, sửa, xóa thông tin cá nhân của mình hoặc rút lại sự đồng ý bất cứ lúc nào bằng cách liên hệ với chúng tôi qua trang Liên hệ.'] },
        { heading: 'Cookie', paragraphs: ['Website công khai không dùng cookie quảng cáo hay theo dõi. Cookie chỉ được dùng cho phiên đăng nhập của quản trị viên.'] },
      ],
    },
    cancellation: {
      title: 'Chính sách hủy và đổi phòng',
      intro: 'Điều kiện hủy và đổi phòng được xác nhận bằng văn bản với bạn trước khi bạn đặt cọc hoặc thanh toán.',
      blocks: [
        { heading: 'Gửi yêu cầu không phải là đặt phòng', paragraphs: ['Form trên website chỉ ghi nhận yêu cầu tư vấn. Phòng chỉ được giữ khi DRM Stays xác nhận với bạn và hai bên thống nhất điều kiện thuê.'] },
        { heading: 'Hủy hoặc thay đổi', paragraphs: [
          'Tiền cọc, thời hạn thuê tối thiểu và điều kiện hủy có thể khác nhau tùy phòng; thông tin hiển thị trên trang phòng (nếu có) và được ghi lại trong thỏa thuận thuê.',
          'Nếu bạn cần hủy hoặc đổi ngày, hãy liên hệ với chúng tôi càng sớm càng tốt để được hỗ trợ.',
        ] },
        { heading: 'Hoàn tiền', paragraphs: ['Việc hoàn tiền cọc (nếu có) được thực hiện theo điều khoản đã thỏa thuận trong văn bản xác nhận.'] },
      ],
    },
    terms: {
      title: 'Điều khoản sử dụng',
      intro: 'Khi sử dụng website DRM Stays, bạn đồng ý với các điều khoản dưới đây.',
      blocks: [
        { heading: 'Thông tin trên website', paragraphs: ['Hình ảnh, giá, tiện ích và tình trạng phòng được cập nhật thường xuyên nhưng có thể thay đổi. Thông tin cuối cùng là thông tin được DRM Stays xác nhận với bạn.'] },
        { heading: 'Yêu cầu tư vấn', paragraphs: ['Bạn cam kết thông tin gửi lên là chính xác. Chúng tôi có thể từ chối hoặc chặn các yêu cầu có dấu hiệu gửi tự động hoặc lạm dụng.'] },
        { heading: 'Quyền sở hữu nội dung', paragraphs: ['Hình ảnh, văn bản và biểu trưng trên website thuộc DRM Stays hoặc được sử dụng với sự cho phép. Không sao chép cho mục đích thương mại khi chưa có sự đồng ý.'] },
        { heading: 'Giới hạn trách nhiệm', paragraphs: ['Website được cung cấp như hiện có. Chúng tôi không chịu trách nhiệm cho gián đoạn tạm thời hoặc sai lệch ngoài ý muốn của thông tin; vui lòng xác nhận lại với nhân viên trước khi quyết định thuê.'] },
        { heading: 'Thay đổi điều khoản', paragraphs: ['Các điều khoản có thể được cập nhật; phiên bản mới có hiệu lực kể từ ngày đăng trên website.'] },
      ],
    },
  },
  en: {
    privacy: {
      title: 'Privacy Policy',
      intro: 'DRM Stays collects only what it needs to answer your enquiry about a stay.',
      blocks: [
        { heading: 'What we collect', paragraphs: [
          'When you send an enquiry or partnership form: your name, phone number, email (optional), planned dates, your message, and the room or building you asked about.',
          'To prevent automated and abusive submissions, the IP address of the sending device is recorded temporarily.',
        ] },
        { heading: 'How we use it', paragraphs: [
          'To reply to you about rooms, availability, viewings and rental terms.',
          'To manage enquiries internally and protect the site from abuse. We do not sell your information or use it for third-party advertising.',
        ] },
        { heading: 'Who sees it', paragraphs: [
          'Your information is stored and processed on our web hosting provider (Cloudflare) and sent to DRM Stays staff through an internal messaging channel so they can handle your enquiry.',
          'We disclose information to public authorities only when required by law.',
        ] },
        { heading: 'How long we keep it', paragraphs: ['For as long as needed to handle your enquiry and related obligations, after which it is deleted or anonymised.'] },
        { heading: 'Your rights', paragraphs: ['You may ask to see, correct or delete your personal information, or withdraw your consent at any time, by contacting us through the Contact page.'] },
        { heading: 'Cookies', paragraphs: ['The public website does not use advertising or tracking cookies. Cookies are used only for the administrator login session.'] },
      ],
    },
    cancellation: {
      title: 'Cancellation & Change Policy',
      intro: 'Cancellation and change conditions are confirmed with you in writing before you pay any deposit.',
      blocks: [
        { heading: 'An enquiry is not a booking', paragraphs: ['The website form only records a request for advice. A room is held only after DRM Stays confirms it with you and both sides agree on the rental terms.'] },
        { heading: 'Cancelling or changing', paragraphs: [
          'Deposit, minimum stay and cancellation conditions can differ by room; they are shown on the room page where available and recorded in the rental agreement.',
          'If you need to cancel or change dates, please contact us as early as possible and we will help.',
        ] },
        { heading: 'Refunds', paragraphs: ['Any refund of a deposit follows the terms agreed in the written confirmation.'] },
      ],
    },
    terms: {
      title: 'Terms of Use',
      intro: 'By using the DRM Stays website you agree to the terms below.',
      blocks: [
        { heading: 'Information on this site', paragraphs: ['Photos, prices, amenities and availability are updated regularly but may change. The final information is what DRM Stays confirms with you directly.'] },
        { heading: 'Enquiries', paragraphs: ['You confirm the information you submit is accurate. We may refuse or block submissions that appear automated or abusive.'] },
        { heading: 'Content ownership', paragraphs: ['Photos, text and logos on this site belong to DRM Stays or are used with permission. Please do not copy them for commercial use without consent.'] },
        { heading: 'Limitation of liability', paragraphs: ['The site is provided as is. We are not liable for temporary interruptions or unintended inaccuracies; please confirm details with our team before deciding to rent.'] },
        { heading: 'Changes to these terms', paragraphs: ['These terms may be updated; the new version applies from the date it is posted on the site.'] },
      ],
    },
  },
};
