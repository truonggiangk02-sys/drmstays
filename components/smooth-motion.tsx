'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Site-wide motion: inertial (smooth) wheel scrolling on desktop, a header that tucks away while scrolling down,
 * and the scroll progress of the home hero (--hp, 0 at the top to 1 after one screen) that CSS turns into a shrink and fade.
 * Nothing runs for people who prefer reduced motion; touch devices keep their native scrolling.
 */
export function SmoothMotion() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>('.structure-header');
    const hero = document.querySelector<HTMLElement>('.editorial-hero');

    let target = window.scrollY, current = window.scrollY, raf = 0, smoothing = false;
    let lastY = window.scrollY;

    const frame = () => {
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.4) { current = target; smoothing = false; }
      window.scrollTo({ top: current, behavior: 'instant' as ScrollBehavior });
      if (smoothing) raf = requestAnimationFrame(frame); else raf = 0;
    };

    const insideScroller = (node: EventTarget | null) => {
      for (let element = node as HTMLElement | null; element && element !== document.body; element = element.parentElement) {
        if (element.tagName === 'DIALOG' || element.closest?.('dialog[open]')) return true;
        const style = getComputedStyle(element);
        const scrollable = /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
        if (scrollable) return true;
      }
      return false;
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (insideScroller(event.target)) return;
      event.preventDefault();
      const max = root.scrollHeight - window.innerHeight;
      if (!smoothing) current = window.scrollY;
      target = Math.max(0, Math.min(max, (smoothing ? target : window.scrollY) + event.deltaY * (event.deltaMode === 1 ? 32 : 1)));
      smoothing = true;
      if (!raf) raf = requestAnimationFrame(frame);
    };

    // Keyboard, scrollbar drags and anchor jumps move the page on their own; keep our target in step.
    const sync = () => { if (!smoothing) { target = current = window.scrollY; } };

    let ticking = false;
    const onScroll = () => {
      sync();
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        if (header) {
          if (y > 160 && y > lastY + 2) header.classList.add('is-tucked');
          else if (y <= 160 || y < lastY - 2) header.classList.remove('is-tucked');
        }
        lastY = y;
        if (hero) hero.style.setProperty('--hp', Math.min(1, Math.max(0, y / (hero.offsetHeight * 0.9))).toFixed(3));
      });
    };

    if (fine) window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      header?.classList.remove('is-tucked');
    };
  }, [pathname]);
  return null;
}

/** A number that counts up the first time it scrolls into view. */
export function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState(to);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    setValue(0);
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      const start = performance.now(), duration = 1400;
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        setValue(Math.round(to * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [to]);
  return <strong ref={ref}>{value}{suffix}</strong>;
}
