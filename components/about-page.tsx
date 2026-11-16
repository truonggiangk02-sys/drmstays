import Link from 'next/link';
import { ArrowUpRight, FileBarChart, Globe2, Handshake } from 'lucide-react';
import type { ContentItem, ContentImage } from '@/lib/site-content';
import { buildingPhotos, buildingRoomCount } from '@/lib/building-media';
import { buildingStatusLabel } from '@/lib/building-status';
import { propertyName } from '@/lib/site';
import { imgSize } from '@/lib/image-url';
import { CountUp } from '@/components/smooth-motion';
import { ReviewCards, type ReviewCard } from '@/components/home-motion';
import { OfficeMap } from '@/components/office-map';
import type { InvestorBuilding } from '@/components/investor-page';

type Lang = 'vi' | 'en';

const words = {
  vi: {
    kicker: 'VỀ DRM STAYS', cta: 'Liên hệ với chúng tôi', ctaSecondary: 'Dành cho chủ đầu tư',
    storyLabel: 'CHÚNG TÔI LÀ AI', buildingsLabel: 'CÁC TÒA NHÀ', buildingsTitle: 'Nơi chúng tôi vận hành mỗi ngày', open: 'Đang vận hành', rooms: 'phòng',
    numbersLabel: 'CON SỐ', numbersTitle: 'Sau 3 năm, đây là những gì chúng tôi đã làm', liveBuildings: 'tòa nhà đang vận hành', liveRooms: 'phòng đang được quản lý',
    valuesLabel: 'CÁCH CHÚNG TÔI LÀM VIỆC', valuesTitle: 'Ba điều chúng tôi giữ nhất quán',
    values: [['Minh bạch', 'Mỗi tháng chủ đầu tư nhận một báo cáo tài chính rõ ràng; khách thuê biết trước điều khoản và chi phí.'], ['Đi cùng suốt vòng đời', 'Từ chọn mua, thiết kế, thi công đến vận hành và quản lý nhân sự, cùng một đội ngũ phụ trách.'], ['Hỗ trợ đa ngôn ngữ', 'Đội ngũ hỗ trợ khách bằng tiếng Việt, Anh, Nhật, Hàn, Trung và Nga trong giờ làm việc.']],
    reviewsLabel: 'KHÁCH HÀNG NÓI GÌ', reviewsTitle: 'Khách đã ở nói gì về chúng tôi', reviewsLead: 'Đánh giá thật từ Airbnb và Google Maps, giữ nguyên lời khách.',
    ctaTitle: 'Bạn đang tìm nơi ở, hay muốn tài sản của mình sinh lời?', ctaText: 'Cho chúng tôi biết nhu cầu, đội ngũ sẽ liên hệ trong giờ làm việc 8:00 đến 17:00.', ctaGuest: 'Tìm phòng', ctaOwner: 'Hợp tác cùng chúng tôi',
  },
  en: {
    kicker: 'ABOUT DRM STAYS', cta: 'Contact us', ctaSecondary: 'For investors',
    storyLabel: 'WHO WE ARE', buildingsLabel: 'OUR BUILDINGS', buildingsTitle: 'Where we work every day', open: 'Open', rooms: 'rooms',
    numbersLabel: 'IN NUMBERS', numbersTitle: 'What we have done in three years', liveBuildings: 'buildings in operation', liveRooms: 'rooms under management',
    valuesLabel: 'HOW WE WORK', valuesTitle: 'Three things we keep consistent',
    values: [['Transparency', 'Owners receive a clear financial report every month; guests know the terms and costs up front.'], ['With you for the whole lifecycle', 'From choosing and buying to design, construction, operation and staffing, one team stays responsible.'], ['Support in your language', 'We support guests in Vietnamese, English, Japanese, Korean, Chinese and Russian during office hours.']],
    reviewsLabel: 'GUEST REVIEWS', reviewsTitle: 'What our guests are saying', reviewsLead: 'Real reviews from Airbnb and Google Maps, in the guests’ own words.',
    ctaTitle: 'Looking for a place to stay, or want your property to earn?', ctaText: 'Tell us what you need and our team will get in touch during office hours, 8:00–17:00.', ctaGuest: 'Find a room', ctaOwner: 'Work with us',
  },
} as const;

const pick = (item: ContentItem, lang: Lang) => ({ title: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, body: lang === 'vi' ? item.body_vi : item.body_en || item.body_vi });
function Metric({ value }: { value: string }) {
  const match = /^(\d+)(.*)$/.exec(value.trim());
  return match ? <CountUp to={Number(match[1])} suffix={match[2]} /> : <strong>{value}</strong>;
}
const valueIcons = [FileBarChart, Handshake, Globe2];

export function AboutPage({ lang, title, items, metrics, buildings, reviews, reviewImages }: {
  lang: Lang; title: string; items: ContentItem[]; metrics: ContentItem[]; buildings: InvestorBuilding[]; reviews: ContentItem[]; reviewImages: Record<string, ContentImage[]>;
}) {
  const w = words[lang];
  const intro = items.find(item => item.id === 'sample-about') || items[0];
  const rest = items.filter(item => item !== intro);
  const operating = buildings.filter(building => building.status === 'open');
  const liveRooms = operating.reduce((sum, building) => sum + buildingRoomCount(building), 0);
  const numbers = [
    ...metrics.filter(item => item.id !== 'sample-metric-5' && item.id !== 'sample-metric-4').map(item => ({ id: item.id, value: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, label: pick(item, lang).body })),
    ...(operating.length ? [{ id: 'live-buildings', value: String(operating.length), label: w.liveBuildings }] : []),
    ...(liveRooms ? [{ id: 'live-rooms', value: String(liveRooms), label: w.liveRooms }] : []),
  ];
  const mixed = buildings.flatMap(building => buildingPhotos(building).slice(0, 2));
  const heroPhotos = mixed.slice(0, 3);
  const reviewCards: ReviewCard[] = reviews.map((item, index) => {
    const parts = (item.title_en || item.title_vi).split(' · ');
    const sourcePart = parts.slice(1).find(part => /airbnb|google/i.test(part)) || '';
    const note = /\(([^)]*)\)/.exec(sourcePart)?.[1] || '';
    const date = sourcePart.replace(/\(.*?\)/g, '').replace(/^(airbnb|google review|google)[,\s]*/i, '').trim();
    const image = reviewImages[item.id]?.[0] || (mixed.length ? mixed[index % mixed.length] : undefined);
    return { id: item.id, name: parts[0], detail: parts.slice(1).filter(part => part !== sourcePart).join(' · '), source: /airbnb/i.test(sourcePart) ? 'Airbnb' : /google/i.test(sourcePart) ? 'Google' : '', date, note: note ? note.replace(/^./, c => c.toUpperCase()) : '', stars: item.id.startsWith('review-'), quote: item.body_en || item.body_vi, image };
  });

  return <div className="inv about">
    <section className="inv-hero structure-section">
      <div className="inv-hero-head">
        <div><span className="editorial-section-label">{w.kicker}</span><h1>{title}</h1></div>
        <div className="inv-hero-side">
          {intro && <p><strong>{pick(intro, lang).title}.</strong> {pick(intro, lang).body}</p>}
          <div className="inv-hero-actions"><Link className="inv-cta" href={`/${lang}/contact`}>{w.cta}<ArrowUpRight size={18} aria-hidden="true" /></Link><Link className="editorial-text-link" href={`/${lang}/partners`}>{w.ctaSecondary}<span aria-hidden="true">↗</span></Link></div>
        </div>
      </div>
    </section>

    {heroPhotos.length > 0 && <section className="about-mosaic" aria-hidden={heroPhotos.every(photo => !photo.alt) ? 'true' : undefined}>
      {heroPhotos.map((photo, index) => <img key={photo.url} className={index === 0 ? 'is-main' : ''} src={photo.url} alt={photo.alt || ''} loading={index === 0 ? 'eager' : 'lazy'} {...imgSize(photo)} />)}
    </section>}

    {rest.length > 0 && <section className="about-story structure-section" aria-labelledby="about-story-title" data-reveal>
      <div className="inv-section-head"><span className="editorial-section-label">{w.storyLabel}</span><h2 id="about-story-title">{pick(rest[0], lang).title}</h2></div>
      <div className="about-story-grid">{rest.map((item, index) => <article key={item.id}>{index > 0 && <h3>{pick(item, lang).title}</h3>}<p>{pick(item, lang).body}</p></article>)}</div>
    </section>}

    {numbers.length > 0 && <section className="inv-metrics" aria-labelledby="about-numbers-title" data-reveal>
      <div className="inv-metrics-inner structure-section">
        <div className="inv-section-head is-dark"><span className="editorial-section-label">{w.numbersLabel}</span><h2 id="about-numbers-title">{w.numbersTitle}</h2></div>
        <dl className="inv-numbers">{numbers.map(number => <div key={number.id}><dt><Metric value={number.value} /></dt><dd>{number.label}</dd></div>)}</dl>
      </div>
    </section>}

    <section className="about-values structure-section" aria-labelledby="about-values-title" data-reveal>
      <div className="inv-section-head"><span className="editorial-section-label">{w.valuesLabel}</span><h2 id="about-values-title">{w.valuesTitle}</h2></div>
      <div className="about-value-grid">{w.values.map(([name, text], index) => { const Icon = valueIcons[index]; return <article key={name}><span className="inv-model-icon" aria-hidden="true"><Icon size={26} /></span><h3>{name}</h3><p>{text}</p></article>; })}</div>
    </section>

    {buildings.length > 0 && <section className="inv-buildings about-buildings" aria-labelledby="about-buildings-title" data-reveal>
      <div className="inv-section-head structure-section"><span className="editorial-section-label">{w.buildingsLabel}</span><h2 id="about-buildings-title">{w.buildingsTitle}</h2></div>
      <div className="inv-building-track">{buildings.map(building => {
        const photo = buildingPhotos(building)[0] || building.renders[0] || building.progressPhotos[0];
        const status = buildingStatusLabel(building.status, building.openMonth, lang) || w.open;
        const count = buildingRoomCount(building);
        return <Link className="inv-building" href={`/${lang}/buildings/${building.id}`} key={building.id}>
          {photo ? <img src={photo.url} alt={photo.alt || propertyName(building.name)} loading="lazy" {...imgSize(photo)} /> : <span className="inv-building-empty" aria-hidden="true" />}
          <span className={`inv-building-tag is-${building.status}`}>{status}</span>
          <div className="inv-building-info"><h3>{propertyName(building.name)}</h3><p>{building.address}</p>{count > 0 && <small>{count} {w.rooms}</small>}</div>
          <ArrowUpRight className="inv-building-arrow" size={20} aria-hidden="true" />
        </Link>;
      })}</div>
    </section>}

    {reviewCards.length > 0 && <section className="home-reviews structure-section" aria-labelledby="about-reviews-title" data-reveal>
      <div className="home-reviews-head"><span className="editorial-section-label">{w.reviewsLabel}</span><h2 id="about-reviews-title">{w.reviewsTitle}</h2><p>{w.reviewsLead}</p></div>
      <ReviewCards items={reviewCards} prev={lang === 'vi' ? 'Đánh giá trước' : 'Previous reviews'} next={lang === 'vi' ? 'Đánh giá tiếp' : 'Next reviews'} />
    </section>}

    <OfficeMap lang={lang} />

    <section className="about-cta structure-section" data-reveal>
      <h2>{w.ctaTitle}</h2><p>{w.ctaText}</p>
      <div className="inv-hero-actions"><Link className="inv-cta" href={`/${lang}/stays`}>{w.ctaGuest}<ArrowUpRight size={18} aria-hidden="true" /></Link><Link className="editorial-text-link" href={`/${lang}/partners`}>{w.ctaOwner}<span aria-hidden="true">↗</span></Link></div>
    </section>
  </div>;
}
