'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** Remounts its children on every route change so the page eases in, and shows a thin progress bar while the next page loads. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loadingFor, setLoadingFor] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      setLoadingFor(window.location.pathname);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const loading = loadingFor !== null && loadingFor === pathname;
  return <>
    {loading && <div className="nav-progress" role="progressbar" aria-label="Loading" />}
    <div key={pathname} className="page-enter">{children}</div>
  </>;
}
