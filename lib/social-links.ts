import { env } from 'cloudflare:workers';
import { CONTACT } from './site';
import type { ContactChannels } from './contact-channels';

/** Social profiles the owner can add in the admin. Facebook is managed with the other contact channels. To add a network, add it here (no migration needed). */
export const socialNetworks = ['instagram', 'tiktok', 'youtube', 'linkedin'] as const;
export type SocialNetwork = typeof socialNetworks[number];
export type SocialLinks = Record<SocialNetwork, { url: string; published: boolean }>;
export type SocialLink = { name: string; url: string };

export const socialLabels: Record<SocialNetwork, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn' };
export const socialHints: Record<SocialNetwork, string> = {
  instagram: 'Link https://www.instagram.com/tên-tài-khoản',
  tiktok: 'Link https://www.tiktok.com/@tên-tài-khoản',
  youtube: 'Link kênh https://www.youtube.com/@tên-kênh',
  linkedin: 'Link trang https://www.linkedin.com/company/…',
};
const allowedHosts: Record<SocialNetwork, string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
  linkedin: ['linkedin.com', 'www.linkedin.com', 'vn.linkedin.com'],
};

export function emptySocialLinks(): SocialLinks {
  return { instagram: { url: '', published: false }, tiktok: { url: '', published: false }, youtube: { url: '', published: false }, linkedin: { url: '', published: false } };
}

/** '' for empty input, the cleaned https address when valid for that network, null when it is not. */
export function normalizeSocialUrl(network: SocialNetwork, value: string): string | null {
  const input = value.trim();
  if (!input) return '';
  if (input.length > 300) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (!allowedHosts[network].includes(url.hostname.toLowerCase()) || url.pathname === '/') return null;
    return url.toString();
  } catch { return null; }
}

export async function getSocialLinks(): Promise<SocialLinks> {
  const links = emptySocialLinks();
  if (!env.DB) return links;
  try {
    const rows = await env.DB.prepare('SELECT network, url, published FROM social_links').all<{ network: string; url: string; published: number }>();
    for (const row of rows.results || []) {
      if (!(socialNetworks as readonly string[]).includes(row.network)) continue;
      const network = row.network as SocialNetwork;
      const safeUrl = normalizeSocialUrl(network, row.url);
      if (safeUrl) links[network] = { url: safeUrl, published: row.published === 1 };
    }
  } catch (error) {
    // The social_links table comes with migration 0016; until it is applied the site simply shows no extra profiles.
    console.error('Social links unavailable', error instanceof Error ? error.name : 'unknown');
  }
  return links;
}

/**
 * The profiles to show to visitors and to list in structured data, in a fixed order. Facebook comes from the contact channels;
 * until the owner enters one there, the default page from CONTACT is used.
 */
export function publicSocialLinks(channels: ContactChannels, social: SocialLinks): SocialLink[] {
  const facebook = channels.facebook.url ? (channels.facebook.published ? channels.facebook.url : '') : CONTACT.facebook;
  return [
    ...(facebook ? [{ name: 'Facebook', url: facebook }] : []),
    ...socialNetworks.flatMap(network => social[network].published && social[network].url ? [{ name: socialLabels[network], url: social[network].url }] : []),
  ];
}
