type Photo = { url: string; alt: string; width?: number; height?: number };
export type MediaBuilding = {
  images: Photo[];
  renders?: Photo[];
  progressPhotos?: Photo[];
  rooms: Array<{ monthlyPrice: number; images: Photo[] }>;
  types?: Array<{ images: Photo[]; priceFrom: number; rooms: unknown[] }>;
};

/** Every photo that represents a building: its own, then its room types', then its individual rooms'. No repeats. */
export function buildingPhotos(building: MediaBuilding): Photo[] {
  const all = [...building.images, ...(building.types || []).flatMap(type => type.images), ...building.rooms.flatMap(room => room.images)];
  const photos = all;
  return [...new Map(photos.map(photo => [photo.url, photo])).values()];
}

/**
 * Cover picture of a building for its own card or tab: a finished photo, or for a building still being completed its 3D render or
 * progress photo. Everything else on the site (reviews, services, galleries) uses buildingPhotos, which never includes those.
 */
export function buildingCover(building: MediaBuilding): Photo | undefined {
  return buildingPhotos(building)[0] || building.renders?.[0] || building.progressPhotos?.[0];
}

/** Lowest monthly price across room types and rooms ("from X"), or 0 when none is set. */
export function buildingFromPrice(building: MediaBuilding): number {
  const prices = [...(building.types || []).map(type => type.priceFrom), ...building.rooms.map(room => room.monthlyPrice)].filter(price => price > 0);
  return prices.length ? Math.min(...prices) : 0;
}

/** Rooms a guest can ask about: those under room types plus the ones shown on their own. */
export const buildingRoomCount = (building: MediaBuilding) => (building.types || []).reduce((sum, type) => sum + type.rooms.length, 0) + building.rooms.length;

/** Photos taken in turn from every building (first of each, then second of each...), so no single building fills a strip. */
export function mixedBuildingPhotos(buildings: MediaBuilding[]): Photo[] {
  const lists = buildings.map(buildingPhotos);
  const rounds = Math.max(0, ...lists.map(list => list.length));
  const all = Array.from({ length: rounds }, (_, round) => lists.map(list => list[round]).filter(Boolean)).flat();
  return [...new Map(all.map(photo => [photo.url, photo])).values()];
}
