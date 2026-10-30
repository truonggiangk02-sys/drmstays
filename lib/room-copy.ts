import { detailList, detailNumber, detailText, parseDetails, type RoomDetails } from './catalog-details';

export type CopyOption = { id: string; label: string };
export type CopyValues = Record<string, string>;
type SavedRoom = { monthly_price: number; details_json: string };

// Fields that stay different from room to room, so they are never copied: the floor, and whether the room is shown.
export const NOT_COPIED = ['floor', 'published'] as const;

const number = (value: number) => value > 0 ? String(value) : '';
const lines = (value: unknown) => detailList(value).join('\n');

/** The editable details of a saved room, keyed by the admin form's field names. */
export function copyableValues(saved: SavedRoom): CopyValues {
  const d = parseDetails<RoomDetails>(saved.details_json);
  return {
    monthlyPrice: number(saved.monthly_price),
    typeVi: detailText(d.typeVi), typeEn: detailText(d.typeEn),
    areaSqm: number(detailNumber(d.areaSqm)), beds: number(detailNumber(d.beds)),
    bathrooms: number(detailNumber(d.bathrooms)), maxGuests: number(detailNumber(d.maxGuests)),
    descriptionVi: detailText(d.descriptionVi), descriptionEn: detailText(d.descriptionEn),
    furnitureVi: lines(d.furnitureVi), furnitureEn: lines(d.furnitureEn),
    amenitiesVi: lines(d.amenitiesVi), amenitiesEn: lines(d.amenitiesEn),
    depositVnd: number(detailNumber(d.depositVnd)), minStayMonths: number(detailNumber(d.minStayMonths)),
    serviceFeesVi: detailText(d.serviceFeesVi), serviceFeesEn: detailText(d.serviceFeesEn),
    rulesVi: detailText(d.rulesVi), rulesEn: detailText(d.rulesEn),
  };
}

/** Rooms that already have something worth copying, with the data and a picker label for each. */
export function buildCopySource(
  buildings: { name: string; rooms: { id: string; name: string }[] }[],
  saved: Map<string, SavedRoom>,
): { options: CopyOption[]; data: Record<string, CopyValues> } {
  const options: CopyOption[] = [];
  const data: Record<string, CopyValues> = {};
  for (const building of buildings) {
    for (const room of building.rooms) {
      const row = saved.get(room.id);
      if (!row) continue;
      const values = copyableValues(row);
      if (!Object.values(values).some(Boolean)) continue;
      data[room.id] = values;
      options.push({ id: room.id, label: `${building.name} · ${room.name}` });
    }
  }
  return { options, data };
}
