import { imgSize } from '@/lib/image-url';
import { propertyName as displayName } from '@/lib/site';
import { buildingFromPrice, buildingPhotos } from '@/lib/building-media';
import type { HomeContent } from '@/lib/home-content';
import Link from 'next/link';
import type { ContentItem } from '@/lib/site-content';
import type { Testimonial } from '@/lib/testimonials';
import { Carousel, FaqList, StoryText } from '@/components/home-motion';
import { OfficeMap } from '@/components/office-map';

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

export type HomeRoomType = { id: string; name: string; building: string; image?: Photo; priceFrom: number; areaSqm: number; beds: number; maxGuests: number };

export function PublicHome({ lang, buildings, journal, home, roomTypes = [], services = [], faq = [], testimonials = [] }: { lang: 'vi' | 'en'; buildings: Building[]; journal: ContentItem[]; home: HomeContent; roomTypes?: HomeRoomType[]; services?: ContentItem[]; faq?: ContentItem[]; testimonials?: Testimonial[] }) {
  const vi = lang === 'vi';
  const pick = (item: ContentItem) => ({ title: vi ? item.title_vi : item.title_en, body: vi ? item.body_vi : item.body_en });
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
      <div className="editorial-hero-foot"><span>YOUR STAY, OUR CARE</span><span>{lang === 'vi' ? 'CĂN HỘ CHO THUÊ · ĐÀ NẴNG' : 'APARTMENTS FOR RENT · DA NANG'}</span></div>
    </section>

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
          <div className="editorial-property-image">{photo ? <img src={photo.url} alt={photo.alt || building.name} loading="lazy" {...imgSize(photo)} /> : <div className="editorial-property-placeholder">DRM Stays</div>}<span className="editorial-property-arrow" aria-hidden="true">↗</span></div>
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

    {testimonials.length > 0 && <section className="home-testimonials structure-section" aria-labelledby="home-testimonials-title" data-reveal>
      <div className="editorial-section-head"><div><span className="editorial-section-label">{vi ? 'KHÁCH HÀNG NÓI GÌ' : 'GUEST REVIEWS'}</span><h2 id="home-testimonials-title">{vi ? 'Trải nghiệm thật từ khách đã ở' : 'Real stays, in guests’ own words'}</h2></div></div>
      <Carousel label={vi ? 'Đánh giá của khách' : 'Guest reviews'} prev={vi ? 'Trước' : 'Previous'} next={vi ? 'Sau' : 'Next'}>{testimonials.map(item => <figure key={item.id} className="home-quote"><span aria-hidden="true">“</span><blockquote>{vi ? item.quote_vi : item.quote_en}</blockquote><figcaption><strong>{item.name}</strong><small>{vi ? item.detail_vi : item.detail_en}</small></figcaption></figure>)}</Carousel>
    </section>}

    <section className="editorial-details structure-section" aria-label={lang === 'vi' ? 'Vì sao thuê tại DRM Stays' : 'Why rent with DRM Stays'}>
      <div><span aria-hidden="true">⌂</span><h3>{t.detailOne}</h3><p>{t.detailOneBody}</p></div>
      <div><span aria-hidden="true">◎</span><h3>{t.detailTwo}</h3><p>{t.detailTwoBody}</p></div>
      <div><span aria-hidden="true">↗</span><h3>{t.detailThree}</h3><p>{t.detailThreeBody}</p></div>
    </section>

    <section className="home-stats structure-section" aria-label={vi ? 'DRM Stays trong vài con số' : 'DRM Stays in numbers'} data-reveal>
      <div><strong>3</strong><span>{vi ? 'năm vận hành bất động sản cho thuê' : 'years operating rental property'}</span></div>
      <div><strong>10+</strong><span>{vi ? 'dự án đã tư vấn' : 'projects advised'}</span></div>
      <div><strong>6</strong><span>{vi ? 'ngôn ngữ hỗ trợ khách' : 'languages supported'}</span></div>
    </section>

    {services.length > 0 && <section className="home-services structure-section" aria-labelledby="home-services-title" data-reveal>
      <div className="editorial-section-head"><div><span className="editorial-section-label">{vi ? 'DỊCH VỤ' : 'SERVICES'}</span><h2 id="home-services-title">{vi ? 'Mọi thứ bạn cần cho một kỳ lưu trú dễ chịu' : 'Everything for a comfortable stay'}</h2></div><p>{vi ? 'Chi phí rõ ràng, hỗ trợ nhiều ngôn ngữ, phòng có sẵn nội thất.' : 'Clear costs, multilingual support, furnished rooms.'}</p></div>
      <div className="home-services-grid">{services.slice(0, 6).map((item, index) => <article key={item.id} style={{ '--i': index } as React.CSSProperties}><span>{String(index + 1).padStart(2, '0')}</span><h3>{pick(item).title}</h3><p>{pick(item).body}</p></article>)}</div>
      <Link className="editorial-text-link" href={`/${lang}/services`}>{vi ? 'Xem chi tiết dịch vụ và chi phí' : 'See services and costs'}<span aria-hidden="true">↗</span></Link>
    </section>}

    {galleryPhotos.length >= 2 && <section className="editorial-gallery structure-section" aria-labelledby="editorial-gallery-title"><div className="editorial-section-head"><div><span className="editorial-section-label">DRM STAYS / GALLERY</span><h2 id="editorial-gallery-title">{t.gallery}</h2></div><p>{t.galleryLead}</p></div><div className="editorial-gallery-grid">{galleryPhotos.map((photo, index) => <img key={photo.url} className={`editorial-gallery-item editorial-gallery-item-${index + 1}`} src={photo.url} alt={photo.alt || `${t.gallery} ${index + 1}`} loading="lazy" {...imgSize(photo)} />)}</div></section>}

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
