'use client';

import { usePathname } from 'next/navigation';

/** Remounts its children on every route change so the page eases in instead of snapping. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname} className="page-enter">{children}</div>;
}
