'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { imgSize } from '@/lib/image-url';

export type GalleryItem = { url: string; alt: string; width?: number; height?: number; buildingId: string; building: string; label: string; href: string };

/** Photos labelled with their building and room, filtered by building, so a guest always knows what they are looking at. */
export function HomeGallery({ items, buildings, all, more, less }: { items: GalleryItem[]; buildings: Array<{ id: string; name: string }>; all: string; more: string; less: string }) {
  const [active, setActive] = useState('');
  const [expanded, setExpanded] = useState(false);
  const shown = items.filter(item => !active || item.buildingId === active);
  // Rows of four: show a count that fills the grid, so no photo sits alone on the last row.
  const fit = (count: number) => count >= 4 ? Math.floor(count / 4) * 4 : count;
  const visible = shown.slice(0, fit(expanded ? Math.min(shown.length, 36) : Math.min(shown.length, 8)));
  const visibleDefault = fit(Math.min(shown.length, 8));
  const choose = (id: string) => { setActive(id); setExpanded(false); };
  return <div className="hg">
    {buildings.length > 1 && <div className="hg-chips" role="group" aria-label={all}>
      <button type="button" aria-pressed={!active} className={!active ? 'is-on' : ''} onClick={() => choose('')}>{all}</button>
      {buildings.map(building => <button type="button" key={building.id} aria-pressed={active === building.id} className={active === building.id ? 'is-on' : ''} onClick={() => choose(building.id)}>{building.name}</button>)}
    </div>}
    <ul className="hg-grid">{visible.map((item, index) => <li key={item.url} style={{ '--i': index % 8 } as React.CSSProperties}>
      <Link href={item.href}>
        <img src={item.url} alt={`${item.building} · ${item.label}`} loading="lazy" {...imgSize(item)} />
        <span className="hg-cap"><span><strong>{item.label}</strong><small>{item.building}</small></span><ArrowUpRight size={16} aria-hidden="true" /></span>
      </Link>
    </li>)}</ul>
    {fit(Math.min(shown.length, 36)) > 8 && <button type="button" className="hg-more" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? less : `${more} (${fit(Math.min(shown.length, 36)) - visibleDefault})`}</button>}
  </div>;
}
