/**
 * Data for the monthly rent page, built from the live catalog so the prices on it can never disagree with
 * the room pages: nothing here is typed by hand except the wording.
 */
type Photo = { url: string };
type TypeLike = { id: string; name: string; areaSqm?: number; maxGuests?: number; beds?: number; priceFrom: number; depositVnd?: number; minStayMonths?: number; updatedAt?: string; rooms: unknown[] };
type RoomLike = { id: string; name: string; areaSqm?: number; maxGuests?: number; beds?: number; monthlyPrice: number; depositVnd?: number; minStayMonths?: number; updatedAt?: string; images?: Photo[] };
export type RentBuilding = { id: string; name: string; status?: string; address?: string; updatedAt?: string; types: TypeLike[]; rooms: RoomLike[] };

export type PriceRow = {
  buildingId: string; building: string; name: string; href: string; kind: 'studio' | 'one-bedroom' | 'other';
  areaSqm?: number; maxGuests?: number; priceFrom: number; depositVnd?: number; minStayMonths?: number;
};

/** What a room type or room is, from its name ("Studio 02", "1-bedroom apartment", "Căn hộ 1 PN", "Fusion Villa 3BR"). */
export function kindOf(name: string): PriceRow['kind'] {
  if (/\bstudio\b/i.test(name)) return 'studio';
  if (/(\b1|\bone)[\s-]*(bed|bedroom|br|pn)\b/i.test(name) || /\b1\s*phòng ngủ\b/i.test(name)) return 'one-bedroom';
  return 'other';
}

/** One row per room type and per room shown on its own, only in buildings that are open and only with a known price, cheapest first. */
export function priceRows(buildings: RentBuilding[], lang: 'vi' | 'en' = 'en'): PriceRow[] {
  const rows: PriceRow[] = [];
  for (const building of buildings) {
    if (building.status && building.status !== 'open') continue;
    for (const type of building.types) {
      if (type.priceFrom > 0) rows.push({ buildingId: building.id, building: building.name, name: type.name, href: `/${lang}/types/${type.id}`, kind: kindOf(type.name), areaSqm: type.areaSqm, maxGuests: type.maxGuests, priceFrom: type.priceFrom, depositVnd: type.depositVnd, minStayMonths: type.minStayMonths });
    }
    for (const room of building.rooms) {
      if (room.monthlyPrice > 0) rows.push({ buildingId: building.id, building: building.name, name: room.name, href: `/${lang}/rooms/${room.id}`, kind: kindOf(room.name), areaSqm: room.areaSqm, maxGuests: room.maxGuests, priceFrom: room.monthlyPrice, depositVnd: room.depositVnd, minStayMonths: room.minStayMonths });
    }
  }
  return rows.sort((a, b) => a.priceFrom - b.priceFrom || a.building.localeCompare(b.building) || a.name.localeCompare(b.name));
}

/** The lowest price of each kind and overall, for the opening answer. */
export function priceSummary(rows: PriceRow[]) {
  const lowest = (kind: PriceRow['kind']) => { const list = rows.filter(row => row.kind === kind); return list.length ? Math.min(...list.map(row => row.priceFrom)) : 0; };
  return { studio: lowest('studio'), oneBedroom: lowest('one-bedroom'), overall: rows.length ? Math.min(...rows.map(row => row.priceFrom)) : 0, highest: rows.length ? Math.max(...rows.map(row => row.priceFrom)) : 0, buildings: new Set(rows.map(row => row.buildingId)).size };
}

/** "11,000,000 VND" */
export const vnd = (value: number) => `${new Intl.NumberFormat('en-US').format(Math.round(value))} VND`;

/** "about USD 440" at the given rate (VND per USD), rounded to the nearest 10; "" when no valid rate is set. */
export function usd(value: number, rate: number): string {
  if (!(rate > 1000) || !(value > 0)) return '';
  return `about USD ${new Intl.NumberFormat('en-US').format(Math.round(value / rate / 10) * 10)}`;
}

/** A VND-per-USD rate from a setting such as "25400", or 0 when it is missing or not plausible. */
export function parseRate(value: string | undefined): number {
  const rate = Number(String(value || '').replace(/[,\s]/g, ''));
  return Number.isFinite(rate) && rate >= 10_000 && rate <= 100_000 ? rate : 0;
}

/** The latest day (YYYY-MM-DD) any price in these buildings was changed, or "" when unknown. */
export function lastChanged(buildings: RentBuilding[]): string {
  const days = buildings.flatMap(building => [building.updatedAt, ...building.types.map(type => type.updatedAt), ...building.rooms.map(room => room.updatedAt)])
    .map(value => /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ''))?.[1]).filter((day): day is string => !!day);
  return days.sort().at(-1) || '';
}

/** The answer in the first lines of the page (and the description Google shows): the real numbers, in one or two sentences. */
export function opening(rows: PriceRow[], rate: number): string {
  const summary = priceSummary(rows);
  if (!summary.overall) return 'Furnished apartments for monthly rent in Da Nang: see each building for current prices.';
  const price = (value: number) => `${vnd(value)}${usd(value, rate) ? ` (${usd(value, rate)})` : ''}`;
  const parts = [summary.studio && `furnished studios from ${price(summary.studio)}`, summary.oneBedroom && `one-bedroom apartments from ${price(summary.oneBedroom)}`].filter(Boolean);
  return `At DRM Stays in Da Nang, ${parts.length ? parts.join(' and ') : `monthly rent starts from ${price(summary.overall)}`} per month, furnished, with a one-month minimum stay.`;
}

/** The description Google shows for the page: the lowest real prices in about 150 characters. */
export function metaDescription(rows: PriceRow[], rate: number): string {
  const summary = priceSummary(rows);
  if (!summary.overall) return '';
  const price = (value: number) => `${vnd(value)}${usd(value, rate) ? ` (${usd(value, rate)})` : ''}`;
  const parts = [summary.studio && `studios from ${price(summary.studio)}`, summary.oneBedroom && `1-bedroom from ${price(summary.oneBedroom)}`].filter(Boolean);
  const head = parts.length ? `Furnished apartments in Da Nang: ${parts.join(', ')} per month.` : `Furnished apartments in Da Nang from ${price(summary.overall)} per month.`;
  const text = `${head} Deposit, electricity and what is included.`;
  return text.length <= 175 ? text : head;
}
