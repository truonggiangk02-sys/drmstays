import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ContentItem } from '@/lib/site-content';
import { buildingPhotos, buildingRoomCount } from '@/lib/building-media';
import { buildingStatusLabel } from '@/lib/building-status';
import { CONTACT, contactAddress, propertyName } from '@/lib/site';
import { imgSize } from '@/lib/image-url';
import { photoRatio } from '@/lib/justified';
import { CountUp } from '@/components/smooth-motion';
import { JustifiedPhotos } from '@/components/justified-photos';
import type { InvestorBuilding } from '@/components/investor-page';

type Lang = 'vi' | 'en';
type Photo = { url: string; alt: string; width?: number; height?: number };

const words = {
  vi: {
    cta: 'Liên hệ với chúng tôi', ctaSecond: 'Xem các tòa nhà',
    introHead: ['GIỚI THIỆU', 'CHUNG'], introLabel: 'DRM STAYS',
    visionHead: ['TẦM NHÌN', 'VÀ SỨ MỆNH'], visionLabel: 'ĐIỀU CHÚNG TÔI HƯỚNG TỚI',
    valuesHead: ['GIÁ TRỊ', 'CỐT LÕI'], valuesLabel: 'CÁCH CHÚNG TÔI LÀM VIỆC',
    aboutHead: ['CON SỐ', 'NỔI BẬT'], aboutLabel: 'TRONG VẬN HÀNH',
    stats: ['Vận hành bất động sản cho thuê tại Đà Nẵng, từ khách thuê đến chủ đầu tư.', 'Tư vấn phát triển, thiết kế và vận hành cho chủ đầu tư.', 'Phòng có sẵn nội thất, hỗ trợ khách bằng sáu ngôn ngữ.'],
    roomsLabel: 'phòng đang được quản lý',
    doHead: ['LĨNH VỰC', 'HOẠT ĐỘNG'],
    pillars: [
      { title: 'Cho thuê và lưu trú', text: 'Phòng có sẵn nội thất tại Đà Nẵng, thuê ngắn ngày hoặc dài ngày. Bạn xem được ảnh, giá và điều kiện của từng phòng trong cùng một nơi.', link: 'stays', cta: 'Xem tòa nhà và phòng' },
      { title: 'Tư vấn và vận hành cho chủ đầu tư', link: 'partners', cta: 'Dành cho chủ đầu tư' },
      { title: 'Dịch vụ đi kèm', text: 'Tour, vé tham quan, spa, thuê xe máy và đưa đón sân bay, đặt thêm khi bạn cần và báo giá rõ ràng trước khi xác nhận.', link: 'services#addons', cta: 'Xem dịch vụ và chi phí' },
    ],
    portHead: ['DANH MỤC', 'TÒA NHÀ'], area: 'Khu vực', rooms: 'Phòng', status: 'Trạng thái', open: 'Đang vận hành', view: 'Xem tòa nhà', roomsUnit: 'phòng',
    closing: 'YOUR STAY,\nOUR CARE.', hours: 'Giờ làm việc', hoursValue: '8:00 – 17:00', address: 'Văn phòng',
  },
  en: {
    cta: 'Contact us', ctaSecond: 'See our buildings',
    introHead: ['ABOUT', 'DRM STAYS'], introLabel: 'WHO WE ARE',
    visionHead: ['VISION', 'AND MISSION'], visionLabel: 'WHAT WE WORK TOWARDS',
    valuesHead: ['CORE', 'VALUES'], valuesLabel: 'HOW WE WORK',
    aboutHead: ['KEY', 'NUMBERS'], aboutLabel: 'IN OPERATION',
    stats: ['Operating rental property in Da Nang, for guests and for owners.', 'Advising owners on development, design and operation.', 'Furnished rooms, with support in six languages.'],
    roomsLabel: 'rooms under management',
    doHead: ['WHAT', 'WE DO'],
    pillars: [
      { title: 'Rentals and stays', text: 'Furnished rooms in Da Nang, for short or long stays. See the photos, price and terms of every room in one place.', link: 'stays', cta: 'See buildings and rooms' },
      { title: 'Advice and operation for owners', link: 'partners', cta: 'For investors' },
      { title: 'Add-on services', text: 'Tours, tickets, spa, motorbike rental and airport transfers, booked when you need them and quoted clearly before you confirm.', link: 'services#addons', cta: 'See services and costs' },
    ],
    portHead: ['OUR', 'BUILDINGS'], area: 'Area', rooms: 'Rooms', status: 'Status', open: 'Open', view: 'View building', roomsUnit: 'rooms',
    closing: 'YOUR STAY,\nOUR CARE.', hours: 'Office hours', hoursValue: '8:00 – 17:00', address: 'Office',
  },
} as const;

const pick = (item: ContentItem | undefined, lang: Lang) => item ? { title: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, body: lang === 'vi' ? item.body_vi : item.body_en || item.body_vi } : { title: '', body: '' };
const parseNumber = (value: string) => { const match = /^(\d+)(.*)$/.exec(value.trim()); return match ? { to: Number(match[1]), suffix: match[2] } : null; };
/** A two-line heading in light capitals; every word slides up from behind a mask, one after another. */
export const Staggered = ({ lines, id }: { lines: readonly string[]; id?: string }) => <h2 className="abt-head" id={id}>{lines.map((line, row) => <span className="abt-line" key={row}>{line.split(' ').map((word, index) => <span key={index}><span className="w" style={{ '--k': row * 3 + index } as React.CSSProperties}><span className="wi">{word}</span></span>{' '}</span>)}</span>)}</h2>;
/** A photo in a thin offset outline, shown in its own proportions (never cropped). */
export const Frame = ({ photo, alt, className = '' }: { photo?: Photo; alt: string; className?: string }) => <figure className={`abt-frame ${className}`}><span className="abt-frame-clip" style={{ '--r': photo ? photoRatio(photo) : 1.5 } as React.CSSProperties}>{photo ? <img src={photo.url} alt={photo.alt || alt} loading="lazy" {...imgSize(photo)} /> : <span aria-hidden="true" />}</span></figure>;

export function AboutPage({ lang, title, items, metrics, buildings }: { lang: Lang; title: string; items: ContentItem[]; metrics: ContentItem[]; buildings: InvestorBuilding[] }) {
  const w = words[lang];
  const byId = (id: string) => items.find(item => item.id === id);
  const intro = pick(byId('sample-about') || items[0], lang);
  const story = pick(byId('sample-about-story'), lang);
  const vision = pick(byId('sample-about-vision'), lang), mission = pick(byId('sample-about-mission'), lang);
  const values = [1, 2, 3].map(n => pick(byId(`sample-about-value-${n}`), lang)).filter(value => value.title);
  const ecosystem = pick(byId('sample-about-2'), lang);
  const portfolioLead = pick(byId('sample-about-3'), lang);
  const hoursText = pick(byId('sample-about-4'), lang);
  const metric = (id: string) => { const item = metrics.find(entry => entry.id === id); return item ? { value: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, label: pick(item, lang).body } : null; };
  const operating = buildings.filter(building => building.status === 'open');
  const liveRooms = operating.reduce((sum, building) => sum + buildingRoomCount(building), 0);
  const stats = [metric('sample-metric-years'), metric('sample-metric-projects'), liveRooms ? { value: String(liveRooms), label: w.roomsLabel } : null];

  // Photos taken in turn from every building, handed out one by one so the page does not show the same picture twice in a row.
  const perBuilding = buildings.map(buildingPhotos);
  const pool = [...new Map(Array.from({ length: Math.max(0, ...perBuilding.map(list => list.length)) }, (_, round) => perBuilding.map(list => list[round]).filter(Boolean)).flat().map(photo => [photo.url, photo])).values()];
  let cursor = 0;
  const take = (): Photo | undefined => pool.length ? pool[cursor++ % pool.length] : undefined;
  const hero = take();
  const storyPhoto = take();
  const statPhotos = stats.map(() => take());
  const pillarPhotos = w.pillars.map(() => take());
  const closing = take() || hero;
  const [brand, ...restOfTitle] = title.split(':');
  const subtitle = restOfTitle.join(':').trim();

  return <div className="abt">
    <section className="abt-hero" aria-labelledby="abt-title">
      {hero && <img src={hero.url} alt="" fetchPriority="high" {...imgSize(hero)} />}
      <div className="abt-hero-veil" />
      <div className="abt-hero-inner">
        <h1 id="abt-title"><span className="abt-brand">{brand}</span>{subtitle && <span className="abt-sub">{subtitle}</span>}</h1>
        <div className="abt-hero-actions"><Link className="abt-button" href={`/${lang}/contact`}>{w.cta}<ArrowUpRight size={16} aria-hidden="true" /></Link>{buildings.length > 0 && <Link className="abt-link" href={`/${lang}/stays`}>{w.ctaSecond}</Link>}</div>
        <p className="abt-hero-text">{intro.body}</p>
      </div>
    </section>

    {story.body && <section className="abt-section abt-story" aria-labelledby="abt-story-title">
      <div className="abt-top" data-reveal><span className="abt-small">{w.introLabel}</span><Staggered lines={w.introHead} id="abt-story-title" /></div>
      <div className="abt-story-grid" data-reveal>
        <div className="abt-story-text abt-rise"><h3>{story.title}</h3><p>{story.body}</p></div>
        <Frame photo={storyPhoto} alt="" />
      </div>
    </section>}

    {(vision.body || mission.body) && <section className="abt-section abt-vision" aria-labelledby="abt-vision-title">
      <div className="abt-top" data-reveal><span className="abt-small">{w.visionLabel}</span><Staggered lines={w.visionHead} id="abt-vision-title" /></div>
      <div className="abt-vision-grid" data-reveal>
        {vision.body && <article className="abt-rise"><span className="abt-index" aria-hidden="true">01</span><h3>{vision.title}</h3><p>{vision.body}</p></article>}
        {mission.body && <article className="abt-rise" style={{ '--d': '.2s' } as React.CSSProperties}><span className="abt-index" aria-hidden="true">02</span><h3>{mission.title}</h3><p>{mission.body}</p></article>}
      </div>
    </section>}

    {values.length > 0 && <section className="abt-section abt-values" aria-labelledby="abt-values-title">
      <div className="abt-top" data-reveal><span className="abt-small">{w.valuesLabel}</span><Staggered lines={w.valuesHead} id="abt-values-title" /></div>
      <ul className="abt-values-list" data-reveal>{values.map((value, index) => <li className="abt-rise" key={value.title} style={{ '--d': `${index * 0.12}s` } as React.CSSProperties}><span className="abt-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{value.title}</h3><p>{value.body}</p></li>)}</ul>
    </section>}

    <section className="abt-section abt-about" aria-labelledby="abt-about-title">
      <span className="abt-ghost" aria-hidden="true">DRM STAYS</span>
      <div className="abt-top" data-reveal><span className="abt-small">{w.aboutLabel}</span><Staggered lines={w.aboutHead} id="abt-about-title" /></div>
      <div className="abt-stats">{stats.map((stat, index) => {
        if (!stat) return null;
        const num = parseNumber(stat.value);
        return <article key={index} className={index % 2 ? 'is-flip' : ''} data-reveal>
          <Frame photo={statPhotos[index]} alt="" />
          <div className="abt-stat-text abt-rise"><p className="abt-number">{num ? <CountUp to={num.to} suffix={num.suffix} /> : <strong>{stat.value}</strong>}</p><h3>{stat.label}</h3><p>{w.stats[index]}</p></div>
        </article>;
      })}</div>
    </section>

    <section className="abt-section abt-do" aria-labelledby="abt-do-title">
      <div className="abt-top" data-reveal><span className="abt-small">01 — 03</span><Staggered lines={w.doHead} id="abt-do-title" /></div>
      <ol className="abt-pillars">{w.pillars.map((pillar, index) => <li key={pillar.title} className={index % 2 ? 'is-flip' : ''} data-reveal>
        <Frame photo={pillarPhotos[index]} alt={pillar.title} />
        <div className="abt-pillar-text abt-rise"><span className="abt-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{pillar.title}</h3><p>{'text' in pillar ? pillar.text : ecosystem.body}</p><Link className="abt-link" href={`/${lang}/${pillar.link}`}>{pillar.cta}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      </li>)}</ol>
    </section>

    {buildings.length > 0 && <section className="abt-section abt-port" aria-labelledby="abt-port-title">
      <div className="abt-top" data-reveal><span className="abt-small">{portfolioLead.title}</span><Staggered lines={w.portHead} id="abt-port-title" /></div>
      <p className="abt-lead">{portfolioLead.body}</p>
      {buildings.map((building, index) => {
        const photos = buildingPhotos(building).slice(0, 6);
        const status = buildingStatusLabel(building.status, building.openMonth, lang) || w.open;
        const count = buildingRoomCount(building);
        return <article className="abt-project" key={building.id} data-reveal>
          <header className="abt-rise"><span className="abt-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{propertyName(building.name)}</h3>
            <dl><div><dt>{w.area}</dt><dd>{building.address}</dd></div>{count > 0 && <div><dt>{w.rooms}</dt><dd>{count} {w.roomsUnit}</dd></div>}<div><dt>{w.status}</dt><dd>{status}</dd></div></dl>
            <Link className="abt-link" href={`/${lang}/buildings/${building.id}`}>{w.view}<ArrowUpRight size={15} aria-hidden="true" /></Link></header>
          {photos.length > 0 && <JustifiedPhotos photos={photos} label={propertyName(building.name)} target={230} />}
        </article>;
      })}
    </section>}

    <section className="abt-closing" aria-labelledby="abt-closing-title" data-reveal>
      {closing && <img src={closing.url} alt="" loading="lazy" {...imgSize(closing)} />}
      <div className="abt-hero-veil" />
      <div className="abt-closing-inner">
        <h2 id="abt-closing-title">{w.closing.split('\n').map((line, i) => <span key={i}>{line}</span>)}</h2>
        <a className="abt-phone" href={`tel:${CONTACT.phoneIntl}`}>{CONTACT.phoneDisplay}</a>
        <dl><div><dt>{w.hours}</dt><dd>{hoursText.body || w.hoursValue}</dd></div><div><dt>{w.address}</dt><dd>{contactAddress(lang)}</dd></div></dl>
        <Link className="abt-button" href={`/${lang}/contact`}>{w.cta}<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
  </div>;
}
