'use client';

import { useEffect, useRef, useState } from 'react';

/** Numbered stages that light up one after another as the visitor scrolls past them, joined by a line that fills. */
export function Lifecycle({ steps }: { steps: Array<{ title: string; body: string }> }) {
  const list = useRef<HTMLOListElement>(null);
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const frame = requestAnimationFrame(() => setLit(steps.length)); return () => cancelAnimationFrame(frame); }
    const update = () => {
      const items = [...element.children] as HTMLElement[];
      const line = window.innerHeight * 0.72;
      setLit(items.filter(item => item.getBoundingClientRect().top < line).length);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [steps.length]);
  return <ol className="inv-steps" ref={list} style={{ '--lit': Math.max(0, lit - 1) / Math.max(1, steps.length - 1), '--n': steps.length } as React.CSSProperties}>
    {steps.map((step, index) => <li key={index} className={index < lit ? 'is-lit' : ''}>
      <span className="inv-step-dot" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <h3>{step.title}</h3><p>{step.body}</p>
    </li>)}
  </ol>;
}

/** Two photos of the same building (3D render and finished) with a handle that reveals one over the other. */
export function BeforeAfter({ before, after, beforeLabel, afterLabel, alt, hint }: { before: string; after: string; beforeLabel: string; afterLabel: string; alt: string; hint: string }) {
  const [position, setPosition] = useState(50);
  return <div className="inv-compare" style={{ '--pos': `${position}%` } as React.CSSProperties}>
    <img className="inv-compare-after" src={after} alt={`${alt} — ${afterLabel}`} loading="lazy" />
    <img className="inv-compare-before" src={before} alt={`${alt} — ${beforeLabel}`} loading="lazy" />
    <span className="inv-compare-tag is-before">{beforeLabel}</span><span className="inv-compare-tag is-after">{afterLabel}</span>
    <span className="inv-compare-handle" aria-hidden="true" />
    <input type="range" min={0} max={100} value={position} onChange={event => setPosition(Number(event.target.value))} aria-label={hint} />
  </div>;
}
