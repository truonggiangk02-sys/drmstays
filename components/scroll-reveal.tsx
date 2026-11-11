'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Fades elements marked data-reveal in as they scroll into view. Anything already visible when the page
 * opens is shown at once, nothing is hidden without JavaScript, and people who prefer less motion get none.
 */
export function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!items.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const pending: HTMLElement[] = [];
    for (const item of items) {
      if (item.getBoundingClientRect().top < window.innerHeight * 0.92) item.classList.add('is-in');
      else pending.push(item);
    }
    document.documentElement.classList.add('reveal-ready');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    pending.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
