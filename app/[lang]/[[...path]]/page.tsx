import Link from 'next/link';
import { notFound } from 'next/navigation';
import { env } from 'cloudflare:workers';
import { getPublicCatalog } from '@/lib/public-catalog';
import { getContentItems, getContentImages, contentSections, type ContentItem, type ContentSection, type ContentImage } from '@/lib/site-content';
import { getPublicLandmarks } from '@/lib/landmarks';
import { MapExplorer } from '@/components/map-explorer';
import { PropertyGallery } from '@/components/property-gallery';
import { DateRangeSearch } from '@/components/date-range-search';
import { CatalogContactForm } from '@/components/catalog-contact-form';
import { QuickContact } from '@/components/quick-contact';
import { PublicHome } from '@/components/public-home';
import { getContactChannels } from '@/lib/contact-channels';

export const dynamic = 'force-dynamic';
type Lang = 'vi' | 'en';
type Catalog = Awaited<ReturnType<typeof getPublicCatalog>>;
type Building = Catalog['buildings'][number];
type Room = Building['rooms'][number];

const copy = {
  vi: {
    navStays: 'Tòa nhà & phòng', navServices: 'Dịch vụ', navPartners: 'Chủ tòa & đối tác', navAbout: 'Về DRM Stays', navJournal: 'Cẩm nang', navContact: 'Liên hệ', navFaq: 'Câu hỏi thường gặp',
    hero: 'Không gian lưu trú phù hợp với bạn.', heroText: 'DRM Stays giới thiệu các tòa nhà và từng phòng với hình ảnh, diện tích, trang bị, giá tháng và thông tin cần biết trước khi liên hệ.',
    explore: 'Khám phá tòa nhà', featured: 'Tòa nhà đang giới thiệu', from: 'Từ', month: 'tháng', viewBuilding: 'Xem tòa nhà', viewRoom: 'Xem phòng', allBuildings: 'Tất cả tòa nhà', rooms: 'Phòng trong tòa',
    checkIn: 'Ngày nhận phòng', checkOut: 'Ngày trả phòng', search: 'Xem phòng', available: 'Còn trống theo ngày chọn', unavailable: 'Không còn trống theo ngày chọn',
    propertyType: 'Loại hình', buildingArea: 'Diện tích khuôn viên', floors: 'Số tầng', roomType: 'Loại phòng', floor: 'Tầng', area: 'Diện tích', beds: 'Giường', bathrooms: 'WC', guests: 'Sức chứa', deposit: 'Tiền cọc', minStay: 'Thuê tối thiểu',
    amenities: 'Tiện ích', services: 'Dịch vụ', furniture: 'Nội thất & vật dụng', serviceFees: 'Phí dịch vụ', rules: 'Quy định', floorplan: 'Sơ đồ mặt bằng',
    contactTitle: 'Gửi yêu cầu tư vấn', contactText: 'Để lại thông tin. Nhân viên sẽ liên hệ để xác nhận phòng, điều kiện thuê và lịch xem.', name: 'Họ tên', phone: 'Số điện thoại / WhatsApp', email: 'Email (không bắt buộc)', message: 'Nội dung yêu cầu', send: 'Gửi yêu cầu', note: 'Gửi form chưa phải là đặt phòng hoặc thanh toán.',
    partnerTitle: 'Dành cho chủ tòa và đối tác', partnerProperty: 'Tòa nhà / khu vực', partnerSend: 'Gửi thông tin hợp tác',
    noBuildings: 'Chưa có tòa nhà được công khai.', noRooms: 'Chưa có phòng được công khai trong tòa này.', noResults: 'Danh sách hiện chưa sẵn sàng. Vui lòng thử lại sau.',
    demo: 'BẢN XEM TRƯỚC · Nội dung, ảnh và giá đang là mẫu. Lịch trống thật từ Staydesk chưa kết nối.',
    received: 'Đã nhận thông tin. Đội ngũ sẽ liên hệ lại.', empty: 'Nội dung đang được cập nhật.', backJournal: 'Về danh sách bài viết', selectedDates: 'Ngày bạn đang xem', dateSeparator: 'đến', changeDates: 'Đổi ngày',
  },
  en: {
    navStays: 'Buildings & rooms', navServices: 'Services', navPartners: 'Owners & partners', navAbout: 'About DRM Stays', navJournal: 'Journal', navContact: 'Contact', navFaq: 'FAQ',
    hero: 'Find a stay that fits your life.', heroText: 'DRM Stays presents buildings and individual rooms with photos, size, equipment, monthly rent and details to review before getting in touch.',
    explore: 'Explore buildings', featured: 'Featured buildings', from: 'From', month: 'month', viewBuilding: 'View building', viewRoom: 'View room', allBuildings: 'All buildings', rooms: 'Rooms in this building',
    checkIn: 'Check-in', checkOut: 'Check-out', search: 'Explore rooms', available: 'Available for selected dates', unavailable: 'Unavailable for selected dates',
    propertyType: 'Property type', buildingArea: 'Site area', floors: 'Floors', roomType: 'Room type', floor: 'Floor', area: 'Area', beds: 'Beds', bathrooms: 'Bathrooms', guests: 'Capacity', deposit: 'Deposit', minStay: 'Minimum stay',
    amenities: 'Amenities', services: 'Services', furniture: 'Furniture & equipment', serviceFees: 'Service fees', rules: 'House rules', floorplan: 'Floor plans',
    contactTitle: 'Ask about this stay', contactText: 'Leave your details. Our team will contact you to confirm availability, rental terms and a viewing.', name: 'Your name', phone: 'Phone / WhatsApp', email: 'Email (optional)', message: 'Your request', send: 'Send request', note: 'This is an inquiry, not a reservation or payment.',
    partnerTitle: 'For building owners and partners', partnerProperty: 'Building / area', partnerSend: 'Send partnership inquiry',
    noBuildings: 'No buildings have been published yet.', noRooms: 'No rooms have been published in this building yet.', noResults: 'The catalog is temporarily unavailable. Please try again later.',
    demo: 'PREVIEW · Content, photos and prices are samples. Live Staydesk availability is not connected.',
    received: 'Your inquiry has been received. Our team will contact you.', empty: 'Content is being updated.', backJournal: 'Back to journal', selectedDates: 'Your selected dates', dateSeparator: 'to', changeDates: 'Change dates',
  },
} as const;

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
function selectedDateQuery(checkIn?: string, checkOut?: string) {
  const validDate = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(checkIn) || !validDate(checkOut) || checkIn! >= checkOut!) return '';
  return `?${new URLSearchParams({ checkIn: checkIn!, checkOut: checkOut! })}`;
}
const minMonthlyPrice = (rooms: Array<{ monthlyPrice: number }>) => { const prices = rooms.map(room => room.monthlyPrice).filter(price => price > 0); return prices.length ? Math.min(...prices) : null; };
const contentTitle = (item: ContentItem, lang: Lang) => lang === 'vi' ? item.title_vi : item.title_en;
const contentBody = (item: ContentItem, lang: Lang) => lang === 'vi' ? item.body_vi : item.body_en;
const propertyName = (name: string) => name.toLowerCase().replace(/\s+/g, '') === 'doraemonland' ? 'Doraemon Land' : name;

function Header({ lang, segments, dateQuery }: { lang: Lang; segments: string[]; dateQuery: string }) {
  const t = copy[lang], suffix = segments.length ? `/${segments.join('/')}` : '';
  const links = [['stays', t.navStays], ['services', t.navServices], ['journal', t.navJournal], ['about', t.navAbout], ['contact', t.navContact]] as const;
  return <header className="structure-header"><Link href={`/${lang}`} className="structure-brand"><img className="structure-header-logo" src="/drm-stay-logo.png" alt="DRM STAY" /><span>DRM Stays<small>{lang === 'vi' ? 'KHÔNG GIAN LƯU TRÚ' : 'STAY WITH CARE'}</small></span></Link><nav aria-label="Main navigation">{links.map(([path, label]) => <Link href={`/${lang}/${path}`} key={path}>{label}</Link>)}</nav><div className="structure-languages"><Link href={`/vi${suffix}${dateQuery}`} aria-label="Tiếng Việt">VI</Link><span>/</span><Link href={`/en${suffix}${dateQuery}`} aria-label="English">EN</Link></div></header>;
}
function Footer({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return <footer className="structure-footer"><div className="structure-footer-intro"><strong className="structure-footer-brand">DRM Stays</strong><p>Your Stay, Our Care.</p><span>{lang === 'vi' ? 'Khám phá nơi ở phù hợp tại Đà Nẵng.' : 'Explore stays that fit in Da Nang.'}</span></div><nav aria-label={lang === 'vi' ? 'Khám phá' : 'Explore'}><Link href={`/${lang}/stays`}>{t.navStays}</Link><Link href={`/${lang}/services`}>{t.navServices}</Link><Link href={`/${lang}/about`}>{t.navAbout}</Link><Link href={`/${lang}/journal`}>{t.navJournal}</Link></nav><nav aria-label={lang === 'vi' ? 'Thông tin' : 'Information'}><Link href={`/${lang}/partners`}>{t.navPartners}</Link><Link href={`/${lang}/faq`}>{t.navFaq}</Link><Link href={`/${lang}/contact`}>{t.navContact}</Link></nav><div className="structure-footer-bottom"><span>© {new Date().getFullYear()} DRM Stays</span><Link href={`/${lang}/contact`}>{t.navContact} ↗</Link></div></footer>;
}
function Price({ room, lang }: { room: Room; lang: Lang }) { return room.monthlyPrice > 0 ? <p className="structure-price">{money(room.monthlyPrice)} ₫ / {copy[lang].month}</p> : null; }
function SelectedDates({ lang, checkIn, checkOut }: { lang: Lang; checkIn?: string; checkOut?: string }) {
  if (!selectedDateQuery(checkIn, checkOut)) return null;
  return <p className="structure-selected-dates"><span>{copy[lang].selectedDates}</span><strong>{checkIn} {copy[lang].dateSeparator} {checkOut}</strong><Link href={`/${lang}/stays${selectedDateQuery(checkIn, checkOut)}`}>{copy[lang].changeDates}</Link></p>;
}
function Specs({ items }: { items: Array<[string, string | number | undefined]> }) { const visible = items.filter(([, value]) => value !== undefined && value !== '' && value !== 0); return visible.length ? <ul className="structure-specs">{visible.map(([label, value]) => <li key={label}><strong>{label}</strong>{value}</li>)}</ul> : null; }
function BulletList({ title, items }: { title: string; items: string[] }) { return items.length ? <section className="structure-detail-block"><h3>{title}</h3><ul className="structure-detail-list">{items.map(item => <li key={item}>{item}</li>)}</ul></section> : null; }
function Floorplans({ title, items }: { title: string; items: Array<{ id: string; url: string; alt: string }> }) { return items.length ? <section className="structure-detail-block"><h3>{title}</h3><div className="structure-floorplans">{items.map(item => <img key={item.id} src={item.url} alt={item.alt || title} />)}</div></section> : null; }
function RoomCard({ room, lang, dateQuery = '' }: { room: Room; lang: Lang; dateQuery?: string }) { const t = copy[lang]; return <article className="structure-card"><Link href={`/${lang}/rooms/${room.id}${dateQuery}`}><img src={room.images[0]?.url || '/drm-stay-logo.png'} alt={room.images[0]?.alt || room.name} /></Link><div><span className="eyebrow">{room.type || (room.areaSqm ? `${room.areaSqm} m²` : '')}</span><h3>{room.name}</h3><Price room={room} lang={lang} />{dateQuery && room.available !== null && <p className={`structure-availability ${room.available ? 'is-available' : 'is-unavailable'}`}>{room.available ? t.available : t.unavailable}</p>}<Link className="structure-arrow" href={`/${lang}/rooms/${room.id}${dateQuery}`}>{t.viewRoom} →</Link></div></article>; }
function ContactForm({ lang, roomId, checkIn, checkOut }: { lang: Lang; roomId: string; checkIn?: string; checkOut?: string }) { return <CatalogContactForm lang={lang} roomId={roomId} checkIn={checkIn} checkOut={checkOut} />; }
function ContentCards({ items, lang, images }: { items: ContentItem[]; lang: Lang; images: Record<string, ContentImage[]> }) { return items.length ? <div className="structure-content-grid">{items.map(item => <article className="structure-content-card" key={item.id}>{images[item.id]?.[0] && <img className="structure-content-cover" src={images[item.id][0].url} alt={images[item.id][0].alt || contentTitle(item, lang)} />}<h2>{contentTitle(item, lang)}</h2><p>{contentBody(item, lang)}</p>{images[item.id]?.length > 1 && <div className="structure-content-gallery">{images[item.id].slice(1).map(image => <img key={image.id} src={image.url} alt={image.alt || contentTitle(item, lang)} />)}</div>}</article>)}</div> : <p>{copy[lang].empty}</p>; }

async function catalog(checkIn: string | undefined, checkOut: string | undefined, lang: Lang) { try { return await getPublicCatalog(checkIn, checkOut, lang); } catch { return null; } }

export default async function Page({ params, searchParams }: { params: Promise<{ lang: string; path?: string[] }>; searchParams: Promise<{ checkIn?: string; checkOut?: string; sent?: string }> }) {
  const { lang: input, path: segments = [] } = await params;
  if (input !== 'vi' && input !== 'en') notFound();
  const lang: Lang = input, t = copy[lang], [section, id] = segments, q = await searchParams;
  const dateQuery = selectedDateQuery(q.checkIn, q.checkOut);
  const isContent = contentSections.includes(section as ContentSection);
  if (segments.length > 2 || (section && !['stays', 'buildings', 'rooms', 'contact', 'faq', ...contentSections].includes(section))) notFound();
  if ((section === 'buildings' || section === 'rooms') && !id) notFound();
  if (id && !['buildings', 'rooms', 'journal'].includes(section)) notFound();
  const needsCatalog = !section || ['stays', 'buildings', 'rooms', 'contact'].includes(section);
  const data = needsCatalog ? await catalog(dateQuery ? q.checkIn : undefined, dateQuery ? q.checkOut : undefined, lang) : null;
  const landmarks = section === 'stays' ? await getPublicLandmarks() : [];
  const building = section === 'buildings' ? data?.buildings.find(item => item.id === id) : undefined;
  const room = section === 'rooms' ? data?.buildings.flatMap(item => item.rooms).find(item => item.id === id) : undefined;
  if ((section === 'buildings' && data && !building) || (section === 'rooms' && data && !room)) notFound();
  const content = !section || isContent ? await getContentItems((section || 'journal') as ContentSection) : [];
  const contentImages = isContent ? await getContentImages(content) : {};
  const article = section === 'journal' && id ? content.find(item => item.id === id) : undefined;
  if (section === 'journal' && id && !article) notFound();
  const sectionTitles: Record<string,string> = { stays: t.navStays, services: t.navServices, partners: t.partnerTitle, about: t.navAbout, journal: t.navJournal, faq: t.navFaq, contact: t.navContact };
  const title = building ? propertyName(building.name) : room?.name || (article ? contentTitle(article, lang) : sectionTitles[section || ''] || '');
  const contactChannels = await getContactChannels();
  const contactPhoto = section === 'contact' ? data?.buildings[1]?.images[0] || data?.buildings[0]?.rooms[0]?.images[0] || data?.buildings[0]?.images[0] : undefined;
  return <div className="structure-site" lang={lang}>{env.PREVIEW_DEMO === '1' && <p className="catalog-demo-banner">{t.demo}</p>}<Header lang={lang} segments={segments} dateQuery={dateQuery} />
    {!section && <PublicHome lang={lang} buildings={data?.buildings || []} journal={content} />}
    {section === 'stays' && <><section className="structure-page-hero"><span className="eyebrow">DRM STAYS</span><h1>{title}</h1><DateRangeSearch lang={lang} checkIn={q.checkIn} checkOut={q.checkOut} /></section>{data?.buildings.length ? <MapExplorer lang={lang} dateQuery={dateQuery} buildings={data.buildings.map(item => ({ id: item.id, name: propertyName(item.name), address: item.address, imageUrl: item.images[0]?.url || item.rooms[0]?.images[0]?.url || '/drm-stay-logo.png', imageAlt: item.images[0]?.alt || item.rooms[0]?.images[0]?.alt || propertyName(item.name), imageIsIllustrative: (item.images[0]?.id || item.rooms[0]?.images[0]?.id || '').startsWith('demo-'), photos: (item.images.length ? item.images : item.rooms.flatMap(room => room.images).slice(0, 3)).map(image => ({ url: image.url, alt: image.alt || propertyName(item.name) })), roomCount: item.rooms.length, monthlyPrice: minMonthlyPrice(item.rooms), latitude: item.latitude, longitude: item.longitude, coordinateApproximate: item.coordinateApproximate }))} landmarks={landmarks.map(place => ({ id: place.id, name: lang === 'vi' ? place.nameVi : place.nameEn || place.nameVi, description: lang === 'vi' ? place.descriptionVi : place.descriptionEn || place.descriptionVi, latitude: place.latitude, longitude: place.longitude, buildingIds: place.buildingIds }))} /> : <section className="structure-section"><p>{data ? t.noBuildings : t.noResults}</p></section>}</>}
    {section === 'buildings' && <><section className="structure-page-hero"><Link className="structure-back" href={`/${lang}/stays${dateQuery}`}>← {t.allBuildings}</Link><h1>{title || t.noResults}</h1><p>{building?.address}</p><SelectedDates lang={lang} checkIn={q.checkIn} checkOut={q.checkOut} /></section>{building && <section className="structure-section"><div className="structure-detail"><PropertyGallery photos={building.images.length ? building.images : building.rooms[0]?.images || []} name={title} lang={lang} variant="building" /><div><p>{building.description}</p><Specs items={[[t.propertyType,building.propertyType],[t.buildingArea,building.areaSqm ? `${building.areaSqm} m²` : ''],[t.floors,building.floorCount]]} /><BulletList title={t.amenities} items={building.amenities} /><BulletList title={t.services} items={building.services} />{building.rules && <section className="structure-detail-block"><h3>{t.rules}</h3><p>{building.rules}</p></section>}</div></div><Floorplans title={t.floorplan} items={building.floorplans} /><h2>{t.rooms}</h2><div className="structure-grid">{building.rooms.map(item => <RoomCard key={item.id} room={item} lang={lang} dateQuery={dateQuery} />)}</div>{!building.rooms.length && <p>{t.noRooms}</p>}</section>}</>}
    {section === 'rooms' && <><section className="structure-page-hero"><Link className="structure-back" href={`/${lang}/stays${dateQuery}`}>← {t.navStays}</Link><h1>{title || t.noResults}</h1>{room && <Price room={room} lang={lang} />}<SelectedDates lang={lang} checkIn={q.checkIn} checkOut={q.checkOut} /></section>{room && <section className="structure-section structure-room-detail"><div><PropertyGallery photos={room.images} name={room.name} lang={lang} variant="room" /><p>{room.description}</p><Specs items={[[t.roomType,room.type],[t.floor,room.floor],[t.area,room.areaSqm ? `${room.areaSqm} m²` : ''],[t.beds,room.beds],[t.bathrooms,room.bathrooms],[t.guests,room.maxGuests],[t.deposit,room.depositVnd ? `${money(room.depositVnd)} ₫` : ''],[t.minStay,room.minStayMonths ? `${room.minStayMonths} ${t.month}` : '']]} /><BulletList title={t.furniture} items={room.furniture} /><BulletList title={t.amenities} items={room.amenities} />{room.serviceFees && <section className="structure-detail-block"><h3>{t.serviceFees}</h3><p>{room.serviceFees}</p></section>}{room.rules && <section className="structure-detail-block"><h3>{t.rules}</h3><p>{room.rules}</p></section>}<Floorplans title={t.floorplan} items={room.floorplans} />{dateQuery && room.available !== null && <strong className={`structure-availability ${room.available ? 'is-available' : 'is-unavailable'}`}>{room.available ? t.available : t.unavailable}</strong>}</div><aside><h2>{t.contactTitle}</h2><p>{t.contactText}</p>{q.sent === '1' && <p role="status">{t.received}</p>}<ContactForm lang={lang} roomId={room.id} checkIn={dateQuery ? q.checkIn : undefined} checkOut={dateQuery ? q.checkOut : undefined} /></aside></section>}</>}
    {['about','services','partners','journal','faq','contact'].includes(section || '') && <><section className="structure-page-hero"><span className="eyebrow">DRM STAYS</span><h1>{title}</h1>{section === 'partners' && <p>{lang === 'vi' ? 'Chia sẻ thông tin tòa nhà và nhu cầu hợp tác. Chúng tôi sẽ liên hệ để trao đổi phương án phù hợp.' : 'Share your building details and partnership goals. Our team will contact you to discuss a suitable approach.'}</p>}</section><section className="structure-section structure-content">{section === 'about' && <img className="structure-logo-large" src="/drm-stay-logo.png" alt="DRM STAY — Your Stay Our Care" />}{section === 'journal' ? article ? <><Link className="structure-back" href={`/${lang}/journal`}>← {t.backJournal}</Link><ContentCards items={[article]} lang={lang} images={contentImages} /></> : content.length ? <div>{content.map(item => <Link className="structure-article-link" key={item.id} href={`/${lang}/journal/${item.id}`}>{contentImages[item.id]?.[0] && <img src={contentImages[item.id][0].url} alt={contentImages[item.id][0].alt || contentTitle(item,lang)} />}<strong>{contentTitle(item,lang)}</strong><span>{contentBody(item,lang).slice(0,180)}…</span></Link>)}</div> : <p>{t.empty}</p> : isContent && <ContentCards items={content} lang={lang} images={contentImages} />}{section === 'partners' && <>{q.sent === '1' && <p role="status">{t.received}</p>}<form className="structure-form" action="/api/partner-inquiries" method="post"><input type="hidden" name="lang" value={lang} /><label>{t.name}<input name="name" required maxLength={100} /></label><label>{t.phone}<input name="phone" required maxLength={24} /></label><label>{t.email}<input name="email" type="email" maxLength={254} /></label><label>{t.partnerProperty}<input name="property" maxLength={200} /></label><label>{t.message}<textarea name="message" rows={5} maxLength={2000} /></label><label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label><button>{t.partnerSend}</button></form></>}{section === 'contact' && <>{q.sent === '1' && <p role="status">{t.received}</p>}<p>{t.contactText}</p><ContactForm lang={lang} roomId="" />{contactPhoto && <img className="editorial-contact-photo" src={contactPhoto.url} alt={contactPhoto.alt || "DRM Stays apartment"} loading="lazy" />}</>}</section></>}
    <Footer lang={lang} />
    <QuickContact lang={lang} preview={env.PREVIEW_DEMO === '1'} channels={[
      { name: 'WhatsApp', mark: 'W', url: contactChannels.whatsapp.published ? contactChannels.whatsapp.url : undefined },
      { name: 'Telegram', mark: 'T', url: contactChannels.telegram.published ? contactChannels.telegram.url : undefined },
      { name: 'Facebook', mark: 'f', url: contactChannels.facebook.published ? contactChannels.facebook.url : undefined },
      { name: 'Zalo', mark: 'Z', url: contactChannels.zalo.published ? contactChannels.zalo.url : undefined },
    ]} />
  </div>;
}
