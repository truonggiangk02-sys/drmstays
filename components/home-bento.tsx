'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { imgSize } from '@/lib/image-url';

type Photo = { url: string; alt: string; width?: number; height?: number; label: string; href: string };
export type BentoSlide = { id: string; name: string; address: string; status: string; rooms: string; href: string; photos: Photo[] };

/** One building at a time as a grid of tiles (big photo, room photos, facts, controls); the tiles reappear one by one when you move on. */
export function HomeBento({ slides, labels }: { slides: BentoSlide[]; labels: { prev: string; next: string; open: string; counter: string } }) {
  const [index, setIndex] = useState(0);
  // idle: nothing moves; hold: waiting to be scrolled into view; out: tiles leave; in: new tiles are drawn one by one.
  const [phase, setPhase] = useState<'idle' | 'hold' | 'out' | 'in'>('idle');
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => {
    const element = root.current;
    const list = timers.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    if (element.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    const frame = requestAnimationFrame(() => setPhase('hold'));
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      setPhase('in');
      list.push(window.setTimeout(() => setPhase('idle'), 1800));
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); list.forEach(window.clearTimeout); };
  }, []);
  if (!slides.length) return null;
  const slide = slides[index];
  const go = (step: number) => {
    if (phase === 'out' || phase === 'hold') return;
    const swap = () => setIndex(value => (value + step + slides.length) % slides.length);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { swap(); return; }
    timers.current.forEach(window.clearTimeout);
    setPhase('out');
    later(() => { swap(); setPhase('in'); }, 620);
    later(() => setPhase('idle'), 2400);
  };
  const photo = (n: number) => slide.photos[n % slide.photos.length];
  const tile = (n: number, className: string, i: number) => {
    const p = photo(n);
    return <Link className={`bento-photo ${className}`} href={p.href} style={{ '--i': i } as React.CSSProperties}>
      <img src={p.url} alt={`${slide.name} · ${p.label}`} loading={n === 0 ? 'eager' : 'lazy'} {...imgSize(p)} />
      <span className="bento-tag">{p.label}</span>
    </Link>;
  };
  return <div ref={root} className={`bento is-theme-${index % 3} is-${phase}`} aria-roledescription="carousel" aria-label={labels.counter}>
    <div className="bento-grid" key={slide.id}>
      <Link className="bento-photo bento-main" href={slide.href} style={{ '--i': 0 } as React.CSSProperties}>
        <img src={photo(0).url} alt={`${slide.name}`} loading="eager" {...imgSize(photo(0))} />
        <span className="bento-title"><strong>{slide.name}</strong><small>{slide.address}</small></span>
      </Link>
      {tile(1, 'bento-a', 2)}
      {tile(2, 'bento-b', 1)}
      {tile(3, 'bento-c', 4)}
      {tile(4, 'bento-d', 3)}
      <div className="bento-info" style={{ '--i': 5 } as React.CSSProperties}>
        <span className="bento-status">{slide.status}</span>
        {slide.rooms && <p>{slide.rooms}</p>}
        <Link className="bento-open" href={slide.href}>{labels.open}<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      {tile(5, 'bento-e', 7)}
      {tile(6, 'bento-f', 6)}
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
