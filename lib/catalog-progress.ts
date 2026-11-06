import type { BuildingDetails, RoomDetails } from './catalog-details';

export type Progress = { done: number; total: number; missing: string[] };

const filled = (value: unknown) => Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() !== '' : typeof value === 'number' ? value > 0 : false;

function measure(checks: [string, boolean][]): Progress {
  return { done: checks.filter(([, ok]) => ok).length, total: checks.length, missing: checks.filter(([, ok]) => !ok).map(([label]) => label) };
}

/** What is still missing before a building is worth showing to guests. */
export function buildingProgress(row: { address?: string } | undefined, detail: Partial<BuildingDetails>, photos: number): Progress {
  return measure([
    ['Địa chỉ', filled(row?.address)], ['Loại tòa nhà', filled(detail.propertyTypeVi) && filled(detail.propertyTypeEn)],
    ['Số tầng', filled(detail.floorCount)], ['Giới thiệu VI/EN', filled(detail.descriptionVi) && filled(detail.descriptionEn)],
    ['Tiện ích', filled(detail.amenitiesVi) && filled(detail.amenitiesEn)], ['Quy định', filled(detail.rulesVi) && filled(detail.rulesEn)],
    ['Toạ độ', typeof detail.latitude === 'number' && typeof detail.longitude === 'number'], ['Ảnh', photos > 0],
  ]);
}

/** Same for a room. */
export function roomProgress(row: { monthly_price?: number } | undefined, detail: Partial<RoomDetails>, photos: number): Progress {
  return measure([
    ['Giá tháng', filled(row?.monthly_price)], ['Loại phòng', filled(detail.typeVi) && filled(detail.typeEn)], ['Tầng', filled(detail.floor)],
    ['Diện tích', filled(detail.areaSqm)], ['Giường', filled(detail.beds)], ['WC', filled(detail.bathrooms)], ['Sức chứa', filled(detail.maxGuests)],
    ['Mô tả VI/EN', filled(detail.descriptionVi) && filled(detail.descriptionEn)], ['Nội thất', filled(detail.furnitureVi) && filled(detail.furnitureEn)],
    ['Ảnh', photos > 0],
  ]);
}

/** Rooms grouped by floor, floors in natural order ("2" before "10"), rooms without a floor last. */
export function groupByFloor<T extends { floor: string }>(rooms: T[]): Array<{ floor: string; rooms: T[] }> {
  const map = new Map<string, T[]>();
  for (const room of rooms) {
    const key = room.floor.trim();
    map.set(key, [...(map.get(key) || []), room]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })))
    .map(([floor, list]) => ({ floor, rooms: list }));
}
