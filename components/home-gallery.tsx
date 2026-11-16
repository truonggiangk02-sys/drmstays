'use client';
import { useState } from 'react';
import Link from 'next/link';
import { imgSize } from '@/lib/image-url';

export type GalleryItem = { url: string; alt: string; width?: number; height?: number; buildingId: string; building: string; label: string; href: string };

/** Photos labelled with their building and room, filtered by building, so a guest always knows what they are looking at. */
export function HomeGallery({ items, buildings, all, more, less }: { items: GalleryItem[]; buildings: Array<{ id: string; name: string }>; all: string; more: string; less: string }) {
  const [active, setActive] = useState('');
  const [expanded, setExpanded] = useState(false);
  const shown = items.filter(item => !active || item.buildingId === active);
  // One big photo plus rows of four: show a count that fills the grid, so no photo sits alone on the last row.
  const fit = (count: number) => count >= 5 ? 5 + 4 * Math.floor((count - 5) / 4) : count;
  const visible = shown.slice(0, fit(expanded ? Math.min(shown.length, 37) : Math.min(shown.length, 9)));
  const visibleDefault = fit(Math.min(shown.length, 9));
  const choose = (id: string) => { setActive(id); setExpanded(false); };
  return <div className="hg">
    {buildings.length > 1 && <div className="hg-chips" role="group" aria-label={all}>
      <button type="button" aria-pressed={!active} className={!active ? 'is-on' : ''} onClick={() => choose('')}>{all}</button>
      {buildings.map(building => <button type="button" key={building.id} aria-pressed={active === building.id} className={active === building.id ? 'is-on' : ''} onClick={() => choose(building.id)}>{building.name}</button>)}
    </div>}
    <ul className="hg-grid">{visible.map((item, index) => <li key={item.url} className={index === 0 ? 'is-lead' : ''}>
      <Link href={item.href}>
        <img src={item.url} alt={`${item.building} · ${item.label}`} loading="lazy" {...imgSize(item)} />
        <span className="hg-cap"><strong>{item.building}</strong><small>{item.label}</small></span>
      </Link>
    </li>)}</ul>
    {fit(Math.min(shown.length, 37)) > 9 && <button type="button" className="hg-more" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? less : `${more} (${fit(Math.min(shown.length, 37)) - visibleDefault})`}</button>}
  </div>;
}
