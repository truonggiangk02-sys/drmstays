'use client';
import { useEffect, useState } from 'react';

/**
 * Loading screen of the home page, shown on the first visit of a session while the cover photo and fonts load.
 * The counter follows the real loading: it climbs towards 90, then finishes once the page is ready (never before 1 second, never
 * later than a few seconds), and the screen slides up. The inline script that switches it on also switches it off after 4.5 seconds,
 * so a visitor can never be stuck behind it.
 */
export function HomeLoader() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('home-loading')) return;
    const started = performance.now();
    let value = 0, raf = 0, leaving = false, timer = 0;
    const ready = () => {
      const photo = document.querySelector<HTMLImageElement>('.editorial-hero-image');
      return document.readyState === 'complete' && (!photo || photo.complete);
    };
    const tick = () => {
      const done = ready() && performance.now() - started > 1000;
      value += ((done ? 100 : 90) - value) * (done ? 0.18 : 0.035);
      if (done && value > 99.4) value = 100;
      setCount(Math.round(value));
      if (value >= 100 && !leaving) {
        leaving = true;
        root.classList.add('home-loader-leaving');
        timer = window.setTimeout(() => root.classList.remove('home-loading', 'home-loader-leaving'), 950);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(timer); };
  }, []);
  return <div className="home-loader" aria-hidden="true">
    <img src="/drm-stay-logo.png" alt="" width="110" height="110" />
    <span className="home-loader-line"><i style={{ transform: `scaleX(${count / 100})` }} /></span>
    <span className="home-loader-count">{count}</span>
  </div>;
}
