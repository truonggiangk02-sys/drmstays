import type { RoomDetails } from './catalog-details';

/** The details a room type carries (everything about a room except its floor). */
export type TypeDetails = Omit<RoomDetails, 'floor' | 'typeVi' | 'typeEn'>;

export type TypeRoom = { id: string; name: string; floor: string; available: boolean | null; monthlyPrice: number };

/** A room's own price wins; 0 means "use the type's price". */
export const effectivePrice = (roomPrice: number, typePrice: number) => (roomPrice > 0 ? roomPrice : typePrice);

/** Lowest positive price among the rooms of a type ("from X"), or 0 when none is set. */
export function priceFrom(rooms: Pick<TypeRoom, 'monthlyPrice'>[]): number {
  const prices = rooms.map(room => room.monthlyPrice).filter(price => price > 0);
  return prices.length ? Math.min(...prices) : 0;
}

/** Rooms free for the chosen dates; null when Staydesk gave no availability for them. */
export function availableCount(rooms: Pick<TypeRoom, 'available'>[]): number | null {
  if (!rooms.length || rooms.some(room => room.available === null)) return null;
  return rooms.filter(room => room.available).length;
}

/** Natural order for room names ("2" before "10", "301" before "1205"). */
export const byRoomName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
