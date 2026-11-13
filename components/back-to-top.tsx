'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Round button (bottom left) that appears after scrolling down a screen and takes the visitor back to the top. */
export function BackToTop({ lang }: { lang: 'vi' | 'en' }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const label = lang === 'vi' ? 'Về đầu trang' : 'Back to top';
  return <button type="button" className={`back-to-top${visible ? ' is-visible' : ''}`} aria-label={label} title={label} tabIndex={visible ? 0 : -1} onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}><ArrowUp size={22} aria-hidden="true" /></button>;
}
