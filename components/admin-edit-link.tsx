'use client';

import { usePathname } from 'next/navigation';
import { adminTargetFor } from '@/lib/admin-map';

/** Only rendered for a signed-in admin: a small round button on each public page that opens the editor for that page. */
export function AdminEditLink() {
  const target = adminTargetFor(usePathname() || '');
  if (!target) return null;
  return <a className="admin-edit-link" href={target.href} rel="nofollow" aria-label={target.label} title={target.label}>✎</a>;
}
