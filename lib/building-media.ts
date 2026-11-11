type Photo = { url: string; alt: string; width?: number; height?: number };
type MediaBuilding = {
  images: Photo[];
  rooms: Array<{ monthlyPrice: number; images: Photo[] }>;
  types?: Array<{ images: Photo[]; priceFrom: number; rooms: unknown[] }>;
};

/** Every photo that represents a building: its own, then its room types', then its individual rooms'. No repeats. */
export function buildingPhotos(building: MediaBuilding): Photo[] {
  const all = [...building.images, ...(building.types || []).flatMap(type => type.images), ...building.rooms.flatMap(room => room.images)];
  return [...new Map(all.map(photo => [photo.url, photo])).values()];
}

/** Lowest monthly price across room types and rooms ("from X"), or 0 when none is set. */
export function buildingFromPrice(building: MediaBuilding): number {
  const prices = [...(building.types || []).map(type => type.priceFrom), ...building.rooms.map(room => room.monthlyPrice)].filter(price => price > 0);
  return prices.length ? Math.min(...prices) : 0;
}

/** Rooms a guest can ask about: those under room types plus the ones shown on their own. */
export const buildingRoomCount = (building: MediaBuilding) => (building.types || []).reduce((sum, type) => sum + type.rooms.length, 0) + building.rooms.length;
