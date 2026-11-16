'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { imgSize } from '@/lib/image-url';

type Photo = { url: string; alt: string; width?: number; height?: number; label: string; href: string };
export type BentoSlide = { id: string; name: string; address: string; status: string; rooms: string; href: string; photos: Photo[] };

/** One building at a time as a grid of tiles (big photo, room photos, facts, controls); the tiles reappear one by one when you move on. */
export function HomeBento({ slides, labels }: { slides: BentoSlide[]; labels: { prev: string; next: string; open: string; counter: string } }) {
  const [index, setIndex] = useState(0);
  if (!slides.length) return null;
  const slide = slides[index];
  const go = (step: number) => setIndex(value => (value + step + slides.length) % slides.length);
  const photo = (n: number) => slide.photos[n % slide.photos.length];
  const tile = (n: number, className: string, i: number) => {
    const p = photo(n);
    return <Link className={`bento-photo ${className}`} href={p.href} style={{ '--i': i } as React.CSSProperties}>
      <img src={p.url} alt={`${slide.name} · ${p.label}`} loading={n === 0 ? 'eager' : 'lazy'} {...imgSize(p)} />
      <span className="bento-tag">{p.label}</span>
    </Link>;
  };
  return <div className={`bento is-theme-${index % 3}`} aria-roledescription="carousel" aria-label={labels.counter}>
    <div className="bento-grid" key={slide.id}>
      <Link className="bento-photo bento-main" href={slide.href} style={{ '--i': 0 } as React.CSSProperties}>
        <img src={photo(0).url} alt={`${slide.name}`} loading="eager" {...imgSize(photo(0))} />
        <span className="bento-title"><strong>{slide.name}</strong><small>{slide.address}</small></span>
      </Link>
      {tile(1, 'bento-a', 1)}
      {tile(2, 'bento-b', 2)}
      {tile(3, 'bento-c', 3)}
      {tile(4, 'bento-d', 4)}
      <div className="bento-info" style={{ '--i': 5 } as React.CSSProperties}>
        <span className="bento-status">{slide.status}</span>
        {slide.rooms && <p>{slide.rooms}</p>}
        <Link className="bento-open" href={slide.href}>{labels.open}<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      {tile(5, 'bento-e', 6)}
      {tile(6, 'bento-f', 7)}
      <div className="bento-controls" style={{ '--i': 8 } as React.CSSProperties}>
        <span aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
        <div>
          <button type="button" onClick={() => go(-1)} aria-label={labels.prev}><ArrowLeft size={18} aria-hidden="true" /></button>
          <button type="button" onClick={() => go(1)} aria-label={labels.next}><ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  </div>;
}
