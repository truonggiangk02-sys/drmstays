'use client';

import { useEffect } from 'react';
import { eventForLink, leadFormFor, locationOf } from '@/lib/analytics-events';

type Gtag = (command: 'event', name: string, params: Record<string, string | number>) => void;

function send(name: string, params: Record<string, string | number>) {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === 'function') gtag('event', name, { ...params, page_path: window.location.pathname, transport_type: 'beacon' });
}

/**
 * Sends GA4 events when a guest reaches out: clicks on WhatsApp, Messenger, Instagram, Zalo, Telegram, email, phone and
 * directions links ("click_..."), and a "generate_lead" when a request form comes back sent (?sent=1). Rendered only where
 * Google Analytics itself runs (the real site), so staging and the admin send nothing.
 */
export function AnalyticsEvents() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const found = eventForLink(link.getAttribute('href') || '');
      if (!found) return;
      const classes: string[] = [];
      for (let node: Element | null = link; node && classes.length < 12; node = node.parentElement) classes.push(String(node.className || ''));
      send(found.name, { channel: found.channel, link_location: locationOf(classes) });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  useEffect(() => {
    const form = leadFormFor(window.location.pathname, window.location.search);
    if (!form) return;
    // One lead per visit to this address: a reload of the "sent" page must not count it again.
    const key = `lead:${window.location.pathname}${window.location.search}`;
    try { if (window.sessionStorage.getItem(key)) return; window.sessionStorage.setItem(key, '1'); } catch { /* private mode: count it once anyway */ }
    send('generate_lead', { form_type: form, language: window.location.pathname.split('/')[1] || '' });
  }, []);

  return null;
}
