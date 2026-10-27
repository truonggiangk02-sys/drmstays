import { env } from 'cloudflare:workers';
import { apartments } from './apartments';
import { demoBuildingIds, demoRoomIds, getStaydeskCatalog, type SourceBuilding } from './staydesk-catalog';
import { parseDetails, detailText, detailNumber, detailList, type BuildingDetails, type RoomDetails } from './catalog-details';

type BuildingRow = { source_id: string; published: number; description: string; address: string; services: string; details_json: string };
type RoomRow = { source_id: string; published: number; description: string; nightly_price: number; monthly_price: number; services: string; details_json: string };
type Image = { id: string; owner_type: string; owner_id: string; alt: string; position: number; category: string };
type Lang = 'vi' | 'en';

function legacyList(value: string): string[] {
  try { const parsed: unknown = JSON.parse(value); return detailList(parsed); } catch { return []; }
}
function pickText(local: unknown, other: unknown, legacy: string) { return detailText(local) || detailText(other) || legacy; }
function pickList(local: unknown, other: unknown, legacy: string[]) { return detailList(local).length ? detailList(local) : detailList(other).length ? detailList(other) : legacy; }
const demoMapPoints = new Map([
  [demoBuildingIds[0], { latitude: 16.0483457, longitude: 108.2434176 }], // Mai Thúc Lân street center; approximate.
  [demoBuildingIds[1], { latitude: 16.0504252, longitude: 108.2396042 }], // Kiệt 234 Đỗ Bá; approximate.
]);

export async function getPublicCatalog(checkIn?: string, checkOut?: string, lang: Lang = 'en') {
  if (!env.DB) throw new Error('Catalog database is unavailable');
  const [source, buildingRows, roomRows, imageRows] = await Promise.all([
    getStaydeskCatalog(checkIn, checkOut),
    env.DB.prepare('SELECT source_id, published, description, address, services, details_json FROM catalog_buildings').all<BuildingRow>(),
    env.DB.prepare('SELECT source_id, published, description, nightly_price, monthly_price, services, details_json FROM catalog_rooms').all<RoomRow>(),
    env.DB.prepare('SELECT id, owner_type, owner_id, alt, position, category FROM catalog_images ORDER BY position, id').all<Image>(),
  ]);
  const buildings = new Map((buildingRows.results || []).map(row => [row.source_id, row]));
  const rooms = new Map((roomRows.results || []).map(row => [row.source_id, row]));
  const images = new Map<string, Image[]>();
  for (const image of imageRows.results || []) {
    const key = `${image.owner_type}:${image.owner_id}`;
    images.set(key, [...(images.get(key) || []), image]);
  }
  const gallery = (kind: 'building' | 'room', id: string, category: string) => (images.get(`${kind}:${id}`) || [])
    .filter(image => image.category === category)
    .map(image => ({ id: image.id, url: `/api/catalog-images/${image.id}`, alt: image.alt }));
  const published = source.buildings.flatMap((building: SourceBuilding) => {
    const firstSample = apartments.find(apartment => apartment.building === building.name);
    const profile = buildings.get(building.id) || (env.PREVIEW_DEMO === '1' && firstSample ? {
      source_id: building.id, published: 1, description: '', address: firstSample.address,
      services: '[]', details_json: JSON.stringify({
        descriptionVi: `Tòa nhà ${building.name} là một lựa chọn lưu trú mẫu tại Đà Nẵng. Thông tin và hình ảnh chính thức sẽ được cập nhật sau.`,
        descriptionEn: `${building.name} is a sample stay in Da Nang. Official details and photos will be added later.`,
        propertyTypeVi: 'Căn hộ dịch vụ', propertyTypeEn: 'Serviced apartments',
        amenitiesVi: ['Không gian sinh hoạt chung', 'Kết nối thuận tiện'],
        amenitiesEn: ['Shared spaces', 'Convenient access'],
      }),
    } : undefined);
    if (!profile || profile.published !== 1) return [];
    const detail = parseDetails<BuildingDetails>(profile.details_json);
    const hasCoordinates = typeof detail.latitude === 'number' && Number.isFinite(detail.latitude) && Math.abs(detail.latitude) <= 90 && typeof detail.longitude === 'number' && Number.isFinite(detail.longitude) && Math.abs(detail.longitude) <= 180;
    const demoPoint = env.PREVIEW_DEMO === '1' ? demoMapPoints.get(building.id) : undefined;
    const photoGallery = gallery('building', building.id, 'photo');
    const description = pickText(lang === 'vi' ? detail.descriptionVi : detail.descriptionEn, lang === 'vi' ? detail.descriptionEn : detail.descriptionVi, profile.description);
    return [{
      id: building.id, name: building.name, description, address: profile.address || firstSample?.address || '',
      latitude: hasCoordinates ? detail.latitude! : demoPoint?.latitude ?? null,
      longitude: hasCoordinates ? detail.longitude! : demoPoint?.longitude ?? null,
      coordinateApproximate: hasCoordinates ? detail.coordinateApproximate === true : !!demoPoint,
      propertyType: pickText(lang === 'vi' ? detail.propertyTypeVi : detail.propertyTypeEn, lang === 'vi' ? detail.propertyTypeEn : detail.propertyTypeVi, ''),
      areaSqm: detailNumber(detail.areaSqm), floorCount: detailNumber(detail.floorCount),
      amenities: pickList(lang === 'vi' ? detail.amenitiesVi : detail.amenitiesEn, lang === 'vi' ? detail.amenitiesEn : detail.amenitiesVi, []),
      services: pickList(lang === 'vi' ? detail.servicesVi : detail.servicesEn, lang === 'vi' ? detail.servicesEn : detail.servicesVi, legacyList(profile.services)),
      rules: pickText(lang === 'vi' ? detail.rulesVi : detail.rulesEn, lang === 'vi' ? detail.rulesEn : detail.rulesVi, ''),
      images: photoGallery.length ? photoGallery : env.PREVIEW_DEMO === '1' && firstSample ? [{ id: `demo-building-${building.id}`, url: firstSample.image, alt: firstSample.imageDescription }] : [],
      floorplans: gallery('building', building.id, 'floorplan'),
      rooms: building.rooms.flatMap(room => {
        const sample = apartments[demoRoomIds.indexOf(room.id)];
        const profile = rooms.get(room.id) || (env.PREVIEW_DEMO === '1' && sample ? {
          source_id: room.id, published: 1, description: sample.description, nightly_price: 0,
          monthly_price: sample.monthlyPrice, services: JSON.stringify(sample.amenities),
          details_json: JSON.stringify({
            descriptionVi: `Phòng mẫu tại ${building.name}, phù hợp cho khách muốn tìm nơi ở theo tháng tại Đà Nẵng.`,
            descriptionEn: sample.description, typeVi: sample.name.toLowerCase().includes('studio') ? 'Studio' : 'Căn hộ một phòng ngủ',
            typeEn: sample.name.toLowerCase().includes('studio') ? 'Studio' : 'One-bedroom apartment',
            areaSqm: sample.sqm, beds: 1, bathrooms: 1, maxGuests: sample.guests,
            amenitiesVi: ['Wi-Fi', 'Khu bếp', 'Máy giặt'], amenitiesEn: sample.amenities,
            furnitureVi: ['Giường', 'Tủ quần áo'], furnitureEn: ['Bed', 'Wardrobe'],
            depositVnd: sample.monthlyPrice, minStayMonths: 1,
          }),
        } : undefined);
        if (!profile || profile.published !== 1) return [];
        const detail = parseDetails<RoomDetails>(profile.details_json);
        const photos = gallery('room', room.id, 'photo');
        return [{
          id: room.id, name: room.name, available: room.available,
          description: pickText(lang === 'vi' ? detail.descriptionVi : detail.descriptionEn, lang === 'vi' ? detail.descriptionEn : detail.descriptionVi, profile.description),
          type: pickText(lang === 'vi' ? detail.typeVi : detail.typeEn, lang === 'vi' ? detail.typeEn : detail.typeVi, ''),
          floor: detailText(detail.floor), areaSqm: detailNumber(detail.areaSqm),
          beds: detailNumber(detail.beds), bathrooms: detailNumber(detail.bathrooms), maxGuests: detailNumber(detail.maxGuests),
          furniture: pickList(lang === 'vi' ? detail.furnitureVi : detail.furnitureEn, lang === 'vi' ? detail.furnitureEn : detail.furnitureVi, []),
          amenities: pickList(lang === 'vi' ? detail.amenitiesVi : detail.amenitiesEn, lang === 'vi' ? detail.amenitiesEn : detail.amenitiesVi, legacyList(profile.services)),
          services: pickList(lang === 'vi' ? detail.amenitiesVi : detail.amenitiesEn, lang === 'vi' ? detail.amenitiesEn : detail.amenitiesVi, legacyList(profile.services)),
          depositVnd: detailNumber(detail.depositVnd),
          serviceFees: pickText(lang === 'vi' ? detail.serviceFeesVi : detail.serviceFeesEn, lang === 'vi' ? detail.serviceFeesEn : detail.serviceFeesVi, ''),
          rules: pickText(lang === 'vi' ? detail.rulesVi : detail.rulesEn, lang === 'vi' ? detail.rulesEn : detail.rulesVi, ''),
          minStayMonths: detailNumber(detail.minStayMonths),
          nightlyPrice: 0, monthlyPrice: profile.monthly_price,
          images: photos.length ? photos : env.PREVIEW_DEMO === '1' && sample ? [{ id: `demo-room-${room.id}`, url: sample.image, alt: sample.imageDescription }] : [],
          floorplans: gallery('room', room.id, 'floorplan'),
        }];
      }),
    }];
  });
  return { checkIn: source.checkIn, checkOut: source.checkOut, buildings: published };
}
