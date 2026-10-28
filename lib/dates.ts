export function vietnamToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const MAX_STAY_NIGHTS = 365;

/** Strict YYYY-MM-DD check that rejects rollovers such as 2026-02-31. */
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Shared stay check for both inquiry forms: Vietnam-time "today", 1..MAX_STAY_NIGHTS nights, guests within capacity. */
export function validStay(stay: { checkIn: string; checkOut: string; guests: number; maxGuests: number }): boolean {
  const { checkIn, checkOut, guests, maxGuests } = stay;
  if (!validDate(checkIn) || !validDate(checkOut)) return false;
  if (checkIn < vietnamToday() || checkOut <= checkIn) return false;
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
  if (nights > MAX_STAY_NIGHTS) return false;
  return Number.isInteger(guests) && guests >= 1 && guests <= maxGuests;
}
