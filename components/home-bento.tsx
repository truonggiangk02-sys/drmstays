'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { imgSize } from '@/lib/image-url';

type Photo = { url: string; alt: string; width?: number; height?: number; label: string; href: string };
export type BentoSlide = { id: string; name: string; address: string; status: string; rooms: string; href: string; photos: Photo[] };

const MAX_TILES = 11;
const AUTOPLAY_MS = 7000;

/** One building at a time as a mosaic of photos; tabs and arrows above choose the building, and it moves on by itself until the visitor touches it. */
export function HomeBento({ slides, labels }: { slides: BentoSlide[]; labels: { prev: string; next: string; open: string; counter: string } }) {
  const [index, setIndex] = useState(0);
  // idle: nothing moves; hold: waiting to be scrolled into view; out: tiles leave; in: new tiles rise in.
  const [phase, setPhase] = useState<'idle' | 'hold' | 'out' | 'in'>('idle');
  const [visible, setVisible] = useState(false);
  const [auto, setAuto] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => {
    const element = root.current;
    const list = timers.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startsBelow = element.getBoundingClientRect().top >= window.innerHeight * 0.85;
    const frame = requestAnimationFrame(() => { if (!calm) { setAuto(true); if (startsBelow) setPhase('hold'); } });
    let revealed = !startsBelow || calm;
    const observer = new IntersectionObserver(entries => {
      const on = entries[0].isIntersecting;
      setVisible(on);
      if (on && !revealed) {
        revealed = true;
        setPhase('in');
        list.push(window.setTimeout(() => setPhase('idle'), 2000));
      }
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); list.forEach(window.clearTimeout); };
  }, []);

  if (!slides.length) return null;
  const slide = slides[index];

  const goTo = (target: number) => {
    if (target === index || phase === 'out' || phase === 'hold') return;
    const swap = () => setIndex(target);
    if (!auto) { swap(); return; }
    timers.current.forEach(window.clearTimeout);
    setPhase('out');
    later(() => { swap(); setPhase('in'); }, 520);
    later(() => setPhase('idle'), 2400);
  };
  const step = (by: number) => goTo((index + by + slides.length) % slides.length);

  // Tiles: the first photo is the big one; the rest fill the grid, with the last rows stretched so no gap is left.
  const photos = slide.photos.slice(0, MAX_TILES + 1);
  const rest = photos.slice(1);
  const tail = Math.max(0, rest.length - 4);
  const tailSpan = tail ? Math.floor(6 / tail) : 0;
  const placement = (n: number): React.CSSProperties | undefined => {
    // Few photos: let them fill the space beside the big one instead of leaving gaps.
    if (rest.length === 1) return { gridColumn: 'span 3', gridRow: 'span 2' };
    if (rest.length === 2) return { gridColumn: 'span 3' };
    if (rest.length === 3) return { gridColumn: `span ${n === 0 ? 3 : n === 1 ? 2 : 1}` };
    // The first and the fourth small photos are wide (two columns); the rows below are stretched to fill the width.
    if (n === 0 || n === 3) return { gridColumn: 'span 2' };
    if (n >= 4) { const k = n - 4; return { gridColumn: `span ${k === tail - 1 ? 6 - tailSpan * (tail - 1) : tailSpan}` }; }
    return undefined;
  };
  const rows = rest.length >= 5 ? 3 : 2;
  const playing = auto && visible && phase === 'idle' && slides.length > 1;

  return <div ref={root} className="bento-wrap" aria-roledescription="carousel" aria-label={labels.counter}>
    <div className="bento-bar">
      <div className="bento-tabs" role="tablist" aria-label={labels.counter}>
        {slides.map((item, i) => <button type="button" role="tab" aria-selected={i === index} key={item.id} className={i === index ? 'is-on' : ''} onClick={() => goTo(i)}>
          <small>{String(i + 1).padStart(2, '0')}</small><span>{item.name}</span>
          {i === index && playing && <i className="bento-progress" key={`${item.id}-${phase}`} style={{ animationDuration: `${AUTOPLAY_MS}ms` }} onAnimationEnd={() => step(1)} aria-hidden="true" />}
        </button>)}
      </div>
      {slides.length > 1 && <div className="bento-arrows">
        <button type="button" onClick={() => step(-1)} aria-label={labels.prev}><ArrowLeft size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => step(1)} aria-label={labels.next}><ArrowRight size={18} aria-hidden="true" /></button>
      </div>}
    </div>
    <div className={`bento is-theme-${index % 3} is-${phase}`}>
      <div className="bento-grid" key={slide.id} style={{ '--rows': rows } as React.CSSProperties}>
        <Link className="bento-photo bento-main" href={slide.href} style={{ '--i': 0 } as React.CSSProperties}>
          <img src={photos[0].url} alt={slide.name} loading="eager" {...imgSize(photos[0])} />
          <span className="bento-status">{slide.status}</span>
          <span className="bento-title"><strong>{slide.name}</strong><small>{slide.address}</small></span>
          <span className="bento-chip">{slide.rooms && <>{slide.rooms} · </>}{labels.open}<ArrowUpRight size={14} aria-hidden="true" /></span>
        </Link>
        {rest.map((photo, n) => <Link className="bento-photo" href={photo.href} key={photo.url} style={{ '--i': n + 1, ...placement(n) } as React.CSSProperties}>
          <img src={photo.url} alt={photo.label ? `${slide.name} · ${photo.label}` : slide.name} loading="lazy" {...imgSize(photo)} />
          {photo.label && <span className="bento-tag">{photo.label}</span>}
        </Link>)}
      </div>
    </div>
  </div>;
}
