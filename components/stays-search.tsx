'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { imgSize } from '@/lib/image-url';
import { kindOf } from '@/lib/room-kind';
import { StaysMap, type StaysPlace } from '@/components/stays-map';

type Photo = { url: string; alt: string; width?: number; height?: number };
/** One result: a room type (for example "Studio with desk" in building A) or a single room. */
export type StayItem = { key: string; href: string; name: string; buildingId: string; building: string; address: string; images: Photo[]; price: number; areaSqm: number; beds: number; guests: number; tags: string[]; count: number; free: number | null; kindText: string };
export type StaysBuildingPoint = { id: string; latitude: number | null; longitude: number | null; approximate: boolean };
export type UpcomingBuilding = { id: string; name: string; address: string; status: string; href: string; photo?: Photo };

const text = {
  vi: { building: 'Tòa nhà', kind: 'Kiểu phòng', all: 'Tất cả', sort: 'Sắp xếp', sortDefault: 'Gợi ý', showMap: 'Xem bản đồ', showList: 'Xem danh sách', sortUp: 'Giá thấp đến cao', sortDown: 'Giá cao đến thấp', onlyFree: 'Chỉ phòng còn trống', amenities: 'Tiện nghi cần có', guestsFilter: 'Số khách', guestsOpt: 'khách trở lên', showMoreTags: 'Xem thêm tiện nghi', fewerTags: 'Thu gọn', results: 'kết quả', from: 'Từ', month: 'tháng', guests: 'khách', beds: 'giường', free: 'còn phòng', none: 'hết phòng', rooms: 'phòng', noPrice: 'Liên hệ để biết giá', empty: 'Chưa có phòng phù hợp với bộ lọc này.', reset: 'Bỏ lọc', studio: 'Studio', oneBed: '1 phòng ngủ', twoBed: '2 phòng ngủ', other: 'Khác', soon: 'SẮP MỞ', soonTitle: 'Tòa nhà sắp mở', soonCta: 'Đăng ký nhận thông tin' },
  en: { building: 'Building', kind: 'Room style', all: 'All', sort: 'Sort', sortDefault: 'Suggested', showMap: 'Show map', showList: 'Show list', sortUp: 'Price, low to high', sortDown: 'Price, high to low', onlyFree: 'Available rooms only', amenities: 'Must-have amenities', guestsFilter: 'Guests', guestsOpt: 'guests or more', showMoreTags: 'More amenities', fewerTags: 'Show fewer', results: 'results', from: 'From', month: 'month', guests: 'guests', beds: 'beds', free: 'available', none: 'fully booked', rooms: 'rooms', noPrice: 'Contact us for the price', empty: 'No rooms match these filters yet.', reset: 'Clear filters', studio: 'Studio', oneBed: '1 bedroom', twoBed: '2 bedrooms', other: 'Other', soon: 'OPENING SOON', soonTitle: 'Buildings opening soon', soonCta: 'Register your interest' },
} as const;
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

/** The place to find a room: every room type and room of every building in one list, filtered by building, style, price and availability. */
export function StaysSearch({ lang, items, upcoming, hasDates, points, places }: { lang: 'vi' | 'en'; items: StayItem[]; upcoming: UpcomingBuilding[]; hasDates: boolean; points: StaysBuildingPoint[]; places: StaysPlace[] }) {
  const w = text[lang];
  const [buildingId, setBuildingId] = useState('');
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState('default');
  const [onlyFree, setOnlyFree] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [guests, setGuests] = useState(0);
  const [moreTags, setMoreTags] = useState(false);
  const [hoverId, setHoverId] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const buildings = [...new Map(items.map(item => [item.buildingId, item.building])).entries()];
  const kinds = [...new Set(items.map(item => kindOf(`${item.name} ${item.kindText}`)))];
  const kindLabel = (key: string) => key === 'studio' ? w.studio : key === 'oneBed' ? w.oneBed : key === 'twoBed' ? w.twoBed : w.other;
  // Amenity filters come from the data itself: the tags that rooms really list, most common first (compared ignoring case).
  const tagKey = (tag: string) => tag.trim().toLowerCase();
  const tagCount = new Map<string, { label: string; n: number }>();
  for (const item of items) for (const tag of new Set(item.tags.map(tagKey))) { if (!tag) continue; const entry = tagCount.get(tag) || { label: item.tags.find(own => tagKey(own) === tag)!.trim(), n: 0 }; entry.n += 1; tagCount.set(tag, entry); }
  const allTags = [...tagCount.entries()].sort((a, b) => b[1].n - a[1].n || a[1].label.localeCompare(b[1].label));
  const visibleTags = moreTags ? allTags : allTags.slice(0, 10);
  const maxGuests = Math.max(0, ...items.map(item => item.guests));
  const guestSteps = [2, 3, 4, 6].filter(n => n <= maxGuests);
  const togglePicked = (key: string) => setPicked(list => list.includes(key) ? list.filter(own => own !== key) : [...list, key]);
  const hasFreeInfo = hasDates && items.some(item => item.free !== null);
  const matches = (item: StayItem) => (!kind || kindOf(`${item.name} ${item.kindText}`) === kind) && (!onlyFree || item.free === null || item.free > 0) && (!guests || item.guests >= guests) && picked.every(key => item.tags.some(tag => tagKey(tag) === key));
  const matching = items.filter(matches);
  let shown = matching.filter(item => !buildingId || item.buildingId === buildingId);
  const pins = points.flatMap(point => { if (point.latitude === null || point.longitude === null) return []; const own = matching.filter(item => item.buildingId === point.id); if (!own.length) return []; const low = Math.min(...own.map(item => item.price || Infinity)); return [{ id: point.id, name: own[0].building, latitude: point.latitude, longitude: point.longitude, approximate: point.approximate, label: Number.isFinite(low) ? `${(low / 1_000_000).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 })}${lang === 'vi' ? 'tr' : 'M'}` : '' }]; });
  const pickBuilding = (id: string) => setBuildingId(current => current === id ? '' : id);
  if (sort === 'up') shown = [...shown].sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
  if (sort === 'down') shown = [...shown].sort((a, b) => b.price - a.price);
  const filtered = !!buildingId || !!kind || onlyFree || !!guests || picked.length > 0;
  const reset = () => { setBuildingId(''); setKind(''); setOnlyFree(false); setGuests(0); setPicked([]); };

  return <section className="stays-search rt structure-section" id="stays-search" aria-label={lang === 'vi' ? 'Tìm phòng' : 'Find a room'}>
    <div className="stays-filters">
      {buildings.length > 1 && <div className="rt-chips" role="group" aria-label={w.building}><span>{w.building}</span>
        <button type="button" aria-pressed={!buildingId} className={!buildingId ? 'is-on' : ''} onClick={() => setBuildingId('')}>{w.all}</button>
        {buildings.map(([id, name]) => <button type="button" key={id} aria-pressed={buildingId === id} className={buildingId === id ? 'is-on' : ''} onClick={() => setBuildingId(id)}>{name}</button>)}
      </div>}
      {kinds.length > 1 && <div className="rt-chips" role="group" aria-label={w.kind}><span>{w.kind}</span>
        <button type="button" aria-pressed={!kind} className={!kind ? 'is-on' : ''} onClick={() => setKind('')}>{w.all}</button>
        {kinds.map(key => <button type="button" key={key} aria-pressed={kind === key} className={kind === key ? 'is-on' : ''} onClick={() => setKind(key)}>{kindLabel(key)}</button>)}
      </div>}
      {guestSteps.length > 0 && <div className="rt-chips" role="group" aria-label={w.guestsFilter}><span>{w.guestsFilter}</span>
        <button type="button" aria-pressed={!guests} className={!guests ? 'is-on' : ''} onClick={() => setGuests(0)}>{w.all}</button>
        {guestSteps.map(n => <button type="button" key={n} aria-pressed={guests === n} className={guests === n ? 'is-on' : ''} onClick={() => setGuests(n)}>{n}+ {w.guestsOpt.split(' ')[0]}</button>)}
      </div>}
      {allTags.length > 0 && <div className="rt-chips stays-tags" role="group" aria-label={w.amenities}><span>{w.amenities}</span>
        {visibleTags.map(([key, tag]) => <button type="button" key={key} aria-pressed={picked.includes(key)} className={picked.includes(key) ? 'is-on' : ''} onClick={() => togglePicked(key)}>{tag.label}</button>)}
        {allTags.length > 10 && <button type="button" className="stays-more" onClick={() => setMoreTags(value => !value)}>{moreTags ? w.fewerTags : `${w.showMoreTags} (${allTags.length - 10})`}</button>}
      </div>}
      <div className="stays-bar">
        <p aria-live="polite"><strong>{shown.length}</strong> {w.results}</p>
        <div className="stays-bar-tools">
          {hasFreeInfo && <label className="stays-check"><input type="checkbox" checked={onlyFree} onChange={event => setOnlyFree(event.target.checked)} />{w.onlyFree}</label>}
          <label className="stays-sort">{w.sort}<select value={sort} onChange={event => setSort(event.target.value)}><option value="default">{w.sortDefault}</option><option value="up">{w.sortUp}</option><option value="down">{w.sortDown}</option></select></label>
        </div>
      </div>
    </div>

    <div className={`stays-split${mapOpen ? ' is-map' : ''}`}>
    <div className="stays-results">
    {shown.length === 0 ? <p className="rt-empty">{w.empty} {filtered && <button type="button" className="stays-reset" onClick={reset}>{w.reset}</button>}</p> : <ul className="stays-grid">{shown.map((item, index) => {
      const first = item.images[0], second = item.images[1];
      const facts = [item.areaSqm > 0 ? `${item.areaSqm} m²` : '', item.guests > 0 ? `${item.guests} ${w.guests}` : '', item.beds > 0 ? `${item.beds} ${w.beds}` : '', item.count > 1 ? `${item.count} ${w.rooms}` : ''].filter(Boolean).join(' · ');
      return <li key={item.key} style={{ '--i': index % 8 } as React.CSSProperties} onMouseEnter={() => setHoverId(item.buildingId)} onMouseLeave={() => setHoverId('')}><Link className="rt-card stays-card-item" href={item.href}>
        <span className="rt-media stays-media">
          {first ? <img src={first.url} alt={first.alt || item.name} loading="lazy" {...imgSize(first)} /> : <span className="rt-blank" aria-hidden="true" />}
          {second && <img className="rt-second" src={second.url} alt="" loading="lazy" {...imgSize(second)} />}
          {item.free !== null && hasDates && <span className={`rt-pill ${item.free > 0 ? 'is-ok' : 'is-bad'}`}>{item.free > 0 ? (item.count > 1 ? `${item.free} ${w.free}` : w.free) : w.none}</span>}
        </span>
        <span className="rt-name">{item.name}<ArrowUpRight size={15} aria-hidden="true" /></span>
        <span className="stays-where"><strong>{item.building}</strong><small>{item.address}</small></span>
        <span className="rt-meta">{item.price > 0 ? <strong>{w.from} {money(item.price)} ₫ / {w.month}</strong> : <strong>{w.noPrice}</strong>}{facts && <small>{facts}</small>}</span>
      </Link></li>;
    })}</ul>}
    </div>
    <aside className="stays-aside"><StaysMap lang={lang} pins={pins} places={places} activeId={buildingId} hoverId={hoverId} onPick={pickBuilding} /></aside>
    </div>
    <button type="button" className="stays-map-toggle" onClick={() => setMapOpen(value => !value)}>{mapOpen ? w.showList : w.showMap}</button>

    {upcoming.length > 0 && <div className="stays-soon">
      <h2>{w.soonTitle}</h2>
      <ul>{upcoming.map(building => <li key={building.id}><Link href={building.href}>
        {building.photo ? <img src={building.photo.url} alt="" loading="lazy" {...imgSize(building.photo)} /> : <span className="stays-soon-blank" aria-hidden="true" />}
        <span><small>{w.soon} · {building.status}</small><strong>{building.name}</strong><em>{building.address}</em></span>
        <span className="stays-soon-cta">{w.soonCta}<ArrowUpRight size={15} aria-hidden="true" /></span>
      </Link></li>)}</ul>
    </div>}
  </section>;
}
