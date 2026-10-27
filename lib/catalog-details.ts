export type BuildingDetails = {
  descriptionVi: string; descriptionEn: string;
  propertyTypeVi: string; propertyTypeEn: string;
  areaSqm: number; floorCount: number;
  latitude: number | null; longitude: number | null; coordinateApproximate: boolean;
  amenitiesVi: string[]; amenitiesEn: string[];
  servicesVi: string[]; servicesEn: string[];
  rulesVi: string; rulesEn: string;
};

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
