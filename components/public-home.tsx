import { imgSize } from '@/lib/image-url';
import { propertyName as displayName } from '@/lib/site';
import { buildingFromPrice, buildingPhotos } from '@/lib/building-media';
import type { HomeContent } from '@/lib/home-content';
import Link from 'next/link';
import type { ContentItem } from '@/lib/site-content';

type Photo = { url: string; alt: string; width?: number; height?: number };
type Building = {
  id: string;
  name: string;
  address: string;
  propertyType: string;
  images: Photo[];
  rooms: Array<{ monthlyPrice: number; images: Photo[] }>;
  types?: Array<{ images: Photo[]; priceFrom: number; rooms: unknown[] }>;
};


const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

export function PublicHome({ lang, buildings, journal, home }: { lang: 'vi' | 'en'; buildings: Building[]; journal: ContentItem[]; home: HomeContent }) {
  const t = home.text;
  const photos = [...new Map(buildings.flatMap(buildingPhotos).map(photo => [photo.url, photo])).values()];
  // The owner's own home page photos win; otherwise photos of the buildings are used.
  const heroPhoto = home.images['home-hero'][0] || photos[0];
  const introPhoto = home.images['home-intro'][0] || photos[2] || photos[1] || heroPhoto;
  const galleryPhotos = home.images['home-gallery'].length ? home.images['home-gallery'] : photos.slice(1, 5);
  const contactPhoto = home.images['home-contact'][0] || photos[2];

  return <div className="editorial-home">
    <section className={`editorial-hero${heroPhoto ? ' has-photo' : ''}`}>
      {heroPhoto && <img className="editorial-hero-image" src={heroPhoto.url} alt={heroPhoto.alt || 'DRM Stays'} fetchPriority="high" {...imgSize(heroPhoto)} />}
      <div className="editorial-hero-shade" aria-hidden="true" />
      <div className="editorial-hero-content"><span className="editorial-kicker">DRM STAYS <span aria-hidden="true">/</span> {lang === 'vi' ? 'ĐÀ NẴNG' : 'DA NANG'}</span><h1>{t.hero}</h1><p>{t.heroLead}</p><Link className="editorial-primary-link" href={`/${lang}/stays`}>{t.explore}<span aria-hidden="true">↗</span></Link></div>
      <div className="editorial-hero-foot"><span>YOUR STAY, OUR CARE</span><span>{lang === 'vi' ? 'TƯ VẤN · VẬN HÀNH · ĐÀ NẴNG' : 'CONSULTING · OPERATIONS · DA NANG'}</span></div>
    </section>

    <section className="editorial-intro structure-section" aria-labelledby="editorial-intro-title">
      <div className="editorial-intro-copy"><span className="editorial-section-label">{t.introLabel}</span><h2 id="editorial-intro-title">{t.introTitle}</h2><p>{t.introBody}</p><Link className="editorial-text-link" href={`/${lang}/about`}>{lang === 'vi' ? 'Về DRM Stays' : 'About DRM Stays'}<span aria-hidden="true">↗</span></Link> <Link className="editorial-text-link" href={`/${lang}/partners`}>{t.investors}<span aria-hidden="true">↗</span></Link></div>
      {introPhoto && <figure className="editorial-intro-photo"><img src={introPhoto.url} alt={introPhoto.alt || 'DRM Stays apartment'} loading="lazy" {...imgSize(introPhoto)} /><figcaption>DRM STAYS / DA NANG</figcaption></figure>}
    </section>

    <section className="editorial-details structure-section" aria-label={lang === 'vi' ? 'Dịch vụ của DRM Stays' : 'DRM Stays services'}>
      <div><span aria-hidden="true">⌂</span><h3>{t.detailOne}</h3><p>{t.detailOneBody}</p></div>
      <div><span aria-hidden="true">◎</span><h3>{t.detailTwo}</h3><p>{t.detailTwoBody}</p></div>
      <div><span aria-hidden="true">↗</span><h3>{t.detailThree}</h3><p>{t.detailThreeBody}</p></div>
    </section>

    <section className="editorial-collection structure-section" aria-labelledby="editorial-collection-title">
      <div className="editorial-section-head"><div><span className="editorial-section-label">DRM STAYS / COLLECTION</span><h2 id="editorial-collection-title">{t.collection}</h2></div><p>{t.collectionLead}</p></div>
      {buildings.length ? <div className="editorial-property-grid">{buildings.map((building) => {
        const photo = buildingPhotos(building)[0];
        const fromPrice = buildingFromPrice(building);
        return <Link className="editorial-property" href={`/${lang}/buildings/${building.id}`} key={building.id}>
          <div className="editorial-property-image">{photo ? <img src={photo.url} alt={photo.alt || building.name} loading="lazy" {...imgSize(photo)} /> : <div className="editorial-property-placeholder">DRM Stays</div>}<span className="editorial-property-arrow" aria-hidden="true">↗</span></div>
          <div className="editorial-property-meta"><div><h3>{displayName(building.name)}</h3><p>{building.address}</p></div><div className="editorial-property-facts"><span>{building.propertyType || `${(building.types?.length || 0) + building.rooms.length} ${t.rooms}`}</span>{fromPrice > 0 && <strong>{t.from} {money(fromPrice)} ₫ / {t.month}</strong>}</div></div>
        </Link>;
      })}</div> : <p>{lang === 'vi' ? 'Các tòa nhà đang được cập nhật.' : 'Buildings are being updated.'}</p>}
      <Link className="editorial-text-link" href={`/${lang}/stays`}>{lang === 'vi' ? 'Xem tất cả tòa nhà & phòng' : 'Explore all buildings & rooms'}<span aria-hidden="true">↗</span></Link>
    </section>

    {galleryPhotos.length >= 2 && <section className="editorial-gallery structure-section" aria-labelledby="editorial-gallery-title"><div className="editorial-section-head"><div><span className="editorial-section-label">DRM STAYS / GALLERY</span><h2 id="editorial-gallery-title">{t.gallery}</h2></div><p>{t.galleryLead}</p></div><div className="editorial-gallery-grid">{galleryPhotos.map((photo, index) => <img key={photo.url} className={`editorial-gallery-item editorial-gallery-item-${index + 1}`} src={photo.url} alt={photo.alt || `${t.gallery} ${index + 1}`} loading="lazy" {...imgSize(photo)} />)}</div></section>}

    {journal.length > 0 && <section className="editorial-journal structure-section" aria-labelledby="editorial-journal-title"><div className="editorial-section-head"><div><span className="editorial-section-label">{t.journalLabel}</span><h2 id="editorial-journal-title">{t.journalTitle}</h2></div><p>{t.journalLead}</p></div><div className="editorial-journal-grid">{journal.slice(0, 3).map((item, index) => <Link key={item.id} href={`/${lang}/journal/${item.id}`} className="editorial-journal-card"><span>{String(index + 1).padStart(2, '0')} / {t.journalTitle}</span><h3>{lang === 'vi' ? item.title_vi : item.title_en}</h3><p>{lang === 'vi' ? item.body_vi : item.body_en}</p><strong>{t.journalRead} <span aria-hidden="true">↗</span></strong></Link>)}</div><Link className="editorial-text-link" href={`/${lang}/journal`}>{t.journalAll}<span aria-hidden="true">↗</span></Link></section>}

    <section className="editorial-contact"><div><span className="editorial-section-label">DRM STAYS / CONTACT</span><h2>{t.contactTitle}</h2><p>{t.contactBody}</p><Link className="editorial-primary-link" href={`/${lang}/contact`}>{t.contact}<span aria-hidden="true">↗</span></Link></div>{contactPhoto && <img src={contactPhoto.url} alt={contactPhoto.alt || 'DRM Stays apartment'} loading="lazy" {...imgSize(contactPhoto)} />}</section>
  </div>;
}
