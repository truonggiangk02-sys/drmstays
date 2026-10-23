"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

export function AdminRouteLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.location.assign(href);
  }
  return <Link href={href} className={className} prefetch={false} onClick={open}>{children}</Link>;
}
