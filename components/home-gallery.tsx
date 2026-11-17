'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { imgSize } from '@/lib/image-url';
import { AREA_LABELS, IMAGE_AREAS } from '@/lib/image-area';
import { useJustifiedRows } from '@/components/justified-photos';
import { photoRatio } from '@/lib/justified';

export type GalleryItem = { url: string; alt: string; width?: number; height?: number; buildingId: string; building: string; label: string; href: string; area?: string };

/** Photos labelled with their building and room, filtered by building, so a guest always knows what they are looking at. */
const renderCard = (item: GalleryItem, index: number) => <li key={item.url} style={{ '--i': index % 8, '--r': photoRatio(item) } as React.CSSProperties}>
      <Link href={item.href}>
        <img src={item.url} alt={item.label ? `${item.building} · ${item.label}` : item.building} loading="lazy" {...imgSize(item)} />
        {item.label && <span className="hg-cap"><span><strong>{item.label}</strong><small>{item.building}</small></span><ArrowUpRight size={16} aria-hidden="true" /></span>}
      </Link>
    </li>;

export function HomeGallery({ lang, items, buildings, all, more, less }: { lang: 'vi' | 'en'; items: GalleryItem[]; buildings: Array<{ id: string; name: string }>; all: string; more: string; less: string }) {
  const [active, setActive] = useState('');
  const [area, setArea] = useState('');
  const [expanded, setExpanded] = useState(false);
  const labels = AREA_LABELS[lang];
  const areas = IMAGE_AREAS.filter(key => items.some(item => item.area === key));
  const hasOther = areas.length > 0 && items.some(item => !item.area);
  const shown = items.filter(item => (!active || item.buildingId === active) && (!area || (area === 'other' ? !item.area : item.area === area)));
  const limit = expanded ? 40 : 10;
  const visible = shown.slice(0, limit);
  const visibleDefault = Math.min(shown.length, 10);
  const { ref, rows } = useJustifiedRows(visible.map(photoRatio), 250);
  const choose = (id: string) => { setActive(id); setExpanded(false); };
  const chooseArea = (key: string) => { setArea(key); setExpanded(false); };
  const name = lang === 'vi' ? { area: 'Khu vực', building: 'Tòa nhà' } : { area: 'Area', building: 'Building' };
  return <div className="hg">
    {areas.length > 0 && <div className="hg-chips" role="group" aria-label={name.area}><span className="hg-label">{name.area}</span>
      <button type="button" aria-pressed={!area} className={!area ? 'is-on' : ''} onClick={() => chooseArea('')}>{all}</button>
      {areas.map(key => <button type="button" key={key} aria-pressed={area === key} className={area === key ? 'is-on' : ''} onClick={() => chooseArea(key)}>{labels[key]}</button>)}
      {hasOther && <button type="button" aria-pressed={area === 'other'} className={area === 'other' ? 'is-on' : ''} onClick={() => chooseArea('other')}>{labels.other}</button>}
    </div>}
    {buildings.length > 1 && <div className="hg-chips" role="group" aria-label={name.building}>{areas.length > 0 && <span className="hg-label">{name.building}</span>}
      <button type="button" aria-pressed={!active} className={!active ? 'is-on' : ''} onClick={() => choose('')}>{all}</button>
      {buildings.map(building => <button type="button" key={building.id} aria-pressed={active === building.id} className={active === building.id ? 'is-on' : ''} onClick={() => choose(building.id)}>{building.name}</button>)}
    </div>}
    <div className="hg-grid" ref={ref}>
      {rows ? rows.map((row, r) => <ul className="hg-row" key={r}>{row.map(i => renderCard(visible[i], i))}</ul>) : <ul className="hg-row is-wrap">{visible.map((item, i) => renderCard(item, i))}</ul>}
    </div>
    {shown.length > 10 && <button type="button" className="hg-more" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? less : `${more} (${Math.min(shown.length, 40) - visibleDefault})`}</button>}
  </div>;
}
