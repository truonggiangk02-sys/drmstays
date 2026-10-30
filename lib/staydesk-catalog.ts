import { env } from 'cloudflare:workers';
import { apartments } from './apartments';
import { validDateRange, vietnamToday } from './dates';

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

// Public pages must not hit Staydesk's database on every visit: crawlers, traffic spikes and arbitrary
// date searches would all land on the internal system. Answers are kept briefly per isolate, concurrent
// misses share one request, and an older copy is served if Staydesk is down.
const FRESH_MS = 60_000;
const STALE_MS = 60 * 60_000;
const MAX_ENTRIES = 100;
/** Furthest check-in (days ahead) that is forwarded to Staydesk. */
const MAX_DAYS_AHEAD = 730;

type Entry = { catalog: SourceCatalog; at: number };
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<SourceCatalog>>();

/** Tests only. */
export function resetStaydeskCache() {
  store.clear();
  inflight.clear();
}

/**
 * Dates are forwarded only when they form a real stay: not in the past (Vietnam time), at most 365 nights,
 * and starting within MAX_DAYS_AHEAD days. Anything else is treated as "no dates" instead of reaching Staydesk.
 */
export function usableStayDates(checkIn?: string, checkOut?: string): { checkIn: string; checkOut: string } | null {
  if (!checkIn || !checkOut || !validDateRange(checkIn, checkOut)) return null;
  if (Date.parse(checkIn) > Date.parse(vietnamToday()) + MAX_DAYS_AHEAD * 86_400_000) return null;
  return { checkIn, checkOut };
}

function connection() {
  const secret = env.STAYDESK_CATALOG_SECRET;
  if (!secret) throw new Error('Staydesk catalog secret is not configured');
  const base = env.STAYDESK_CATALOG_URL || 'https://staydesk-nine.vercel.app';
  const url = new URL('/api/public-catalog', base);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost')
    throw new Error('Staydesk catalog URL must use HTTPS');
  return { secret, url };
}

async function requestCatalog(dates: { checkIn: string; checkOut: string } | null): Promise<SourceCatalog> {
  const { secret, url } = connection();
  if (dates) {
    url.searchParams.set('checkIn', dates.checkIn);
    url.searchParams.set('checkOut', dates.checkOut);
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

function remember(key: string, catalog: SourceCatalog) {
  store.delete(key);
  store.set(key, { catalog, at: Date.now() });
  while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value as string);
}

/**
 * Buildings, rooms and (with dates) availability from Staydesk.
 * `fresh: true` skips the cached copy and never falls back to one; the admin uses it so a room that was
 * just created in Staydesk shows up straight away.
 */
export async function getStaydeskCatalog(
  checkIn?: string,
  checkOut?: string,
  options: { fresh?: boolean } = {},
): Promise<SourceCatalog> {
  if (env.PREVIEW_DEMO === '1') return demoStaydeskCatalog();
  connection(); // a missing secret or bad URL is a setup error: report it, never hide it behind a cached copy
  const dates = usableStayDates(checkIn, checkOut);
  const key = dates ? `${dates.checkIn}|${dates.checkOut}` : '';
  const hit = store.get(key);
  if (!options.fresh && hit && Date.now() - hit.at < FRESH_MS) return hit.catalog;

  let pending = options.fresh ? undefined : inflight.get(key);
  if (!pending) {
    pending = requestCatalog(dates).then((catalog) => { remember(key, catalog); return catalog; });
    if (!options.fresh) {
      inflight.set(key, pending);
      const clear = () => { if (inflight.get(key) === pending) inflight.delete(key); };
      pending.then(clear, clear);
    }
  }
  try {
    return await pending;
  } catch (error) {
    if (!options.fresh && hit && Date.now() - hit.at < STALE_MS) {
      console.error('Staydesk catalog unavailable, serving a cached copy', error instanceof Error ? error.name : 'unknown error');
      return hit.catalog;
    }
    throw error;
  }
}

/** For admin pages and routes. */
export const getFreshStaydeskCatalog = () => getStaydeskCatalog(undefined, undefined, { fresh: true });
