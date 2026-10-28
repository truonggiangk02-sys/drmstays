import { env } from 'cloudflare:workers';
import { apartments } from './apartments';

export type SourceRoom = { id: string; name: string; available: boolean | null };
export type SourceBuilding = { id: string; name: string; rooms: SourceRoom[] };
export type SourceCatalog = {
  checkIn: string | null;
  checkOut: string | null;
  buildings: SourceBuilding[];
};

const buildingIds = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
];
const roomIds = [
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
];
export const demoRoomIds = roomIds;
export const demoBuildingIds = buildingIds;

export function demoStaydeskCatalog(): SourceCatalog {
  const names = [...new Set(apartments.map(apartment => apartment.building))];
  return {
    checkIn: null,
    checkOut: null,
    buildings: names.map((name, index) => ({
      id: buildingIds[index],
      name,
      rooms: apartments.flatMap((apartment, roomIndex) => apartment.building === name
        ? [{ id: roomIds[roomIndex], name: apartment.name, available: null }]
        : []),
    })),
  };
}

export async function getStaydeskCatalog(
  checkIn?: string,
  checkOut?: string,
): Promise<SourceCatalog> {
  if (env.PREVIEW_DEMO === '1') return demoStaydeskCatalog();
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
