import { imgSize } from '@/lib/image-url';
import { propertyName as displayName } from '@/lib/site';
import { buildingFromPrice, buildingPhotos } from '@/lib/building-media';
import { buildingStatusLabel } from '@/lib/building-status';
import type { HomeContent } from '@/lib/home-content';
import Link from 'next/link';
import type { ContentItem } from '@/lib/site-content';
import { Carousel, FaqList, ReviewCards, StoryText, type ReviewCard } from '@/components/home-motion';
import type { ContentImage } from '@/lib/site-content';
import { CountUp } from '@/components/smooth-motion';
import { OfficeMap } from '@/components/office-map';
import { addonIcons, stayIcons } from '@/components/services-showcase';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { HomeGallery, type GalleryItem } from '@/components/home-gallery';

type Photo = { url: string; alt: string; width?: number; height?: number };
type Building = {
  id: string;
  name: string;
  address: string;
  propertyType: string;
  images: Photo[];
  rooms: Array<{ id?: string; name?: string; monthlyPrice: number; images: Photo[] }>;
  types?: Array<{ id?: string; name?: string; images: Photo[]; priceFrom: number; rooms: unknown[] }>;
  status?: 'open' | 'building' | 'soon';
  openMonth?: string;
};


const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

export type HomeRoomType = { id: string; name: string; building: string; image?: Photo; priceFrom: number; areaSqm: number; beds: number; maxGuests: number };

export function PublicHome({ lang, buildings, journal, home, roomTypes = [], services = [], faq = [], reviews = [], reviewImages = {} }: { lang: 'vi' | 'en'; buildings: Building[]; journal: ContentItem[]; home: HomeContent; roomTypes?: HomeRoomType[]; services?: ContentItem[]; faq?: ContentItem[]; reviews?: ContentItem[]; reviewImages?: Record<string, ContentImage[]> }) {
  const vi = lang === 'vi';
  const pick = (item: ContentItem) => ({ title: vi ? item.title_vi : item.title_en, body: vi ? item.body_vi : item.body_en });
  const t = home.text;
  const photos = [...new Map(buildings.flatMap(buildingPhotos).map(photo => [photo.url, photo])).values()];
  // Photos taken in turn from every building (first of each, then second of each...), so a strip never shows only one building.
  const perBuilding = buildings.map(buildingPhotos);
  const mixedPhotos = [...new Map(Array.from({ length: Math.max(0, ...perBuilding.map(list => list.length)) }, (_, round) => perBuilding.map(list => list[round]).filter(Boolean)).flat().map(photo => [photo.url, photo])).values()];
  // The owner's own home page photos win; otherwise photos of the buildings are used.
  const heroPhoto = home.images['home-hero'][0] || photos[0];
  const introPhoto = home.images['home-intro'][0] || photos[2] || photos[1] || heroPhoto;
  // Guest reviews are shown in their original (English) wording. Each card gets its own photo if one was uploaded in the admin,
  // otherwise a photo of the buildings, so a photo always sits beside the review.
  const reviewCards: ReviewCard[] = reviews.map((item, index) => {
    const parts = (item.title_en || item.title_vi).split(' · ');
    const sourcePart = parts.slice(1).find(part => /airbnb|google/i.test(part)) || '';
    const note = /\(([^)]*)\)/.exec(sourcePart)?.[1] || '';
    const date = sourcePart.replace(/\(.*?\)/g, '').replace(/^(airbnb|google review|google)[,\s]*/i, '').trim();
    const own = reviewImages[item.id]?.[0];
    const fallback = mixedPhotos.length ? mixedPhotos[index % mixedPhotos.length] : undefined;
    const image = own || fallback;
    return { id: item.id, name: parts[0], detail: parts.slice(1).filter(part => part !== sourcePart).join(' · '), source: /airbnb/i.test(sourcePart) ? 'Airbnb' : /google/i.test(sourcePart) ? 'Google' : '', date, note: note ? note.replace(/^./, c => c.toUpperCase()) : '', stars: item.id.startsWith('review-'), quote: item.body_en || item.body_vi, image: image ? { url: image.url, alt: image.alt || '', width: image.width, height: image.height } : undefined };
  });
  // Gallery: every photo knows its building and room type, so the guest sees what they are looking at.
  const galleryRaw: GalleryItem[] = buildings.flatMap(building => {
    const name = displayName(building.name);
    const base = { buildingId: building.id, building: name };
    return [
      ...building.images.map(photo => ({ ...photo, ...base, label: vi ? 'Không gian chung' : 'Common areas', href: `/${lang}/buildings/${building.id}` })),
      ...(building.types || []).flatMap(type => type.images.map(photo => ({ ...photo, ...base, label: type.name || (vi ? 'Loại phòng' : 'Room type'), href: type.id ? `/${lang}/types/${type.id}` : `/${lang}/buildings/${building.id}` }))),
      ...building.rooms.flatMap(room => room.images.map(photo => ({ ...photo, ...base, label: room.name || (vi ? 'Phòng' : 'Room'), href: room.id ? `/${lang}/rooms/${room.id}` : `/${lang}/buildings/${building.id}` }))),
    ];
  });
  const galleryByBuilding = buildings.map(building => galleryRaw.filter(item => item.buildingId === building.id));
  const galleryItems = [...new Map(Array.from({ length: Math.max(0, ...galleryByBuilding.map(list => list.length)) }, (_, round) => galleryByBuilding.map(list => list[round]).filter(Boolean)).flat().map(item => [item.url, item])).values()];
  const marqueePhotos = [...new Map([...(home.images['home-gallery'].length ? home.images['home-gallery'] : []), ...mixedPhotos].map(photo => [photo.url, photo])).values()].slice(0, 18);
  const contactPhoto = home.images['home-contact'][0] || photos[2];

  return <div className="editorial-home">
    <div className="editorial-hero-scroll">
    <section className={`editorial-hero${heroPhoto ? ' has-photo' : ''}`}>
      {heroPhoto && <img className="editorial-hero-image" src={heroPhoto.url} alt={heroPhoto.alt || 'DRM Stays'} fetchPriority="high" {...imgSize(heroPhoto)} />}
      <div className="editorial-hero-shade" aria-hidden="true" />
      <div className="editorial-hero-wordmark" aria-hidden="true">{Array.from('DRM Stays').map((letter, index) => <span key={index} style={{ '--k': index } as React.CSSProperties}>{letter === ' ' ? '\u00a0' : letter}</span>)}</div>
      <div className="editorial-hero-content"><span className="editorial-kicker">DRM STAYS <span aria-hidden="true">/</span> {lang === 'vi' ? 'ĐÀ NẴNG' : 'DA NANG'}</span><h1>{t.hero}</h1><p>{t.heroLead}</p><Link className="editorial-primary-link" href={`/${lang}/stays`}>{t.explore}<span aria-hidden="true">↗</span></Link></div>
      <div className="editorial-hero-foot"><span>YOUR STAY, OUR CARE</span><span>{lang === 'vi' ? 'CĂN HỘ CHO THUÊ · ĐÀ NẴNG' : 'APARTMENTS FOR RENT · DA NANG'}</span></div>
    </section>
    </div>

    <div className="home-marquee" aria-hidden="true"><div className="home-marquee-track">{Array.from({ length: 2 }, (_, copy) => <div key={copy}>{[vi ? 'Có sẵn nội thất' : 'Furnished rooms', vi ? 'Thuê ngắn và dài ngày' : 'Short and long stays', vi ? 'Khu An Thượng, Mỹ An' : 'An Thượng, Mỹ An area', vi ? 'Hỗ trợ 6 ngôn ngữ' : 'Support in 6 languages', vi ? 'Chi phí rõ ràng' : 'Clear costs'].map((word, index) => <span key={index}>{word}<i /></span>)}</div>)}</div></div>

    <section className="editorial-intro structure-section" aria-labelledby="editorial-intro-title">
      <div className="editorial-intro-copy"><span className="editorial-section-label">{t.introLabel}</span><h2 id="editorial-intro-title">{t.introTitle}</h2><StoryText text={t.introBody} /><Link className="editorial-text-link" href={`/${lang}/about`}>{lang === 'vi' ? 'Về DRM Stays' : 'About DRM Stays'}<span aria-hidden="true">↗</span></Link></div>
      {introPhoto && <figure className="editorial-intro-photo"><img src={introPhoto.url} alt={introPhoto.alt || 'DRM Stays apartment'} loading="lazy" {...imgSize(introPhoto)} /><figcaption>DRM STAYS / DA NANG</figcaption></figure>}
    </section>

    <section className="editorial-collection home-reveal structure-section" data-reveal aria-labelledby="editorial-collection-title">
      <div className="editorial-section-head"><div><span className="editorial-section-label">DRM STAYS / COLLECTION</span><h2 id="editorial-collection-title">{t.collection}</h2></div><p>{t.collectionLead}</p></div>
      {buildings.length ? <Carousel label={t.collection} prev={vi ? 'Trước' : 'Previous'} next={vi ? 'Sau' : 'Next'}>{buildings.map((building) => {
        const photo = buildingPhotos(building)[0];
        const fromPrice = buildingFromPrice(building);
        return <Link className="editorial-property" href={`/${lang}/buildings/${building.id}`} key={building.id}>
          <div className="editorial-property-image">{photo ? <img src={photo.url} alt={photo.alt || building.name} loading="lazy" {...imgSize(photo)} /> : <div className="editorial-property-placeholder">DRM Stays</div>}{buildingStatusLabel(building.status, building.openMonth, lang) && <span className={`status-badge is-${building.status}`}>{buildingStatusLabel(building.status, building.openMonth, lang)}</span>}<span className="editorial-property-arrow" aria-hidden="true">↗</span></div>
          <div className="editorial-property-meta"><div><h3>{displayName(building.name)}</h3><p>{building.address}</p></div><div className="editorial-property-facts"><span>{building.propertyType || `${(building.types?.length || 0) + building.rooms.length} ${t.rooms}`}</span>{fromPrice > 0 && <strong>{t.from} {money(fromPrice)} ₫ / {t.month}</strong>}</div></div>
        </Link>;
      })}</Carousel> : <p>{lang === 'vi' ? 'Các tòa nhà đang được cập nhật.' : 'Buildings are being updated.'}</p>}
      <Link className="editorial-text-link" href={`/${lang}/stays`}>{lang === 'vi' ? 'Xem tất cả tòa nhà & phòng' : 'Explore all buildings & rooms'}<span aria-hidden="true">↗</span></Link>
    </section>

    {roomTypes.length > 0 && <section className="home-roomtypes structure-section" aria-labelledby="home-roomtypes-title" data-reveal>
      <div className="editorial-section-head"><div><span className="editorial-section-label">DRM STAYS / ROOMS</span><h2 id="home-roomtypes-title">{vi ? 'Khám phá các loại phòng tiêu biểu' : 'Explore our featured rooms'}</h2></div><p>{vi ? 'Từ studio gọn gàng đến căn hộ một phòng ngủ: chọn kiểu phòng hợp với cách bạn sống.' : 'From compact studios to one-bedroom apartments: choose the room that fits how you live.'}</p></div>
      <Carousel label={vi ? 'Loại phòng tiêu biểu' : 'Featured room types'} prev={vi ? 'Trước' : 'Previous'} next={vi ? 'Sau' : 'Next'}>{roomTypes.map(type => <Link key={type.id} className="home-room-card" href={`/${lang}/types/${type.id}`}>
        <div className="home-room-photo">{type.image ? <img src={type.image.url} alt={type.image.alt || type.name} loading="lazy" {...imgSize(type.image)} /> : <div className="editorial-property-placeholder">DRM Stays</div>}</div>
        <h3>{type.name}</h3><p>{type.building}</p>
        <ul>{type.areaSqm > 0 && <li>{type.areaSqm} m²</li>}{type.beds > 0 && <li>{type.beds} {vi ? 'giường' : type.beds === 1 ? 'bed' : 'beds'}</li>}{type.maxGuests > 0 && <li>{type.maxGuests} {vi ? 'khách' : 'guests'}</li>}</ul>
        {type.priceFrom > 0 && <strong>{t.from} {money(type.priceFrom)} ₫ / {t.month}</strong>}
      </Link>)}</Carousel>
      <Link className="editorial-text-link" href={`/${lang}/room-types`}>{vi ? 'Xem tất cả loại phòng' : 'See all room types'}<span aria-hidden="true">↗</span></Link>
    </section>}

    {reviewCards.length > 0 && <section className="home-reviews structure-section" aria-labelledby="home-reviews-title" data-reveal>
      <div className="home-reviews-head"><span className="editorial-section-label">{vi ? 'KHÁCH HÀNG NÓI GÌ' : 'GUEST REVIEWS'}</span><h2 id="home-reviews-title">{vi ? 'Khách đã ở nói gì về chúng tôi' : 'What our guests are saying'}</h2><p>{vi ? 'Đánh giá thật từ Airbnb và Google Maps, giữ nguyên lời khách.' : 'Real reviews from Airbnb and Google Maps, in the guests’ own words.'}</p></div>
      <ReviewCards items={reviewCards} prev={vi ? 'Đánh giá trước' : 'Previous reviews'} next={vi ? 'Đánh giá tiếp' : 'Next reviews'} more="Read more" less="Show less" />
    </section>}

    <section className="editorial-details structure-section" aria-label={lang === 'vi' ? 'Vì sao thuê tại DRM Stays' : 'Why rent with DRM Stays'}>
      <div><span aria-hidden="true">⌂</span><h3>{t.detailOne}</h3><p>{t.detailOneBody}</p></div>
      <div><span aria-hidden="true">◎</span><h3>{t.detailTwo}</h3><p>{t.detailTwoBody}</p></div>
      <div><span aria-hidden="true">↗</span><h3>{t.detailThree}</h3><p>{t.detailThreeBody}</p></div>
    </section>

    <section className="inv-metrics home-numbers" aria-label={vi ? 'DRM Stays trong vài con số' : 'DRM Stays in numbers'} data-reveal>
      <div className="inv-metrics-inner structure-section">
        <dl className="inv-numbers">
          <div><dt><CountUp to={3} /></dt><dd>{vi ? 'năm vận hành bất động sản cho thuê' : 'years operating rental property'}</dd></div>
          <div><dt><CountUp to={10} suffix="+" /></dt><dd>{vi ? 'dự án đã tư vấn' : 'projects advised'}</dd></div>
          {buildings.filter(building => building.status === 'open').length > 0 && <div><dt><CountUp to={buildings.filter(building => building.status === 'open').length} /></dt><dd>{vi ? 'tòa nhà đang vận hành' : 'buildings in operation'}</dd></div>}
          <div><dt><CountUp to={6} /></dt><dd>{vi ? 'ngôn ngữ hỗ trợ khách' : 'languages supported'}</dd></div>
        </dl>
      </div>
    </section>

    {services.length > 0 && <section className="home-services svc-stay structure-section" aria-labelledby="home-services-title" data-reveal>
      <div className="svc-head"><span className="editorial-section-label">{vi ? 'DỊCH VỤ' : 'SERVICES'}</span><h2 id="home-services-title">{vi ? 'Mọi thứ bạn cần cho một kỳ lưu trú dễ chịu' : 'Everything for a comfortable stay'}</h2><p>{vi ? 'Chi phí rõ ràng, hỗ trợ nhiều ngôn ngữ, phòng có sẵn nội thất, cùng tour, vé và đưa đón sân bay khi bạn cần.' : 'Clear costs, multilingual support, furnished rooms, plus tours, tickets and airport transfers when you need them.'}</p></div>
      <div className="svc-stay-grid">{services.filter(item => item.position < 20).slice(0, 6).map((item, index) => {
        const photo = mixedPhotos[index % Math.max(1, mixedPhotos.length)];
        const Icon = stayIcons[index % stayIcons.length];
        return <article className="svc-card" key={item.id} style={{ '--i': index } as React.CSSProperties}>
          <div className="svc-card-photo">{photo ? <img src={photo.url} alt="" loading="lazy" {...imgSize(photo)} /> : <span aria-hidden="true" />}<i aria-hidden="true"><Icon size={20} /></i></div>
          <div className="svc-card-body"><small>{String(index + 1).padStart(2, '0')}</small><h3>{pick(item).title}</h3><p>{pick(item).body}</p></div>
        </article>;
      })}</div>
      {services.some(item => item.position >= 20) && <div className="home-addons" aria-label={vi ? 'Dịch vụ đi kèm' : 'Add-on services'}>
        <div className="home-addons-head"><strong>{vi ? 'Dịch vụ đi kèm' : 'Add-on services'}</strong><span>{vi ? 'Đặt thêm khi bạn cần, báo giá rõ ràng trước khi xác nhận.' : 'Add them when you need them, with a clear quote before you confirm.'}</span></div>
        <ul>{services.filter(item => item.position >= 20).map(item => { const Icon = addonIcons[item.id] || Sparkles; return <li key={item.id}><Link href={`/${lang}/services#addons`}><span className="home-addon-icon" aria-hidden="true"><Icon size={22} /></span><h3>{pick(item).title}</h3><p>{pick(item).body}</p><ArrowUpRight className="home-addon-arrow" size={18} aria-hidden="true" /></Link></li>; })}</ul>
      </div>}
      <Link className="editorial-text-link" href={`/${lang}/services`}>{vi ? 'Xem tất cả dịch vụ và chi phí' : 'See all services and costs'}<span aria-hidden="true">↗</span></Link>
    </section>}

    {galleryItems.length >= 2 && <section className="home-photos structure-section" aria-labelledby="home-photos-title" data-reveal>
      <div className="editorial-section-head"><div><span className="editorial-section-label">DRM STAYS / GALLERY</span><h2 id="home-photos-title">{t.gallery}</h2></div><p>{t.galleryLead}</p></div>
      <HomeGallery items={galleryItems} buildings={buildings.filter(building => galleryRaw.some(item => item.buildingId === building.id)).map(building => ({ id: building.id, name: displayName(building.name) }))} all={vi ? 'Tất cả' : 'All'} more={vi ? 'Xem thêm ảnh' : 'Show more photos'} less={vi ? 'Thu gọn' : 'Show less'} />
    </section>}

    {faq.length > 0 && <section className="home-faq structure-section" aria-labelledby="home-faq-title" data-reveal>
      <div><span className="editorial-section-label">FAQ</span><h2 id="home-faq-title">{vi ? 'Bạn có câu hỏi? Chúng tôi sẵn sàng giải đáp.' : 'Got questions? We are here to help.'}</h2><Link className="editorial-text-link" href={`/${lang}/faq`}>{vi ? 'Xem tất cả câu hỏi' : 'See all questions'}<span aria-hidden="true">↗</span></Link></div>
      <FaqList items={faq.slice(0, 6).map(item => ({ id: item.id, question: pick(item).title, answer: pick(item).body }))} />
    </section>}

    {journal.length > 0 && <section className="editorial-journal structure-section" aria-labelledby="editorial-journal-title"><div className="editorial-section-head"><div><span className="editorial-section-label">{t.journalLabel}</span><h2 id="editorial-journal-title">{t.journalTitle}</h2></div><p>{t.journalLead}</p></div><div className="editorial-journal-grid">{journal.slice(0, 3).map((item, index) => <Link key={item.id} href={`/${lang}/journal/${item.id}`} className="editorial-journal-card"><span>{String(index + 1).padStart(2, '0')} / {t.journalTitle}</span><h3>{lang === 'vi' ? item.title_vi : item.title_en}</h3><p>{lang === 'vi' ? item.body_vi : item.body_en}</p><strong>{t.journalRead} <span aria-hidden="true">↗</span></strong></Link>)}</div><Link className="editorial-text-link" href={`/${lang}/journal`}>{t.journalAll}<span aria-hidden="true">↗</span></Link></section>}

    <section className="editorial-investors structure-section" aria-labelledby="editorial-investors-title"><div><span className="editorial-section-label">{t.investorsLabel}</span><h2 id="editorial-investors-title">{t.investorsTitle}</h2><p>{t.investorsBody}</p></div><Link className="editorial-text-link" href={`/${lang}/partners`}>{t.investors}<span aria-hidden="true">↗</span></Link></section>

    <OfficeMap lang={lang} />

    <section className="editorial-contact home-cta"><div><span className="editorial-section-label">DRM STAYS / CONTACT</span><h2>{t.contactTitle}</h2><p>{t.contactBody}</p><Link className="editorial-primary-link" href={`/${lang}/contact`}>{t.contact}<span aria-hidden="true">↗</span></Link></div>{contactPhoto && <img src={contactPhoto.url} alt={contactPhoto.alt || 'DRM Stays apartment'} loading="lazy" {...imgSize(contactPhoto)} />}<div className="home-wordmark" aria-hidden="true">DRM Stays</div></section>
  </div>;
}
