import { env } from 'cloudflare:workers';

export type Landmark = {
  id: string;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  latitude: number;
  longitude: number;
  buildingIds: string[];
};

export type LandmarkRow = {
  id: string;
  name_vi: string;
  name_en: string;
  description_vi: string;
  description_en: string;
  latitude: number | null;
  longitude: number | null;
  building_ids_json: string;
  published: number;
  deleted: number;
  position: number;
};

export function parseBuildingIds(value: string): string[] {
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200) : [];
  } catch { return []; }
}

export async function getPublicLandmarks(): Promise<Landmark[]> {
  if (!env.DB) return [];
  const result = await env.DB.prepare('SELECT id, name_vi, name_en, description_vi, description_en, latitude, longitude, building_ids_json, published, deleted, position FROM landmarks WHERE published = 1 AND deleted = 0 AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY position, id').all<LandmarkRow>();
  return (result.results || []).filter(row => Number.isFinite(row.latitude) && Number.isFinite(row.longitude) && Math.abs(row.latitude!) <= 90 && Math.abs(row.longitude!) <= 180).map(row => ({
    id: row.id,
    nameVi: row.name_vi,
    nameEn: row.name_en || row.name_vi,
    descriptionVi: row.description_vi,
    descriptionEn: row.description_en || row.description_vi,
    latitude: row.latitude!, longitude: row.longitude!,
    buildingIds: parseBuildingIds(row.building_ids_json),
  }));
}
