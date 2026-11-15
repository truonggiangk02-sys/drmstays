export type BuildingDetails = {
  descriptionVi: string; descriptionEn: string;
  propertyTypeVi: string; propertyTypeEn: string;
  areaSqm: number; floorCount: number;
  latitude: number | null; longitude: number | null; coordinateApproximate: boolean;
  amenitiesVi: string[]; amenitiesEn: string[];
  servicesVi: string[]; servicesEn: string[];
  rulesVi: string; rulesEn: string;
  /** Where the building is in its life: open (default), still being completed, or announced as coming soon. */
  status: BuildingStatus; openMonth: string; statusNoteVi: string; statusNoteEn: string;
};

export const buildingStatuses = ['open', 'building', 'soon'] as const;
export type BuildingStatus = typeof buildingStatuses[number];
export const detailStatus = (value: unknown): BuildingStatus => (buildingStatuses as readonly unknown[]).includes(value) ? value as BuildingStatus : 'open';
/** A "YYYY-MM" month (as an <input type="month"> sends it), or '' when missing or invalid. */
export const detailMonth = (value: unknown): string => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : '';

/** "tháng 3/2027" in Vietnamese, "March 2027" in English; '' for no month. */
export function formatOpenMonth(month: string, lang: 'vi' | 'en'): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return '';
  const monthNumber = Number(match[2]);
  if (lang === 'vi') return `tháng ${monthNumber}/${match[1]}`;
  return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][monthNumber - 1]} ${match[1]}`;
}

export function formCoordinates(form: FormData): { latitude: number | null; longitude: number | null } {
  const lat = String(form.get('latitude') || '').trim();
  const lon = String(form.get('longitude') || '').trim();
  if (!lat && !lon) return { latitude: null, longitude: null };
  if (!lat || !lon) throw new Error('Both coordinates are required');
  const latitude = Number(lat), longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('Invalid coordinates');
  return { latitude: Math.round(latitude * 1e7) / 1e7, longitude: Math.round(longitude * 1e7) / 1e7 };
}

export type RoomDetails = {
  descriptionVi: string; descriptionEn: string;
  typeVi: string; typeEn: string; floor: string;
  areaSqm: number; beds: number; bathrooms: number; maxGuests: number;
  furnitureVi: string[]; furnitureEn: string[];
  amenitiesVi: string[]; amenitiesEn: string[];
  depositVnd: number; serviceFeesVi: string; serviceFeesEn: string;
  rulesVi: string; rulesEn: string; minStayMonths: number;
};

export function parseDetails<T extends object>(value?: string): Partial<T> {
  try {
    const parsed: unknown = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Partial<T> : {};
  } catch { return {}; }
}

export function detailText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function detailNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function detailList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 40) : [];
}

export function formText(form: FormData, key: string, max = 3000) {
  return String(form.get(key) || '').trim().slice(0, max);
}

export function formNumber(form: FormData, key: string, max: number) {
  const value = Number(form.get(key) || 0);
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error(`Invalid ${key}`);
  return value;
}

export function formLines(form: FormData, key: string) {
  return [...new Set(formText(form, key, 5000).split(/\r?\n/).map(item => item.trim().slice(0, 120)).filter(Boolean))].slice(0, 40);
}

/**
 * Floor of a room named like its number: "301" is floor 3, "1205" is floor 12, "A-502" is floor 5.
 * Returns '' when the name has no such number (e.g. "Ocean Suite") so nothing is guessed.
 */
export function inferFloor(roomName: string): string {
  const digits = /(?:^|\D)(\d{3,4})\s*$/.exec(roomName.trim())?.[1];
  const floor = digits ? Number(digits.slice(0, -2)) : 0;
  return floor > 0 ? String(floor) : '';
}
