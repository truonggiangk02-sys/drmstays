import { env } from 'cloudflare:workers';

export const channelNames = ['whatsapp', 'telegram', 'facebook', 'zalo'] as const;
export type ChannelName = typeof channelNames[number];
export type ContactChannels = Record<ChannelName, { url: string; published: boolean }>;

export function emptyContactChannels(): ContactChannels {
  return { whatsapp: { url: '', published: false }, telegram: { url: '', published: false }, facebook: { url: '', published: false }, zalo: { url: '', published: false } };
}

const allowedHosts: Record<Exclude<ChannelName, 'whatsapp'>, string[]> = {
  telegram: ['t.me', 'telegram.me'],
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'm.me', 'fb.me'],
  zalo: ['zalo.me', 'www.zalo.me', 'zaloapp.com'],
};

export function normalizeContactUrl(channel: ChannelName, value: string): string | null {
  const input = value.trim();
  if (!input) return '';
  if (input.length > 300) return null;
  if (channel === 'whatsapp' && /^\+?[\d\s().-]+$/.test(input)) {
    const digits = input.replace(/\D/g, '');
    const international = digits.startsWith('0') ? `84${digits.slice(1)}` : digits;
    return international.length >= 8 && international.length <= 15 ? `https://wa.me/${international}` : null;
  }
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const hosts = channel === 'whatsapp' ? ['wa.me'] : allowedHosts[channel];
    if (!hosts.includes(url.hostname.toLowerCase()) || url.pathname === '/') return null;
    if (channel === 'whatsapp' && !/^\/[0-9]{8,15}$/.test(url.pathname)) return null;
    return url.toString();
  } catch { return null; }
}

export async function getContactChannels(): Promise<ContactChannels> {
  const channels = emptyContactChannels();
  if (!env.DB) return channels;
  try {
    const rows = await env.DB.prepare('SELECT channel, url, published FROM contact_channels').all<{ channel: string; url: string; published: number }>();
    for (const row of rows.results || []) {
      if (!channelNames.includes(row.channel as ChannelName)) continue;
      const channel = row.channel as ChannelName;
      const safeUrl = normalizeContactUrl(channel, row.url);
      if (safeUrl) channels[channel] = { url: safeUrl, published: row.published === 1 };
    }
  } catch (error) {
    console.error('Contact channels unavailable', error instanceof Error ? error.name : 'unknown');
  }
  return channels;
}

/** A Facebook page or profile address turned into a Messenger chat link (https://m.me/...), so one tap opens the conversation. */
export function messengerUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'm.me') return parsed.toString();
    if (!['facebook.com', 'm.facebook.com', 'fb.me'].includes(host)) return url;
    const id = parsed.searchParams.get('id');
    if (parsed.pathname.replace(/\/+$/, '') === '/profile.php' && id && /^\d+$/.test(id)) return `https://m.me/${id}`;
    const first = parsed.pathname.split('/').filter(Boolean)[0];
    if (first && /^[A-Za-z0-9.\-_]+$/.test(first) && !['profile.php', 'pages', 'people', 'groups', 'share', 'sharer'].includes(first.toLowerCase())) return `https://m.me/${first}`;
  } catch { /* keep the original address */ }
  return url;
}

/** An Instagram profile address turned into the "send a message" link (https://ig.me/m/username). */
export function instagramMessageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'ig.me') return parsed.toString();
    if (host !== 'instagram.com') return url;
    const first = parsed.pathname.split('/').filter(Boolean)[0];
    if (first && /^[A-Za-z0-9._]+$/.test(first) && !['p', 'reel', 'reels', 'stories', 'explore', 'direct', 'accounts'].includes(first.toLowerCase())) return `https://ig.me/m/${first}`;
  } catch { /* keep the original address */ }
  return url;
}
