'use client';

import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A paragraph whose words light up one by one as it scrolls through the screen (the "Our story" effect). */
export function StoryText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(/\s+/).filter(Boolean);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reduced()) { element.style.setProperty('--p', '1'); return; }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const height = window.innerHeight;
      // 0 when the paragraph enters at the bottom of the screen, 1 when it reaches the upper third
      const progress = (height * 0.88 - rect.top) / (height * 0.88 - height * 0.32 + rect.height * 0.5);
      element.style.setProperty('--p', Math.min(1, Math.max(0, progress)).toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [text]);
  return <p ref={ref} className={`home-story-text ${className}`} aria-label={text}>
    {words.map((word, index) => <span key={index} aria-hidden="true" className="home-story-word" style={{ '--w': (index / Math.max(1, words.length - 1)).toFixed(3) } as React.CSSProperties}>{word} </span>)}
  </p>;
}

/** Swipeable row with arrow buttons; its children are the slides. */
export function Carousel({ children, label, prev, next }: { children: React.ReactNode; label: string; prev: string; next: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<{ start: boolean; end: boolean }>({ start: true, end: false });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => setEdge({ start: element.scrollLeft < 8, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 8 });
    update();
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { element.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);
  const go = (direction: 1 | -1) => {
    const element = track.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: reduced() ? 'auto' : 'smooth' });
  };
  return <div className="home-carousel" role="group" aria-label={label}>
    <div className="home-carousel-track" ref={track} tabIndex={0}>{children}</div>
    <div className="home-carousel-nav">
      <button type="button" aria-label={prev} disabled={edge.start} onClick={() => go(-1)}>←</button>
      <button type="button" aria-label={next} disabled={edge.end} onClick={() => go(1)}>→</button>
    </div>
  </div>;
}

/** Question-and-answer list; one answer is open at a time and opens with a smooth height change. */
export function FaqList({ items }: { items: Array<{ id: string; question: string; answer: string }> }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return <div className="home-faq-list">
    {items.map(item => {
      const isOpen = open === item.id;
      return <div key={item.id} className={`home-faq-item${isOpen ? ' is-open' : ''}`}>
        <h3><button type="button" aria-expanded={isOpen} aria-controls={`faq-${item.id}`} onClick={() => setOpen(isOpen ? null : item.id)}><span>{item.question}</span><i aria-hidden="true" /></button></h3>
        <div className="home-faq-panel" id={`faq-${item.id}`} role="region"><div><p>{item.answer}</p></div></div>
      </div>;
    })}
  </div>;
}


const initials = (name: string) => name.replace(/\(.*?\)/g, '').split(/[\s·,-]+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '★';

export type ReviewCard = { id: string; name: string; detail: string; source: string; date: string; note: string; stars: boolean; quote: string; image?: { url: string; alt: string; width?: number; height?: number } };

/** Photo cards, each with one guest review; swipe or use the arrows to see more. */
export function ReviewCards({ items, prev, next, more, less }: { items: ReviewCard[]; prev: string; next: string; more: string; less: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      const max = element.scrollWidth - element.clientWidth;
      setProgress(max > 0 ? element.scrollLeft / max : 1);
      setEdge({ start: element.scrollLeft < 8, end: element.scrollLeft >= max - 8 });
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { element.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [items.length]);
  const go = (direction: 1 | -1) => {
    const element = track.current;
    if (element) element.scrollBy({ left: direction * Math.min(element.clientWidth * 0.8, 460), behavior: reduced() ? 'auto' : 'smooth' });
  };
  return <div className="home-rcards">
    <div className="home-rcards-controls">
      <div className="home-rcards-bar" aria-hidden="true"><i style={{ width: `${Math.max(12, progress * 100)}%` }} /></div>
      <button type="button" aria-label={prev} disabled={edge.start} onClick={() => go(-1)}>←</button>
      <button type="button" aria-label={next} disabled={edge.end} onClick={() => go(1)}>→</button>
    </div>
    <div className="home-rcards-track" ref={track} tabIndex={0} role="group" aria-roledescription="carousel">
      {items.map(item => {
        const long = item.quote.length > 240, expanded = open === item.id;
        return <article key={item.id} className="home-rcard">
          <div className="home-rcard-photo">{item.image ? <img src={item.image.url} alt={item.image.alt} loading="lazy" {...(item.image.width && item.image.height ? { width: item.image.width, height: item.image.height } : {})} /> : <span aria-hidden="true">DRM Stays</span>}</div>
          <div className="home-rcard-body">
            {item.stars && <p className="home-rcard-stars" aria-label="5 out of 5 stars"><span aria-hidden="true">★★★★★</span>{item.date && <time>{item.date}</time>}</p>}
            <blockquote className={long && !expanded ? 'is-clamped' : undefined}>{item.quote}</blockquote>
            {long && <button type="button" className="home-rcard-more" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item.id)}>{expanded ? less : more}</button>}
            <div className="home-rcard-foot">
              <span className="home-rcard-avatar" aria-hidden="true">{initials(item.name)}</span>
              <div><strong>{item.name}</strong>{(item.detail || item.note) && <small>{[item.detail, item.note].filter(Boolean).join(' · ')}</small>}</div>
              {item.source && <em className={`home-rcard-source is-${item.source.toLowerCase()}`}>{item.source}</em>}
            </div>
          </div>
        </article>;
      })}
    </div>
  </div>;
}
