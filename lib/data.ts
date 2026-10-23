import { env } from "cloudflare:workers";
import { apartments, type Apartment } from "./apartments";

type Override = { id: number; name: string; building: string; price: number; monthly_price: number; usd_nightly: number; usd_monthly: number; description: string; active: number };
type Details = { id: number; amenities: string; sqm: number; beds: string; wifi: string; address: string; area: string; view: string; guests: number; available_units: number | null; is_custom: number };
type Image = { id: number; apartment_id: number; alt: string };
export async function getApartments(): Promise<Apartment[]> {
  if (!env.DB) throw new Error("Database unavailable");
  const [rows, details, images] = await Promise.all([
    env.DB.prepare("SELECT id, name, building, price, monthly_price, usd_nightly, usd_monthly, description, active FROM listing_overrides").all<Override>(),
    env.DB.prepare("SELECT id, amenities, sqm, beds, wifi, address, area, view, guests, available_units, is_custom FROM room_details").all<Details>(),
    env.DB.prepare("SELECT id, apartment_id, alt FROM room_images ORDER BY position, id").all<Image>(),
  ]);
  const overrides = new Map((rows.results || []).map(row => [row.id, row]));
  const detailMap = new Map((details.results || []).map(row => [row.id, row]));
  const base = apartments.map(apartment => {
    const row = overrides.get(apartment.id);
    const detail = detailMap.get(apartment.id);
    const gallery = (images.results || []).filter(image => image.apartment_id === apartment.id).map(image => ({ id: image.id, url: `/api/room-images/${image.id}`, alt: image.alt || apartment.name }));
    const buildingInfo = apartments.find(item => item.building === (row?.building || apartment.building)) || apartment;
    return {
      ...apartment,
      address: buildingInfo.address,
      area: buildingInfo.area,
      ...(row ? { name: row.name, building: row.building || apartment.building, price: row.price, monthlyPrice: row.monthly_price || apartment.monthlyPrice, usdNightly: row.usd_nightly || apartment.usdNightly, usdMonthly: row.usd_monthly || apartment.usdMonthly, description: row.description, active: row.active === 1 } : {}),
      ...(detail ? { amenities: JSON.parse(detail.amenities) as string[], sqm: detail.sqm, beds: detail.beds, wifi: detail.wifi, address: detail.address || buildingInfo.address, area: detail.area || buildingInfo.area, view: detail.view || apartment.view, guests: detail.guests || apartment.guests, availableUnits: detail.available_units ?? apartment.availableUnits } : {}),
      images: gallery,
      image: gallery[0]?.url || apartment.image,
      imageDescription: gallery[0]?.alt || apartment.imageDescription,
    };
  });
  const custom = (rows.results || []).filter(row => row.id > 3 && detailMap.get(row.id)?.is_custom === 1).map(row => {
    const detail = detailMap.get(row.id)!;
    const gallery = (images.results || []).filter(image => image.apartment_id === row.id).map(image => ({ id: image.id, url: `/api/room-images/${image.id}`, alt: image.alt || row.name }));
    return {
      id: row.id,
      slug: `room-${row.id}`,
      name: row.name,
      building: row.building,
      address: detail.address,
      area: detail.area,
      view: detail.view,
      guests: detail.guests,
      beds: detail.beds,
      sqm: detail.sqm,
      price: row.price,
      monthlyPrice: row.monthly_price,
      usdNightly: row.usd_nightly,
      usdMonthly: row.usd_monthly,
      image: gallery[0]?.url || "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=85",
      imageDescription: gallery[0]?.alt || "Illustrative serviced apartment interior; actual photos are coming soon",
      description: row.description,
      amenities: JSON.parse(detail.amenities) as string[],
      wifi: detail.wifi,
      images: gallery,
      active: row.active === 1,
      availableUnits: detail.available_units ?? 0,
    } satisfies Apartment;
  });
  return [...base, ...custom];
}
