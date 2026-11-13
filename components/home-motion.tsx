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
