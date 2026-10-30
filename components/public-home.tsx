import Link from 'next/link';
import type { ContentItem } from '@/lib/site-content';

type Photo = { url: string; alt: string };
type Building = {
  id: string;
  name: string;
  address: string;
  propertyType: string;
  images: Photo[];
  rooms: Array<{ monthlyPrice: number; images: Photo[] }>;
};

const text = {
  vi: {
    hero: 'Một nơi ở vừa vặn với nhịp sống của bạn.',
    heroLead: 'Khám phá những căn hộ dịch vụ tại Đà Nẵng. Xem từng tòa, từng phòng và liên hệ trực tiếp khi bạn tìm thấy nơi phù hợp.',
    explore: 'Khám phá tòa nhà & phòng',
    introLabel: 'Cách chúng tôi giới thiệu nơi ở',
    introTitle: 'Xem rõ không gian trước khi quyết định.',
    introBody: 'DRM Stays giúp bạn xem hình ảnh, trang bị và thông tin thuê của từng phòng trong cùng một nơi. Khi cần thêm chi tiết, đội ngũ sẽ kiểm tra và tư vấn trực tiếp.',
    detailOne: 'Xem từng phòng', detailOneBody: 'Ảnh, diện tích, vật dụng và tiện ích được trình bày theo từng loại phòng.',
    detailTwo: 'Tìm theo tòa', detailTwoBody: 'So sánh khu vực, vị trí tham khảo và các lựa chọn trong cùng một tòa nhà.',
    detailThree: 'Hỏi trước khi thuê', detailThreeBody: 'Gửi ngày dự kiến và nhu cầu của bạn để được xác nhận tình trạng phòng.',
    collection: 'Những tòa nhà đang giới thiệu', collectionLead: 'Từ không gian đến khu vực xung quanh, bắt đầu tìm nơi ở phù hợp với bạn.',
    view: 'Xem tòa nhà', from: 'Từ', month: 'tháng', rooms: 'loại phòng',
    gallery: 'Một cái nhìn gần hơn', galleryLead: 'Khám phá hình ảnh không gian và từng phòng trước khi liên hệ.',
    journalLabel: 'DRM STAYS / CẨM NANG', journalTitle: 'Cẩm nang lưu trú', journalLead: 'Những điều nên biết trước khi chọn phòng và sắp xếp buổi xem thực tế.', journalAll: 'Xem tất cả bài viết', journalRead: 'Đọc bài viết',
    contactTitle: 'Bắt đầu từ một cuộc trò chuyện.', contactBody: 'Cho chúng tôi biết bạn muốn ở khu vực nào, thời gian dự kiến và kiểu phòng phù hợp. Đội ngũ sẽ liên hệ để xác nhận thông tin thực tế.', contact: 'Gửi yêu cầu tư vấn',
  },
  en: {
    hero: 'A place that fits the way you live.',
    heroLead: 'Explore serviced apartments in Da Nang. See every building and room, then contact us directly when you find the right fit.',
    explore: 'Explore buildings & rooms',
    introLabel: 'How we present each stay',
    introTitle: 'See the space before you decide.',
    introBody: 'DRM Stays brings each room’s photos, equipment and rental details together. When you need more information, our team will check and help you directly.',
    detailOne: 'Explore each room', detailOneBody: 'Photos, size, furniture and amenities are shown for each room type.',
    detailTwo: 'Browse by building', detailTwoBody: 'Compare neighborhoods, approximate locations and options within each building.',
    detailThree: 'Ask before you rent', detailThreeBody: 'Share your preferred dates and needs so our team can confirm availability.',
    collection: 'Buildings to explore', collectionLead: 'From the interior to the neighborhood, start finding a stay that fits.',
    view: 'View building', from: 'From', month: 'month', rooms: 'room types',
    gallery: 'A closer look', galleryLead: 'Explore the spaces and individual rooms before getting in touch.',
    journalLabel: 'DRM STAYS / JOURNAL', journalTitle: 'The stay journal', journalLead: 'Useful details to consider before choosing a room and arranging a viewing.', journalAll: 'View all articles', journalRead: 'Read article',
    contactTitle: 'Start with a conversation.', contactBody: 'Tell us your preferred area, dates and room type. Our team will contact you to confirm the details.', contact: 'Send an inquiry',
  },
} as const;

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const displayName = (name: string) => name.toLowerCase().replace(/\s+/g, '') === 'doraemonland' ? 'Doraemon Land' : name;

export function PublicHome({ lang, buildings, journal }: { lang: 'vi' | 'en'; buildings: Building[]; journal: ContentItem[] }) {
  const t = text[lang];
  const photos = [...new Map(buildings.flatMap(building => [...building.images, ...building.rooms.flatMap(room => room.images)]).map(photo => [photo.url, photo])).values()];
  const heroPhoto = photos[0];
  const introPhoto = photos[2] || photos[1] || heroPhoto;
  const galleryPhotos = photos.slice(1, 5);

  return <div className="editorial-home">
    <section className={`editorial-hero${heroPhoto ? ' has-photo' : ''}`}>
      {heroPhoto && <img className="editorial-hero-image" src={heroPhoto.url} alt={heroPhoto.alt || 'DRM Stays'} fetchPriority="high" />}
      <div className="editorial-hero-shade" aria-hidden="true" />
      <div className="editorial-hero-content"><span className="editorial-kicker">DRM STAYS <span aria-hidden="true">/</span> {lang === 'vi' ? 'ĐÀ NẴNG' : 'DA NANG'}</span><h1>{t.hero}</h1><p>{t.heroLead}</p><Link className="editorial-primary-link" href={`/${lang}/stays`}>{t.explore}<span aria-hidden="true">↗</span></Link></div>
      <div className="editorial-hero-foot"><span>YOUR STAY, OUR CARE</span><span>{lang === 'vi' ? 'CĂN HỘ DỊCH VỤ · ĐÀ NẴNG' : 'SERVICED APARTMENTS · DA NANG'}</span></div>
    </section>

    <section className="editorial-intro structure-section" aria-labelledby="editorial-intro-title">
      <div className="editorial-intro-copy"><span className="editorial-section-label">{t.introLabel}</span><h2 id="editorial-intro-title">{t.introTitle}</h2><p>{t.introBody}</p><Link className="editorial-text-link" href={`/${lang}/about`}>{lang === 'vi' ? 'Về DRM Stays' : 'About DRM Stays'}<span aria-hidden="true">↗</span></Link></div>
      {introPhoto && <figure className="editorial-intro-photo"><img src={introPhoto.url} alt={introPhoto.alt || 'DRM Stays apartment'} loading="lazy" /><figcaption>DRM STAYS / DA NANG</figcaption></figure>}
    </section>

    <section className="editorial-details structure-section" aria-label={lang === 'vi' ? 'Tìm nơi ở cùng DRM Stays' : 'Find a stay with DRM Stays'}>
      <div><span aria-hidden="true">⌂</span><h3>{t.detailOne}</h3><p>{t.detailOneBody}</p></div>
      <div><span aria-hidden="true">◎</span><h3>{t.detailTwo}</h3><p>{t.detailTwoBody}</p></div>
      <div><span aria-hidden="true">↗</span><h3>{t.detailThree}</h3><p>{t.detailThreeBody}</p></div>
    </section>

    <section className="editorial-collection structure-section" aria-labelledby="editorial-collection-title">
      <div className="editorial-section-head"><div><span className="editorial-section-label">DRM STAYS / COLLECTION</span><h2 id="editorial-collection-title">{t.collection}</h2></div><p>{t.collectionLead}</p></div>
      {buildings.length ? <div className="editorial-property-grid">{buildings.map((building) => {
        const photo = building.images[0] || building.rooms[0]?.images[0];
        const prices = building.rooms.map(room => room.monthlyPrice).filter(price => price > 0);
        return <Link className="editorial-property" href={`/${lang}/buildings/${building.id}`} key={building.id}>
          <div className="editorial-property-image">{photo ? <img src={photo.url} alt={photo.alt || building.name} loading="lazy" /> : <div className="editorial-property-placeholder">DRM Stays</div>}<span className="editorial-property-arrow" aria-hidden="true">↗</span></div>
          <div className="editorial-property-meta"><div><h3>{displayName(building.name)}</h3><p>{building.address}</p></div><div className="editorial-property-facts"><span>{building.propertyType || `${building.rooms.length} ${t.rooms}`}</span>{prices.length > 0 && <strong>{t.from} {money(Math.min(...prices))} ₫ / {t.month}</strong>}</div></div>
        </Link>;
      })}</div> : <p>{lang === 'vi' ? 'Các tòa nhà đang được cập nhật.' : 'Buildings are being updated.'}</p>}
      <Link className="editorial-text-link" href={`/${lang}/stays`}>{lang === 'vi' ? 'Xem tất cả tòa nhà & phòng' : 'Explore all buildings & rooms'}<span aria-hidden="true">↗</span></Link>
    </section>

    {galleryPhotos.length >= 2 && <section className="editorial-gallery structure-section" aria-labelledby="editorial-gallery-title"><div className="editorial-section-head"><div><span className="editorial-section-label">DRM STAYS / GALLERY</span><h2 id="editorial-gallery-title">{t.gallery}</h2></div><p>{t.galleryLead}</p></div><div className="editorial-gallery-grid">{galleryPhotos.map((photo, index) => <img key={photo.url} className={`editorial-gallery-item editorial-gallery-item-${index + 1}`} src={photo.url} alt={photo.alt || `${t.gallery} ${index + 1}`} loading="lazy" />)}</div></section>}

    {journal.length > 0 && <section className="editorial-journal structure-section" aria-labelledby="editorial-journal-title"><div className="editorial-section-head"><div><span className="editorial-section-label">{t.journalLabel}</span><h2 id="editorial-journal-title">{t.journalTitle}</h2></div><p>{t.journalLead}</p></div><div className="editorial-journal-grid">{journal.slice(0, 3).map((item, index) => <Link key={item.id} href={`/${lang}/journal/${item.id}`} className="editorial-journal-card"><span>{String(index + 1).padStart(2, '0')} / {t.journalTitle}</span><h3>{lang === 'vi' ? item.title_vi : item.title_en}</h3><p>{lang === 'vi' ? item.body_vi : item.body_en}</p><strong>{t.journalRead} <span aria-hidden="true">↗</span></strong></Link>)}</div><Link className="editorial-text-link" href={`/${lang}/journal`}>{t.journalAll}<span aria-hidden="true">↗</span></Link></section>}

    <section className="editorial-contact"><div><span className="editorial-section-label">DRM STAYS / CONTACT</span><h2>{t.contactTitle}</h2><p>{t.contactBody}</p><Link className="editorial-primary-link" href={`/${lang}/contact`}>{t.contact}<span aria-hidden="true">↗</span></Link></div>{photos[2] && <img src={photos[2].url} alt={photos[2].alt || 'DRM Stays apartment'} loading="lazy" />}</section>
  </div>;
}
