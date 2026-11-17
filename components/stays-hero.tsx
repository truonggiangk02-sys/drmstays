import { imgSize } from '@/lib/image-url';
import { DateRangeSearch } from '@/components/date-range-search';

type Photo = { url: string; alt: string; width?: number; height?: number };

/** Top of the "Buildings & rooms" page: the title with an accent line, a booking card, a few facts and a tall photo. */
export function StaysHero({ lang, title, checkIn, checkOut, photo, facts }: { lang: 'vi' | 'en'; title: string; checkIn?: string; checkOut?: string; photo?: Photo; facts: Array<{ value: string; label: string }> }) {
  const vi = lang === 'vi';
  // "Phòng cho thuê tại Đà Nẵng": the place goes on its own line, in italic and gold.
  const match = /^(.*?)\s+(tại|in)\s+(.+)$/i.exec(title);
  return <div className="rt"><section className="rt-hero stays-hero" aria-labelledby="stays-title">
    <div className="rt-hero-inner">
      <div className="rt-hero-text">
        <span className="rt-eyebrow">DRM STAYS / {vi ? 'TÒA NHÀ & PHÒNG' : 'BUILDINGS & ROOMS'}</span>
        <h1 id="stays-title">{match ? <><span>{match[1]}</span><em>{match[2]} {match[3]}</em></> : title}</h1>
        <p>{vi ? 'Chọn tòa, xem từng phòng, rồi đặt lịch xem trực tiếp cùng chúng tôi.' : 'Pick a building, see every room, then book a viewing with us.'}</p>
        <div className="stays-card"><DateRangeSearch lang={lang} checkIn={checkIn} checkOut={checkOut} /></div>
        {facts.length > 0 && <dl className="stays-facts">{facts.map(fact => <div key={fact.label}><dt>{fact.value}</dt><dd>{fact.label}</dd></div>)}</dl>}
      </div>
      {photo && <figure className="rt-hero-photo"><img src={photo.url} alt={photo.alt || ''} fetchPriority="high" {...imgSize(photo)} /></figure>}
    </div>
  </section></div>;
}
