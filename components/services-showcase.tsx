import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Bike, CalendarDays, Check, Compass, Flower2, Languages, MessagesSquare, Plane, Receipt, Route, Sofa, Sparkles, Ticket } from 'lucide-react';
import type { ContentImage, ContentItem } from '@/lib/site-content';
import { imgSize } from '@/lib/image-url';
import { addonSpans } from '@/lib/addon-spans';
import { Frame, Staggered } from '@/components/about-page';

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
    eyebrow: 'DRM STAYS / DỊCH VỤ', lead: 'Phòng có sẵn nội thất, chi phí minh bạch và đội ngũ hỗ trợ nhiều ngôn ngữ.', heroCta: 'Hỏi giá và đặt lịch',
    stayLabel: 'RÕ RÀNG TỪ ĐẦU', stayHead: ['LƯU TRÚ', 'TRỌN GÓI'],
    costLabel: 'CHI PHÍ', moreLabel: 'VÀ CÒN NHIỀU HƠN',
    addonLabel: 'THÊM TRẢI NGHIỆM', addonHead: ['DỊCH VỤ', 'ĐI KÈM'], addonLead: 'Tour, vé, spa, xe máy và đưa đón sân bay: nhờ chúng tôi sắp xếp để bạn chỉ việc tận hưởng.',
    ask: 'Hỏi giá', note: 'Lịch và giá thay đổi theo thời điểm; liên hệ để được xác nhận trước khi đặt.',
    ctaTitle: 'Bạn cần một gói riêng?', ctaBody: 'Cho chúng tôi biết thời gian ở, số người và những gì bạn quan tâm. Chúng tôi sẽ đề xuất lưu trú cùng dịch vụ đi kèm phù hợp.', cta: 'Gửi yêu cầu tư vấn',
  },
  en: {
    eyebrow: 'DRM STAYS / SERVICES', lead: 'Furnished rooms, transparent costs and a team that supports you in several languages.', heroCta: 'Ask for a price and book',
    stayLabel: 'CLEAR FROM THE START', stayHead: ['A COMPLETE', 'STAY'],
    costLabel: 'COSTS', moreLabel: 'AND MORE',
    addonLabel: 'MORE TO ENJOY', addonHead: ['ADD-ON', 'SERVICES'], addonLead: 'Tours, tickets, spa, motorbikes and airport transfers: let us arrange them so you can simply enjoy.',
    ask: 'Ask for a price', note: 'Schedules and prices change with the season; contact us to confirm before you book.',
    ctaTitle: 'Need a tailored package?', ctaBody: 'Tell us how long you will stay, how many of you there are and what you care about. We will suggest a stay with the add-ons that fit.', cta: 'Send an inquiry',
  },
} as const;

const pick = (item: ContentItem, lang: Lang) => ({ title: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, body: lang === 'vi' ? item.body_vi : item.body_en || item.body_vi });
const COST_ID = 'sample-service-3';

export function ServicesShowcase({ lang, title, items, images, photos }: { lang: Lang; title: string; items: ContentItem[]; images: Record<string, ContentImage[]>; photos: Photo[] }) {
  const w = words[lang];
  const stay = items.filter(item => item.position < ADDON_FROM_POSITION);
  const addons = items.filter(item => item.position >= ADDON_FROM_POSITION);
  const cost = stay.find(item => item.id === COST_ID);
  const others = stay.filter(item => item.id !== COST_ID);
  const featured = others.slice(0, 2), compact = others.slice(2);
  const photoFor = (item: ContentItem, index: number) => images[item.id]?.[0] || photos[index % Math.max(1, photos.length)];
  const heroPhoto = photos[0];
  const spans = addonSpans(addons.length);
  const lines = cost ? pick(cost, lang).body.split(/(?<=\.)\s+/).map(line => line.trim()).filter(Boolean) : [];
  return <>
    <div className="rt"><section className="rt-hero" aria-labelledby="svc-title">
      <div className="rt-hero-inner">
        <div className="rt-hero-text">
          <span className="rt-eyebrow">{w.eyebrow}</span>
          <h1 id="svc-title">{title}</h1>
          <p>{w.lead}</p>
          <Link className="rt-cta" href={`/${lang}/contact`}>{w.heroCta}<ArrowDown size={16} aria-hidden="true" style={{ transform: 'rotate(-135deg)' }} /></Link>
        </div>
        {heroPhoto && <figure className="rt-hero-photo"><img src={heroPhoto.url} alt={heroPhoto.alt || ''} fetchPriority="high" {...imgSize(heroPhoto)} /></figure>}
      </div>
    </section></div>

    <div className="abt svc2">
      {stay.length > 0 && <section className="abt-section" aria-labelledby="svc-stay-title">
        <div className="abt-top" data-reveal><span className="abt-small">{w.stayLabel}</span><Staggered lines={w.stayHead} id="svc-stay-title" /></div>
        <ol className="abt-pillars">{featured.map((item, index) => <li key={item.id} className={index % 2 ? 'is-flip' : ''} data-reveal>
          <Frame photo={photoFor(item, index)} alt="" />
          <div className="abt-pillar-text abt-rise"><span className="abt-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{pick(item, lang).title}</h3><p>{pick(item, lang).body}</p></div>
        </li>)}</ol>
      </section>}

      {cost && <section className="svc2-cost" aria-labelledby="svc-cost-title" data-reveal>
        <div className="svc2-cost-inner">
          <div className="abt-rise"><span className="svc2-cost-label">{w.costLabel}</span><h2 id="svc-cost-title">{pick(cost, lang).title}</h2></div>
          <ul>{lines.map((line, index) => <li className="abt-rise" key={index} style={{ '--d': `${index * 0.1}s` } as React.CSSProperties}><Check size={18} aria-hidden="true" /><span>{line}</span></li>)}</ul>
        </div>
      </section>}

      {compact.length > 0 && <section className="abt-section" aria-labelledby="svc-more-title">
        <div className="abt-top" data-reveal><span className="abt-small" id="svc-more-title">{w.moreLabel}</span></div>
        <ul className="svc2-compact" data-reveal>{compact.map((item, index) => { const Icon = stayIcons[(index + 3) % stayIcons.length]; return <li className="abt-rise" key={item.id} style={{ '--d': `${index * 0.1}s` } as React.CSSProperties}>
          <span className="svc2-icon" aria-hidden="true"><Icon size={22} /></span><h3>{pick(item, lang).title}</h3><p>{pick(item, lang).body}</p>
        </li>; })}</ul>
      </section>}

      {addons.length > 0 && <section className="abt-section svc2-addons" id="addons" aria-labelledby="svc-addons-title">
        <div className="abt-top" data-reveal><span className="abt-small">{w.addonLabel}</span><Staggered lines={w.addonHead} id="svc-addons-title" /></div>
        <p className="abt-lead">{w.addonLead}</p>
        <div className="home-addons" data-reveal><ul className="home-addon-grid">{addons.map((item, index) => { const Icon = addonIcons[item.id] || Sparkles; const photo = images[item.id]?.[0];
          return <li key={item.id} style={{ '--span': spans[index], '--i': index } as React.CSSProperties}><Link className={`home-addon-tile is-tone-${index % 4}`} href={`/${lang}/contact`}>
            <span className="home-addon-media">{photo ? <img src={photo.url} alt={photo.alt || pick(item, lang).title} loading="lazy" {...imgSize(photo)} /> : <Icon className="home-addon-bg" size={150} strokeWidth={1} aria-hidden="true" />}</span>
            <span className="home-addon-badge" aria-hidden="true"><Icon size={20} /></span>
            <ArrowUpRight className="home-addon-arrow" size={20} aria-hidden="true" />
            <span className="home-addon-text"><h4>{pick(item, lang).title}</h4><p>{pick(item, lang).body}</p></span>
          </Link></li>; })}</ul></div>
        <p className="svc-note">{w.note}</p>
      </section>}

      <section className="svc2-cta" data-reveal>
        <div className="svc2-cta-inner abt-rise"><h2>{w.ctaTitle}</h2><p>{w.ctaBody}</p><Link className="abt-button" href={`/${lang}/contact`}>{w.cta}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </section>
    </div>
  </>;
}
