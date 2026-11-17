'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { imgSize } from '@/lib/image-url';

type Photo = { url: string; alt: string; width?: number; height?: number };
export type BrowserType = { id: string; name: string; images: Photo[]; priceFrom: number; areaSqm: number; beds: number; maxGuests: number; roomCount: number; availableCount: number | null };
export type BrowserBuilding = { id: string; name: string; address: string; cover?: Photo; types: BrowserType[] };

const text = {
  vi: { building: 'Tòa nhà', kind: 'Kiểu phòng', all: 'Tất cả', from: 'Từ', month: 'tháng', guests: 'khách', beds: 'giường', free: 'còn phòng', none: 'hết phòng', viewBuilding: 'Xem tòa nhà', typesWord: 'loại phòng', empty: 'Chưa có loại phòng phù hợp.', other: 'Khác', studio: 'Studio', oneBed: '1 phòng ngủ', twoBed: '2 phòng ngủ' },
  en: { building: 'Building', kind: 'Room style', all: 'All', from: 'From', month: 'month', guests: 'guests', beds: 'beds', free: 'available', none: 'fully booked', viewBuilding: 'View building', typesWord: 'room types', empty: 'No matching room types yet.', other: 'Other', studio: 'Studio', oneBed: '1 bedroom', twoBed: '2 bedrooms' },
} as const;
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

/** Rough room style taken from the room type's name, for the filter. */
function kindOf(name: string): 'studio' | 'oneBed' | 'twoBed' | 'other' {
  if (/studio/i.test(name)) return 'studio';
  const bedrooms = /(\d)\s*(pn|phòng ngủ|bedroom|br)\b/i.exec(name);
  if (bedrooms) return bedrooms[1] === '1' ? 'oneBed' : bedrooms[1] === '2' ? 'twoBed' : 'other';
  return 'other';
}

export function RoomTypesBrowser({ lang, buildings, dateQuery }: { lang: 'vi' | 'en'; buildings: BrowserBuilding[]; dateQuery: string }) {
  const w = text[lang];
  const [buildingId, setBuildingId] = useState('');
  const [kind, setKind] = useState('');
  const kinds = [...new Set(buildings.flatMap(building => building.types.map(type => kindOf(type.name))))];
  const shown = buildings.filter(building => !buildingId || building.id === buildingId).map(building => ({ ...building, types: building.types.filter(type => !kind || kindOf(type.name) === kind) })).filter(building => building.types.length > 0);
  const kindLabel = (key: string) => key === 'studio' ? w.studio : key === 'oneBed' ? w.oneBed : key === 'twoBed' ? w.twoBed : w.other;

  return <div className="rt-browser">
    <div className="rt-filters">
      {buildings.length > 1 && <div className="rt-chips" role="group" aria-label={w.building}><span>{w.building}</span>
        <button type="button" aria-pressed={!buildingId} className={!buildingId ? 'is-on' : ''} onClick={() => setBuildingId('')}>{w.all}</button>
        {buildings.map(building => <button type="button" key={building.id} aria-pressed={buildingId === building.id} className={buildingId === building.id ? 'is-on' : ''} onClick={() => setBuildingId(building.id)}>{building.name}</button>)}
      </div>}
      {kinds.length > 1 && <div className="rt-chips" role="group" aria-label={w.kind}><span>{w.kind}</span>
        <button type="button" aria-pressed={!kind} className={!kind ? 'is-on' : ''} onClick={() => setKind('')}>{w.all}</button>
        {kinds.map(key => <button type="button" key={key} aria-pressed={kind === key} className={kind === key ? 'is-on' : ''} onClick={() => setKind(key)}>{kindLabel(key)}</button>)}
      </div>}
    </div>
    {shown.length === 0 && <p className="rt-empty">{w.empty}</p>}
    {shown.map((building, index) => <section className="rt-group" key={building.id} id={`building-${building.id}`} data-reveal>
      <header><span className="rt-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h2>{building.name}</h2><p>{building.address} · {building.types.length} {w.typesWord}</p><Link className="rt-building-link" href={`/${lang}/buildings/${building.id}${dateQuery}`}>{w.viewBuilding}<ArrowUpRight size={15} aria-hidden="true" /></Link></header>
      <div className={`rt-row${building.types.length > 4 ? ' is-scroll' : ''}${building.types.length > 3 ? ' is-scroll-md' : ''}`}>
        {building.types.map((type, i) => {
          const first = type.images[0], second = type.images[1];
          const facts = [type.areaSqm > 0 ? `${type.areaSqm} m²` : '', type.maxGuests > 0 ? `${type.maxGuests} ${w.guests}` : '', type.beds > 0 ? `${type.beds} ${w.beds}` : ''].filter(Boolean).join(' · ');
          return <Link className="rt-card" href={`/${lang}/types/${type.id}${dateQuery}`} key={type.id} style={{ '--i': i } as React.CSSProperties}>
            <span className="rt-media">
              {first ? <img src={first.url} alt={first.alt || type.name} loading="lazy" {...imgSize(first)} /> : <span className="rt-blank" aria-hidden="true" />}
              {second && <img className="rt-second" src={second.url} alt="" loading="lazy" {...imgSize(second)} />}
              {dateQuery && type.availableCount !== null && <span className={`rt-pill ${type.availableCount > 0 ? 'is-ok' : 'is-bad'}`}>{type.availableCount > 0 ? `${type.availableCount} ${w.free}` : w.none}</span>}
            </span>
            <span className="rt-name">{type.name}<ArrowUpRight size={15} aria-hidden="true" /></span>
            <span className="rt-meta">{type.priceFrom > 0 && <strong>{w.from} {money(type.priceFrom)} ₫ / {w.month}</strong>}{facts && <small>{facts}</small>}</span>
          </Link>;
        })}
      </div>
    </section>)}
  </div>;
}
