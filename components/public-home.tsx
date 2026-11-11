import { imgSize } from '@/lib/image-url';
import { propertyName as displayName } from '@/lib/site';
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
};

const text = {
  vi: {
    hero: 'Tư vấn, thiết kế và vận hành bất động sản cho thuê tại Đà Nẵng.',
    heroLead: 'DRM Stays đồng hành cùng chủ đầu tư từ thiết kế, thi công đến vận hành để tạo dòng tiền ổn định. Chúng tôi cũng cho thuê phòng tại các tòa nhà do mình vận hành.',
    explore: 'Xem tòa nhà & phòng cho thuê', investors: 'Dịch vụ cho chủ đầu tư',
    introLabel: 'Hệ sinh thái DRM Stays',
    introTitle: 'Từ ý tưởng đến dòng tiền ổn định.',
    introBody: 'Trong 3 năm, DRM Stays đã tư vấn hơn 10 dự án. Chúng tôi đi cùng chủ đầu tư từ chọn mua, thiết kế, thi công đến vận hành và báo cáo tài chính hằng tháng.',
    detailOne: 'Tư vấn đầu tư và thiết kế', detailOneBody: 'Chọn mua bất động sản phù hợp, tư vấn thiết kế và thi công để xây dựng cho thuê.',
    detailTwo: 'Vận hành cho thuê', detailTwoBody: 'Đảm nhận vận hành cho thuê và quản lý đội ngũ vận hành tại tòa nhà.',
    detailThree: 'Báo cáo minh bạch', detailThreeBody: 'Báo cáo tài chính hằng tháng rõ ràng để chủ đầu tư nắm được hiệu quả.',
    collection: 'Các tòa nhà đang vận hành', collectionLead: 'Phòng có sẵn nội thất, cho thuê ngắn ngày và dài ngày tại khu vực gần An Thượng, Mỹ An.',
    view: 'Xem tòa nhà', from: 'Từ', month: 'tháng', rooms: 'loại phòng',
    gallery: 'Một cái nhìn gần hơn', galleryLead: 'Khám phá hình ảnh không gian và từng phòng trước khi liên hệ.',
    journalLabel: 'DRM STAYS / CẨM NANG', journalTitle: 'Cẩm nang lưu trú', journalLead: 'Những điều nên biết trước khi chọn phòng và sắp xếp buổi xem thực tế.', journalAll: 'Xem tất cả bài viết', journalRead: 'Đọc bài viết',
    contactTitle: 'Bắt đầu từ một cuộc trò chuyện.', contactBody: 'Dù bạn là chủ đầu tư hay khách thuê phòng, hãy cho chúng tôi biết nhu cầu. Đội ngũ sẽ liên hệ trong giờ làm việc, 8:00 đến 17:00.', contact: 'Gửi yêu cầu tư vấn',
  },
  en: {
    hero: 'Consulting, design and operation of rental property in Da Nang.',
    heroLead: 'DRM Stays works with investors from design and construction through operation to build steady cash flow. We also rent rooms in the buildings we operate.',
    explore: 'View buildings & rooms to rent', investors: 'Services for investors',
    introLabel: 'The DRM Stays ecosystem',
    introTitle: 'From an idea to steady cash flow.',
    introBody: 'In 3 years DRM Stays has advised more than 10 projects. We work with investors from purchase, design and construction to operation and monthly financial reports.',
    detailOne: 'Investment and design advice', detailOneBody: 'Choosing the right property, plus design and construction advice for a rental building.',
    detailTwo: 'Rental operation', detailTwoBody: 'We take over rental operation and manage the operating team at the building.',
    detailThree: 'Transparent reporting', detailThreeBody: 'A clear monthly financial report so investors can follow performance.',
    collection: 'Buildings we operate', collectionLead: 'Furnished rooms for short and long stays near An Thượng, Mỹ An.',
    view: 'View building', from: 'From', month: 'month', rooms: 'room types',
    gallery: 'A closer look', galleryLead: 'Explore the spaces and individual rooms before getting in touch.',
    journalLabel: 'DRM STAYS / JOURNAL', journalTitle: 'The stay journal', journalLead: 'Useful details to consider before choosing a room and arranging a viewing.', journalAll: 'View all articles', journalRead: 'Read article',
    contactTitle: 'Start with a conversation.', contactBody: 'Whether you are an investor or looking for a room, tell us what you need. Our team will get back to you during office hours, 8:00–17:00.', contact: 'Send an inquiry',
  },
} as const;

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

export function PublicHome({ lang, buildings, journal }: { lang: 'vi' | 'en'; buildings: Building[]; journal: ContentItem[] }) {
  const t = text[lang];
  const photos = [...new Map(buildings.flatMap(building => [...building.images, ...building.rooms.flatMap(room => room.images)]).map(photo => [photo.url, photo])).values()];
  const heroPhoto = photos[0];
  const introPhoto = photos[2] || photos[1] || heroPhoto;
  const galleryPhotos = photos.slice(1, 5);

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
        const photo = building.images[0] || building.rooms[0]?.images[0];
        const prices = building.rooms.map(room => room.monthlyPrice).filter(price => price > 0);
        return <Link className="editorial-property" href={`/${lang}/buildings/${building.id}`} key={building.id}>
          <div className="editorial-property-image">{photo ? <img src={photo.url} alt={photo.alt || building.name} loading="lazy" {...imgSize(photo)} /> : <div className="editorial-property-placeholder">DRM Stays</div>}<span className="editorial-property-arrow" aria-hidden="true">↗</span></div>
          <div className="editorial-property-meta"><div><h3>{displayName(building.name)}</h3><p>{building.address}</p></div><div className="editorial-property-facts"><span>{building.propertyType || `${building.rooms.length} ${t.rooms}`}</span>{prices.length > 0 && <strong>{t.from} {money(Math.min(...prices))} ₫ / {t.month}</strong>}</div></div>
        </Link>;
      })}</div> : <p>{lang === 'vi' ? 'Các tòa nhà đang được cập nhật.' : 'Buildings are being updated.'}</p>}
      <Link className="editorial-text-link" href={`/${lang}/stays`}>{lang === 'vi' ? 'Xem tất cả tòa nhà & phòng' : 'Explore all buildings & rooms'}<span aria-hidden="true">↗</span></Link>
    </section>

    {galleryPhotos.length >= 2 && <section className="editorial-gallery structure-section" aria-labelledby="editorial-gallery-title"><div className="editorial-section-head"><div><span className="editorial-section-label">DRM STAYS / GALLERY</span><h2 id="editorial-gallery-title">{t.gallery}</h2></div><p>{t.galleryLead}</p></div><div className="editorial-gallery-grid">{galleryPhotos.map((photo, index) => <img key={photo.url} className={`editorial-gallery-item editorial-gallery-item-${index + 1}`} src={photo.url} alt={photo.alt || `${t.gallery} ${index + 1}`} loading="lazy" {...imgSize(photo)} />)}</div></section>}

    {journal.length > 0 && <section className="editorial-journal structure-section" aria-labelledby="editorial-journal-title"><div className="editorial-section-head"><div><span className="editorial-section-label">{t.journalLabel}</span><h2 id="editorial-journal-title">{t.journalTitle}</h2></div><p>{t.journalLead}</p></div><div className="editorial-journal-grid">{journal.slice(0, 3).map((item, index) => <Link key={item.id} href={`/${lang}/journal/${item.id}`} className="editorial-journal-card"><span>{String(index + 1).padStart(2, '0')} / {t.journalTitle}</span><h3>{lang === 'vi' ? item.title_vi : item.title_en}</h3><p>{lang === 'vi' ? item.body_vi : item.body_en}</p><strong>{t.journalRead} <span aria-hidden="true">↗</span></strong></Link>)}</div><Link className="editorial-text-link" href={`/${lang}/journal`}>{t.journalAll}<span aria-hidden="true">↗</span></Link></section>}

    <section className="editorial-contact"><div><span className="editorial-section-label">DRM STAYS / CONTACT</span><h2>{t.contactTitle}</h2><p>{t.contactBody}</p><Link className="editorial-primary-link" href={`/${lang}/contact`}>{t.contact}<span aria-hidden="true">↗</span></Link></div>{photos[2] && <img src={photos[2].url} alt={photos[2].alt || 'DRM Stays apartment'} loading="lazy" {...imgSize(photos[2])} />}</section>
  </div>;
}
