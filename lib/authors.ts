import { env } from 'cloudflare:workers';
import { catalogImageUrl } from './image-url';

/** A named author of journal posts (table authors, migration 0021). */
export type Author = { id: string; name: string; role: string; bio: string; photo_id: string; url: string; kind: 'person' | 'team' };
export const AUTHOR_KINDS = { person: 'Một người viết', team: 'Đội nhóm (ví dụ DRM Stays Marketing Team)' } as const;
export const isAuthorKind = (value: unknown): value is Author['kind'] => value === 'person' || value === 'team';

export const AUTHOR_LIMITS = { name: 80, role: 100, bio: 300, url: 300 } as const;

/** Every author, by name. An empty list before migration 0021 is applied. */
export async function getAuthors(): Promise<Author[]> {
  if (!env.DB) return [];
  try { return (await env.DB.prepare('SELECT id, name, role, bio, photo_id, url, kind FROM authors ORDER BY name COLLATE NOCASE').all<Author>()).results || []; }
  catch { return []; }
}

export const authorPhotoUrl = (author: Pick<Author, 'photo_id'>) => (author.photo_id ? catalogImageUrl(author.photo_id) : '');

/** Page address of the author when it is a web address; anything else (javascript:, empty) is dropped. */
export const authorLink = (url: string): string => (/^https:\/\/[^\s]+$/i.test(url.trim()) ? url.trim() : '');
