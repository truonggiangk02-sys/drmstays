import { env } from 'cloudflare:workers';
import { getStaydeskCatalog, type SourceBuilding } from './staydesk-catalog';

type BuildingProfile = {
  source_id: string;
  published: number;
  description: string;
  address: string;
  services: string;
};
type RoomProfile = {
  source_id: string;
  published: number;
  description: string;
  nightly_price: number;
  monthly_price: number;
  services: string;
};
type Image = { id: string; owner_type: string; owner_id: string; alt: string; position: number };

function parseServices(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function getPublicCatalog(checkIn?: string, checkOut?: string) {
  if (!env.DB) throw new Error('Catalog database is unavailable');
  const [source, buildingRows, roomRows, imageRows] = await Promise.all([
    getStaydeskCatalog(checkIn, checkOut),
    env.DB.prepare(
      'SELECT source_id, published, description, address, services FROM catalog_buildings',
    ).all<BuildingProfile>(),
    env.DB.prepare(
      'SELECT source_id, published, description, nightly_price, monthly_price, services FROM catalog_rooms',
    ).all<RoomProfile>(),
    env.DB.prepare(
      'SELECT id, owner_type, owner_id, alt, position FROM catalog_images ORDER BY position, id',
    ).all<Image>(),
  ]);
  const buildings = new Map((buildingRows.results || []).map((row) => [row.source_id, row]));
  const rooms = new Map((roomRows.results || []).map((row) => [row.source_id, row]));
  const images = new Map<string, Image[]>();
  for (const image of imageRows.results || []) {
    const key = `${image.owner_type}:${image.owner_id}`;
    const gallery = images.get(key) || [];
    gallery.push(image);
    images.set(key, gallery);
  }
  const gallery = (kind: 'building' | 'room', id: string) =>
    (images.get(`${kind}:${id}`) || []).map((image) => ({
      id: image.id,
      url: `/api/catalog-images/${image.id}`,
      alt: image.alt,
    }));
  const published = source.buildings.flatMap((building: SourceBuilding) => {
    const profile = buildings.get(building.id);
    if (!profile || profile.published !== 1) return [];
    return [
      {
        id: building.id,
        name: building.name,
        description: profile.description,
        address: profile.address,
        services: parseServices(profile.services),
        images: gallery('building', building.id),
        rooms: building.rooms.flatMap((room) => {
          const detail = rooms.get(room.id);
          if (!detail || detail.published !== 1) return [];
          return [
            {
              id: room.id,
              name: room.name,
              available: room.available,
              description: detail.description,
              nightlyPrice: detail.nightly_price,
              monthlyPrice: detail.monthly_price,
              services: parseServices(detail.services),
              images: gallery('room', room.id),
            },
          ];
        }),
      },
    ];
  });
  return { checkIn: source.checkIn, checkOut: source.checkOut, buildings: published };
}
