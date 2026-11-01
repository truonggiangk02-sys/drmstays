import { absoluteUrl, SITE_NAME, siteUrl } from './site';

type Lang = 'vi' | 'en';
type Photo = { url: string };
type BuildingData = { id: string; name: string; description: string; address: string; latitude: number | null; longitude: number | null; images: Photo[] };
type RoomData = { id: string; name: string; description: string; monthlyPrice: number; areaSqm?: number; maxGuests?: number; beds?: number; images: Photo[] };

const clean = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 0)) as T;
const images = (photos: Photo[]) => photos.map(photo => absoluteUrl(photo.url)).filter((url): url is string => !!url).slice(0, 5);

/** JSON-LD for the page, or null when the public origin (SITE_URL) is unknown: structured data needs absolute URLs. */
export function structuredData(kind: 'home' | 'building' | 'room', lang: Lang, data?: BuildingData | RoomData, building?: BuildingData): object | null {
  const base = siteUrl();
  if (!base) return null;
  if (kind === 'home') return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${base}/#org`, name: SITE_NAME, url: base, logo: `${base}/drm-stay-logo.png`, areaServed: 'Da Nang, Vietnam' },
      { '@type': 'WebSite', '@id': `${base}/#site`, name: SITE_NAME, url: `${base}/${lang}`, inLanguage: lang, publisher: { '@id': `${base}/#org` } },
    ],
  };
  if (kind === 'building' && data) {
    const b = data as BuildingData;
    return clean({
      '@context': 'https://schema.org', '@type': 'ApartmentComplex', name: b.name, description: b.description, url: `${base}/${lang}/buildings/${b.id}`,
      image: images(b.images),
      address: b.address ? { '@type': 'PostalAddress', streetAddress: b.address, addressLocality: 'Da Nang', addressCountry: 'VN' } : undefined,
      geo: b.latitude !== null && b.longitude !== null ? { '@type': 'GeoCoordinates', latitude: b.latitude, longitude: b.longitude } : undefined,
    });
  }
  if (kind === 'room' && data) {
    const r = data as RoomData;
    return clean({
      '@context': 'https://schema.org', '@type': 'Accommodation', name: r.name, description: r.description, url: `${base}/${lang}/rooms/${r.id}`,
      image: images(r.images),
      floorSize: r.areaSqm ? { '@type': 'QuantitativeValue', value: r.areaSqm, unitCode: 'MTK' } : undefined,
      occupancy: r.maxGuests ? { '@type': 'QuantitativeValue', maxValue: r.maxGuests } : undefined,
      numberOfBedrooms: r.beds,
      containedInPlace: building ? { '@type': 'ApartmentComplex', name: building.name, url: `${base}/${lang}/buildings/${building.id}` } : undefined,
      offers: r.monthlyPrice > 0 ? { '@type': 'Offer', price: r.monthlyPrice, priceCurrency: 'VND', url: `${base}/${lang}/rooms/${r.id}` } : undefined,
    });
  }
  return null;
}
