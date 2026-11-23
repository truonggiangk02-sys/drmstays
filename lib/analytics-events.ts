/**
 * GA4 events for the actions that matter to a rental business: a guest reaches out. The page code (components/analytics-events.tsx)
 * sends them; this file only decides WHICH event a link or page stands for, so it can be tested without a browser.
 */

export type LinkEvent = { name: string; channel: string };

/** The event for a link a guest clicked, or null when the link is not a way to contact DRM Stays. */
export function eventForLink(href: string, currentHost = ''): LinkEvent | null {
  const value = String(href || '').trim();
  if (/^mailto:/i.test(value)) return { name: 'click_email', channel: 'email' };
  if (/^tel:/i.test(value)) return { name: 'click_phone', channel: 'phone' };
  let url: URL;
  try { url = new URL(value, 'https://placeholder.invalid'); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'wa.me' || host === 'api.whatsapp.com' || host === 'whatsapp.com') return { name: 'click_whatsapp', channel: 'whatsapp' };
  if (host === 'm.me' || host === 'messenger.com') return { name: 'click_messenger', channel: 'messenger' };
  if (host === 'ig.me') return { name: 'click_instagram_dm', channel: 'instagram' };
  if (host === 'zalo.me' || host === 'chat.zalo.me') return { name: 'click_zalo', channel: 'zalo' };
  if (host === 't.me' || host === 'telegram.me') return { name: 'click_telegram', channel: 'telegram' };
  if (host === 'google.com' && /^\/maps\/dir\//.test(url.pathname)) return { name: 'click_directions', channel: 'google_maps' };
  void currentHost;
  return null;
}

/** Which form was just sent, judged from the page it returns to (?sent=1): the investor form lives on /partners, guest requests everywhere else. */
export function leadFormFor(pathname: string, search: string): 'partner_inquiry' | 'guest_inquiry' | null {
  if (!/(^|[?&])sent=1(&|$)/.test(search)) return null;
  return /^\/(vi|en)\/partners\/?$/.test(pathname) ? 'partner_inquiry' : 'guest_inquiry';
}

/** Where on the page the link sits: the floating contact buttons, the footer, the header, or the page content. */
export function locationOf(classNames: string[]): string {
  const all = classNames.join(' ');
  if (/\bqc-(dock|stack|round|main)\b/.test(all)) return 'floating_buttons';
  if (/structure-footer/.test(all)) return 'footer';
  if (/structure-header/.test(all)) return 'header';
  if (/structure-address|office-map/.test(all)) return 'contact_details';
  return 'content';
}
