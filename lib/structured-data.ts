import { absoluteUrl, CONTACT, propertyName, SITE_NAME, siteUrl } from './site';

type Lang = 'vi' | 'en';
type Photo = { url: string };
type BuildingData = { id: string; name: string; description: string; address: string; latitude: number | null; longitude: number | null; images: Photo[] };
type RoomData = { id: string; name: string; description: string; monthlyPrice: number; areaSqm?: number; maxGuests?: number; beds?: number; images: Photo[] };

const clean = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 0)) as T;
const images = (photos: Photo[]) => photos.map(photo => absoluteUrl(photo.url)).filter((url): url is string => !!url).slice(0, 5);

/** JSON-LD for the page, or null when the public origin (SITE_URL) is unknown: structured data needs absolute URLs. */
export function structuredData(kind: 'home' | 'building' | 'room' | 'type', lang: Lang, data?: BuildingData | RoomData, building?: BuildingData, extra: { sameAs?: string[]; buildings?: Array<{ id: string; name: string }>; priceFrom?: number } = {}): object | null {
  const base = siteUrl();
  if (!base) return null;
  if (kind === 'home') return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LodgingBusiness', '@id': `${base}/#org`, name: SITE_NAME, url: base, logo: `${base}/drm-stay-logo.png`, image: `${base}/drm-stay-logo.png`,
        alternateName: CONTACT.businessProfileName, hasMap: CONTACT.googleMaps,
        telephone: CONTACT.phoneIntl, email: CONTACT.email, areaServed: 'Da Nang, Vietnam', sameAs: [...new Set([...(extra.sameAs || []), CONTACT.googleMaps])],
        description: lang === 'vi' ? 'Đơn vị tư vấn phát triển, thiết kế và vận hành bất động sản cho thuê tại Đà Nẵng.' : 'Consultancy for the development, design and operation of rental property in Da Nang.',
        knowsLanguage: ['vi', 'en', 'ja', 'ko', 'zh', 'ru'],
        ...(extra.priceFrom && extra.priceFrom > 0 ? { priceRange: lang === 'vi' ? `Từ ${new Intl.NumberFormat('vi-VN').format(extra.priceFrom)} VND/tháng` : `From ${new Intl.NumberFormat('en-US').format(extra.priceFrom)} VND/month`, currenciesAccepted: 'VND' } : {}),
        ...(extra.buildings?.length ? { owns: extra.buildings.map(item => ({ '@type': 'ApartmentComplex', name: propertyName(item.name), url: `${base}/${lang}/buildings/${item.id}` })) } : {}),
        address: { '@type': 'PostalAddress', streetAddress: CONTACT.street, addressLocality: CONTACT.city, addressRegion: CONTACT.district, addressCountry: 'VN' },
      },
      { '@type': 'WebSite', '@id': `${base}/#site`, name: SITE_NAME, url: `${base}/${lang}`, inLanguage: lang, publisher: { '@id': `${base}/#org` } },
    ],
  };
  if (kind === 'building' && data) {
    const b = data as BuildingData;
    return clean({
      '@context': 'https://schema.org', '@type': 'ApartmentComplex', name: propertyName(b.name), description: b.description, url: `${base}/${lang}/buildings/${b.id}`,
      image: images(b.images),
      address: b.address ? { '@type': 'PostalAddress', streetAddress: b.address, addressLocality: 'Da Nang', addressCountry: 'VN' } : undefined,
      geo: b.latitude !== null && b.longitude !== null ? { '@type': 'GeoCoordinates', latitude: b.latitude, longitude: b.longitude } : undefined,
    });
  }
  if ((kind === 'room' || kind === 'type') && data) {
    const r = data as RoomData;
    return clean({
      '@context': 'https://schema.org', '@type': 'Accommodation', name: r.name, description: r.description, url: `${base}/${lang}/${kind === 'type' ? 'types' : 'rooms'}/${r.id}`,
      image: images(r.images),
      floorSize: r.areaSqm ? { '@type': 'QuantitativeValue', value: r.areaSqm, unitCode: 'MTK' } : undefined,
      occupancy: r.maxGuests ? { '@type': 'QuantitativeValue', maxValue: r.maxGuests } : undefined,
      numberOfBedrooms: r.beds,
      containedInPlace: building ? { '@type': 'ApartmentComplex', name: propertyName(building.name), url: `${base}/${lang}/buildings/${building.id}` } : undefined,
      offers: r.monthlyPrice > 0 ? { '@type': 'Offer', price: r.monthlyPrice, priceCurrency: 'VND', url: `${base}/${lang}/${kind === 'type' ? 'types' : 'rooms'}/${r.id}` } : undefined,
    });
  }
  return null;
}

/** BreadcrumbList for a page: `items` run from the home page down to the page itself; `path` is the site path (e.g. `/vi/stays`). Null without SITE_URL. */
export function breadcrumbData(items: Array<{ name: string; path: string }>): object | null {
  const base = siteUrl();
  if (!base || !items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: `${base}${item.path}` })),
  };
}

/** FAQPage for questions shown on the page (Google and AI answers quote these). Null without SITE_URL or questions. */
export function faqData(items: Array<{ question: string; answer: string }>, lang: Lang): object | null {
  const base = siteUrl();
  const shown = items.filter(item => item.question.trim() && item.answer.trim());
  if (!base || !shown.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang,
    mainEntity: shown.map(item => ({ '@type': 'Question', name: item.question.trim(), acceptedAnswer: { '@type': 'Answer', text: item.answer.trim() } })),
  };
}

/** BlogPosting for a journal post, published by DRM Stays. Null without SITE_URL. */
export function articleData(post: { slug: string; lang: Lang; title: string; excerpt: string; publishedAt: string; updatedAt: string }, imageUrls: string[] = []): object | null {
  const base = siteUrl();
  if (!base) return null;
  const url = `${base}/${post.lang}/journal/${post.slug}`;
  return clean({
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.excerpt, inLanguage: post.lang,
    url, mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: post.publishedAt || undefined, dateModified: post.updatedAt || post.publishedAt || undefined,
    image: imageUrls.map(image => absoluteUrl(image)).filter(Boolean).slice(0, 5),
    author: { '@type': 'Organization', '@id': `${base}/#org`, name: SITE_NAME, url: base },
    publisher: { '@type': 'Organization', '@id': `${base}/#org`, name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${base}/drm-stay-logo.png` } },
  });
}

/** WebPage for a page whose "last changed" date comes from live data. Null without SITE_URL. */
export function webPageData(page: { name: string; description: string; path: string; dateModified?: string; lang: Lang }): object | null {
  const base = siteUrl();
  if (!base) return null;
  return clean({
    '@context': 'https://schema.org', '@type': 'WebPage', name: page.name, description: page.description, url: `${base}${page.path}`, inLanguage: 'en',
    dateModified: page.dateModified || undefined, isPartOf: { '@id': `${base}/#site` }, about: { '@id': `${base}/#org` },
  });
}
