import { env } from 'cloudflare:workers';

export type SourceRoom = { id: string; name: string; available: boolean | null };
export type SourceBuilding = { id: string; name: string; rooms: SourceRoom[] };
export type SourceCatalog = {
  checkIn: string | null;
  checkOut: string | null;
  buildings: SourceBuilding[];
};

export async function getStaydeskCatalog(
  checkIn?: string,
  checkOut?: string,
): Promise<SourceCatalog> {
  const secret = env.STAYDESK_CATALOG_SECRET;
  if (!secret) throw new Error('Staydesk catalog secret is not configured');
  const base = env.STAYDESK_CATALOG_URL || 'https://staydesk-nine.vercel.app';
  const url = new URL('/api/public-catalog', base);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost')
    throw new Error('Staydesk catalog URL must use HTTPS');
  if (checkIn && checkOut) {
    url.searchParams.set('checkIn', checkIn);
    url.searchParams.set('checkOut', checkOut);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Staydesk catalog returned ${response.status}`);
  const catalog = (await response.json()) as SourceCatalog;
  if (!Array.isArray(catalog.buildings)) throw new Error('Invalid Staydesk catalog response');
  return catalog;
}
