import Link from 'next/link';
import { ArrowUpRight, Bike, CalendarDays, Compass, Flower2, Languages, MessagesSquare, Plane, Receipt, Route, Sofa, Sparkles, Ticket } from 'lucide-react';
import type { ContentImage, ContentItem } from '@/lib/site-content';
import { imgSize } from '@/lib/image-url';

type Photo = { url: string; alt: string; width?: number; height?: number };
type Lang = 'vi' | 'en';

/** Services at this position and above are "add-on" services sold alongside the stay (tours, tickets, spa, ...). */
export const ADDON_FROM_POSITION = 20;

export const stayIcons = [CalendarDays, Sofa, Receipt, Languages, MessagesSquare, Sparkles];
export const addonIcons: Record<string, typeof Compass> = {
  'sample-addon-tour-fixed': Compass, 'sample-addon-tour-custom': Route, 'sample-addon-tickets': Ticket,
  'sample-addon-spa': Flower2, 'sample-addon-motorbike': Bike, 'sample-addon-airport': Plane,
};

const words = {
  vi: {
    stayLabel: 'LƯU TRÚ', stayTitle: 'Lưu trú trọn gói, rõ ràng từ đầu', stayLead: 'Phòng có sẵn nội thất, chi phí minh bạch và đội ngũ hỗ trợ nhiều ngôn ngữ.',
    addonLabel: 'DỊCH VỤ ĐI KÈM', addonTitle: 'Thêm trải nghiệm cho chuyến ở của bạn', addonLead: 'Tour, vé, spa, xe máy và đưa đón sân bay: nhờ chúng tôi sắp xếp để bạn chỉ việc tận hưởng.',
    ask: 'Hỏi giá và đặt lịch', note: 'Lịch và giá thay đổi theo thời điểm; liên hệ để được xác nhận trước khi đặt.',
    ctaTitle: 'Bạn cần một gói riêng?', ctaBody: 'Cho chúng tôi biết thời gian ở, số người và những gì bạn quan tâm. Chúng tôi sẽ đề xuất lưu trú cùng dịch vụ đi kèm phù hợp.', cta: 'Gửi yêu cầu tư vấn',
  },
  en: {
    stayLabel: 'STAY', stayTitle: 'A complete stay, clear from the start', stayLead: 'Furnished rooms, transparent costs and a team that supports you in several languages.',
    addonLabel: 'ADD-ON SERVICES', addonTitle: 'More to enjoy during your stay', addonLead: 'Tours, tickets, spa, motorbikes and airport transfers: let us arrange them so you can simply enjoy.',
    ask: 'Ask for a price and book', note: 'Schedules and prices change with the season; contact us to confirm before you book.',
    ctaTitle: 'Need a tailored package?', ctaBody: 'Tell us how long you will stay, how many of you there are and what you care about. We will suggest a stay with the add-ons that fit.', cta: 'Send an inquiry',
  },
} as const;

const pick = (item: ContentItem, lang: Lang) => ({ title: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, body: lang === 'vi' ? item.body_vi : item.body_en || item.body_vi });

export function ServicesShowcase({ lang, items, images, photos }: { lang: Lang; items: ContentItem[]; images: Record<string, ContentImage[]>; photos: Photo[] }) {
  const w = words[lang];
  const stay = items.filter(item => item.position < ADDON_FROM_POSITION);
  const addons = items.filter(item => item.position >= ADDON_FROM_POSITION);
  return <>
    {stay.length > 0 && <section className="svc-stay structure-section" aria-labelledby="svc-stay-title" data-reveal>
      <div className="svc-head"><span className="editorial-section-label">{w.stayLabel}</span><h2 id="svc-stay-title">{w.stayTitle}</h2><p>{w.stayLead}</p></div>
      <div className="svc-stay-grid">{stay.map((item, index) => {
        const own = images[item.id]?.[0] || photos[index % Math.max(1, photos.length)];
        const Icon = stayIcons[index % stayIcons.length];
        return <article className="svc-card" key={item.id} style={{ '--i': index } as React.CSSProperties}>
          <div className="svc-card-photo">{own ? <img src={own.url} alt={own.alt || ''} loading="lazy" {...imgSize(own)} /> : <span aria-hidden="true" />}<i aria-hidden="true"><Icon size={20} /></i></div>
          <div className="svc-card-body"><small>{String(index + 1).padStart(2, '0')}</small><h3>{pick(item, lang).title}</h3><p>{pick(item, lang).body}</p></div>
        </article>;
      })}</div>
    </section>}
    {addons.length > 0 && <section className="svc-addons structure-section" id="addons" aria-labelledby="svc-addons-title" data-reveal>
      <div className="svc-head"><span className="editorial-section-label">{w.addonLabel}</span><h2 id="svc-addons-title">{w.addonTitle}</h2><p>{w.addonLead}</p></div>
      <div className="svc-addon-grid">{addons.map((item, index) => {
        const Icon = addonIcons[item.id] || Sparkles;
        const own = images[item.id]?.[0];
        return <article className="svc-addon" key={item.id} style={{ '--i': index } as React.CSSProperties}>
          {own && <div className="svc-addon-photo"><img src={own.url} alt={own.alt || ''} loading="lazy" {...imgSize(own)} /></div>}
          <span className="svc-addon-icon" aria-hidden="true"><Icon size={26} /></span>
          <h3>{pick(item, lang).title}</h3><p>{pick(item, lang).body}</p>
          <Link href={`/${lang}/contact`}>{w.ask}<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </article>;
      })}</div>
      <p className="svc-note">{w.note}</p>
    </section>}
    <section className="svc-cta structure-section" data-reveal><div><h2>{w.ctaTitle}</h2><p>{w.ctaBody}</p></div><Link className="editorial-primary-link" href={`/${lang}/contact`}>{w.cta}<span aria-hidden="true">↗</span></Link></section>
  </>;
}
