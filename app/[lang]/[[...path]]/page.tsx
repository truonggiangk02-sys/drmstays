import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { env } from 'cloudflare:workers';
import { getPublicCatalog } from '@/lib/public-catalog';
import { getContentItems, getContentImages, contentSections, type ContentItem, type ContentSection, type ContentImage } from '@/lib/site-content';
import { getPublicLandmarks } from '@/lib/landmarks';
import { MapExplorer } from '@/components/map-explorer';
import { absoluteUrl, siteUrl, summarize } from '@/lib/site';
import { DetailGallery } from '@/components/detail-gallery';
import { DetailBlock, FactRows, FeatureGrid, RuleRows, StatTiles } from '@/components/detail-parts';
import { Ico, type Accent, type IconName } from '@/components/detail-icons';
import { ScrollReveal } from '@/components/scroll-reveal';
import { PageTransition } from '@/components/page-transition';
import { EnquirySheet } from '@/components/enquiry-sheet';
import { DateRangeSearch } from '@/components/date-range-search';
import { CatalogContactForm } from '@/components/catalog-contact-form';
import { QuickContact } from '@/components/quick-contact';
import { PublicHome } from '@/components/public-home';
import { getContactChannels } from '@/lib/contact-channels';
import { policies, policySections, POLICIES_UPDATED, type PolicySection } from '@/lib/policies';
import { breadcrumbData, structuredData } from '@/lib/structured-data';
import { groupByFloor } from '@/lib/catalog-progress';
import { buildingFromPrice, buildingPhotos, buildingRoomCount } from '@/lib/building-media';
import { jsonLd } from '@/lib/site';
import { imgSize, LOGO_SIZE } from '@/lib/image-url';

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
    roomTypes: 'Loại phòng', otherRooms: 'Phòng khác', fromPrice: 'Từ', roomsOfType: 'Phòng thuộc loại này', viewType: 'Xem loại phòng', roomsCount: 'phòng', roomsFree: 'phòng còn trống', noFreeRooms: 'Hết phòng theo ngày chọn', viewByFloor: 'Tầng', info: 'Thông tin chi tiết', showMore: 'Xem thêm', aboutBuilding: 'Về tòa nhà', home: 'Trang chủ',
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
    roomTypes: 'Room types', otherRooms: 'Other rooms', fromPrice: 'From', roomsOfType: 'Rooms of this type', viewType: 'View room type', roomsCount: 'rooms', roomsFree: 'rooms available', noFreeRooms: 'Fully booked for the selected dates', viewByFloor: 'Floor', info: 'Details', showMore: 'Show', aboutBuilding: 'About the building', home: 'Home',
    received: 'Your inquiry has been received. Our team will contact you.', empty: 'Content is being updated.', backJournal: 'Back to journal', selectedDates: 'Your selected dates', dateSeparator: 'to', changeDates: 'Change dates',
  },
} as const;

const homeTitle = { vi: 'DRM Stays | Căn hộ và phòng thuê tháng tại Đà Nẵng', en: 'DRM Stays | Apartments and Monthly Stays in Da Nang' } as const;
const sectionTitle = {
  vi: { stays: 'Tòa nhà & phòng', services: 'Dịch vụ', partners: 'Chủ tòa & đối tác', about: 'Về DRM Stays', journal: 'Cẩm nang', faq: 'Câu hỏi thường gặp', contact: 'Liên hệ', privacy: policies.vi.privacy.title, cancellation: policies.vi.cancellation.title, terms: policies.vi.terms.title },
  en: { stays: 'Buildings & rooms', services: 'Services', partners: 'Owners & partners', about: 'About DRM Stays', journal: 'Journal', faq: 'FAQ', contact: 'Contact', privacy: policies.en.privacy.title, cancellation: policies.en.cancellation.title, terms: policies.en.terms.title },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ lang: string; path?: string[] }> }): Promise<Metadata> {
  const { lang: input, path: segments = [] } = await params;
  if (input !== 'vi' && input !== 'en') return { robots: { index: false } };
  const lang: Lang = input, [section, id] = segments;
  const path = segments.length ? `/${segments.join('/')}` : '';
  let title: string | undefined, description: string = copy[lang].heroText, image: string | undefined, imageSize: { width?: number; height?: number } = {};
  if (!section) { title = homeTitle[lang]; }
  else if (section === 'buildings' || section === 'rooms' || section === 'types') {
    const data = await catalog(undefined, undefined, lang);
    const building = section === 'buildings' ? data?.buildings.find(item => item.id === id) : undefined;
    const room = section === 'rooms' ? data?.buildings.flatMap(item => item.rooms).find(item => item.id === id) : undefined;
    const roomType = section === 'types' ? data?.buildings.flatMap(item => item.types).find(item => item.id === id) : undefined;
    const found = building || room || roomType;
    if (!found) return data ? { title: lang === 'vi' ? 'Không tìm thấy' : 'Not found', robots: { index: false } } : {};
    title = building ? propertyName(building.name) : roomType ? roomType.name : room!.name;
    description = summarize(found.description || description);
    const cover = building ? buildingPhotos(building)[0] : found.images[0];
    image = cover?.url;
    imageSize = imgSize(cover);
  } else if (section === 'journal' && id) {
    const article = (await getContentItems('journal')).find(item => item.id === id);
    if (!article) return { title: lang === 'vi' ? 'Không tìm thấy' : 'Not found', robots: { index: false } };
    title = contentTitle(article, lang);
    description = summarize(contentBody(article, lang) || description);
  } else if (section in sectionTitle[lang]) title = sectionTitle[lang][section as keyof typeof sectionTitle['vi']];
  const ogImage = absoluteUrl(image || '/drm-stay-logo.png');
  return {
    ...(title ? { title: section ? title : { absolute: title } } : {}),
    description,
    // Canonical and hreflang URLs must be absolute, so they are only emitted once SITE_URL is configured.
    ...(siteUrl() ? { alternates: { canonical: `/${lang}${path}`, languages: { vi: `/vi${path}`, en: `/en${path}`, 'x-default': `/vi${path}` } } } : {}),
    openGraph: { type: 'website', locale: lang === 'vi' ? 'vi_VN' : 'en_US', title: title || homeTitle[lang], description, ...(siteUrl() ? { url: `/${lang}${path}` } : {}), ...(ogImage ? { images: [{ url: ogImage, ...(image ? imageSize : LOGO_SIZE) }] } : {}) },
  };
}

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
  return <header className="structure-header"><Link href={`/${lang}`} className="structure-brand"><img className="structure-header-logo" src="/drm-stay-logo.png" alt="DRM STAY" {...LOGO_SIZE} /><span>DRM Stays<small>{lang === 'vi' ? 'KHÔNG GIAN LƯU TRÚ' : 'STAY WITH CARE'}</small></span></Link><nav aria-label="Main navigation">{links.map(([path, label]) => <Link href={`/${lang}/${path}`} key={path}>{label}</Link>)}</nav><div className="structure-languages"><Link href={`/vi${suffix}${dateQuery}`} aria-label="Tiếng Việt">VI</Link><span>/</span><Link href={`/en${suffix}${dateQuery}`} aria-label="English">EN</Link></div></header>;
}
function Footer({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return <footer className="structure-footer"><div className="structure-footer-intro"><strong className="structure-footer-brand">DRM Stays</strong><p>Your Stay, Our Care.</p><span>{lang === 'vi' ? 'Khám phá nơi ở phù hợp tại Đà Nẵng.' : 'Explore stays that fit in Da Nang.'}</span></div><nav aria-label={lang === 'vi' ? 'Khám phá' : 'Explore'}><Link href={`/${lang}/stays`}>{t.navStays}</Link><Link href={`/${lang}/services`}>{t.navServices}</Link><Link href={`/${lang}/about`}>{t.navAbout}</Link><Link href={`/${lang}/journal`}>{t.navJournal}</Link></nav><nav aria-label={lang === 'vi' ? 'Thông tin' : 'Information'}><Link href={`/${lang}/partners`}>{t.navPartners}</Link><Link href={`/${lang}/faq`}>{t.navFaq}</Link><Link href={`/${lang}/contact`}>{t.navContact}</Link></nav><div className="structure-footer-bottom"><span>© {new Date().getFullYear()} DRM Stays</span><nav aria-label={lang === 'vi' ? 'Chính sách' : 'Policies'}>{policySections.map(p => <Link key={p} href={`/${lang}/${p}`}>{policies[lang][p].title}</Link>)}</nav><Link href={`/${lang}/contact`}>{t.navContact} ↗</Link></div></footer>;
}
function Price({ room, lang }: { room: Room; lang: Lang }) { return room.monthlyPrice > 0 ? <p className="structure-price">{money(room.monthlyPrice)} ₫ / {copy[lang].month}</p> : null; }
function SelectedDates({ lang, checkIn, checkOut }: { lang: Lang; checkIn?: string; checkOut?: string }) {
  if (!selectedDateQuery(checkIn, checkOut)) return null;
  return <p className="structure-selected-dates"><span>{copy[lang].selectedDates}</span><strong>{checkIn} {copy[lang].dateSeparator} {checkOut}</strong><Link href={`/${lang}/stays${selectedDateQuery(checkIn, checkOut)}`}>{copy[lang].changeDates}</Link></p>;
}
function Specs({ items }: { items: Array<[string, string | number | undefined]> }) { const visible = items.filter(([, value]) => value !== undefined && value !== '' && value !== 0); return visible.length ? <ul className="structure-specs">{visible.map(([label, value]) => <li key={label}><strong>{label}</strong>{value}</li>)}</ul> : null; }
function BulletList({ title, items }: { title: string; items: string[] }) { return items.length ? <section className="structure-detail-block"><h2>{title}</h2><ul className="structure-detail-list">{items.map(item => <li key={item}>{item}</li>)}</ul></section> : null; }
function Floorplans({ title, items, bare = false }: { title: string; items: Array<{ id: string; url: string; alt: string; width?: number; height?: number }>; bare?: boolean }) { if (bare) return <div className="structure-floorplans">{items.map(item => <img key={item.id} src={item.url} alt={item.alt || title} loading="lazy" {...imgSize(item)} />)}</div>; return items.length ? <section className="structure-detail-block"><h2>{title}</h2><div className="structure-floorplans">{items.map(item => <img key={item.id} src={item.url} alt={item.alt || title} {...imgSize(item)} />)}</div></section> : null; }
function RoomCard({ room, lang, dateQuery = '' }: { room: Room; lang: Lang; dateQuery?: string }) { const t = copy[lang]; return <article className="structure-card" data-reveal><Link href={`/${lang}/rooms/${room.id}${dateQuery}`}><img src={room.images[0]?.url || '/drm-stay-logo.png'} alt={room.images[0]?.alt || room.name} {...(room.images[0] ? imgSize(room.images[0]) : LOGO_SIZE)} /></Link><div><span className="eyebrow">{room.type || (room.areaSqm ? `${room.areaSqm} m²` : '')}</span><h3>{room.name}</h3><Price room={room} lang={lang} />{dateQuery && room.available !== null && <p className={`structure-availability ${room.available ? 'is-available' : 'is-unavailable'}`}>{room.available ? t.available : t.unavailable}</p>}<Link className="structure-arrow" href={`/${lang}/rooms/${room.id}${dateQuery}`}>{t.viewRoom} →</Link></div></article>; }
function ContactForm({ lang, roomId = '', typeId = '', checkIn, checkOut }: { lang: Lang; roomId?: string; typeId?: string; checkIn?: string; checkOut?: string }) { return <CatalogContactForm lang={lang} roomId={roomId} typeId={typeId} checkIn={checkIn} checkOut={checkOut} />; }
function DetailShell({ lang, crumbs, title, chips, dates, photos, name, lead, card, bar, barLabel, after, children }: { lang: Lang; crumbs: Array<[string, string]>; title: string; chips: Array<{ icon: IconName; text: string } | null>; dates?: React.ReactNode; photos: Array<{ id: string; url: string; alt: string; width?: number; height?: number }>; name: string; lead?: string; card: React.ReactNode; bar?: string; barLabel?: string; after?: React.ReactNode; children: React.ReactNode }) {
  const t = copy[lang];
  return <section className="structure-section dv">
    <nav className="dv-crumbs" aria-label="Breadcrumb"><Link href={`/${lang}`}>{t.home}</Link>{crumbs.map(([label, href]) => <span key={href}><i aria-hidden="true">›</i><Link href={href}>{label}</Link></span>)}<span><i aria-hidden="true">›</i><strong aria-current="page">{title}</strong></span></nav>
    <div className="dv-head" data-reveal><h1>{title}</h1>{chips.filter(Boolean).length > 0 && <p className="dv-chips">{chips.filter((chip): chip is { icon: IconName; text: string } => !!chip).map((chip, i) => <span key={chip.text} className={`is-${(['green', 'violet', 'pink', 'amber'] as Accent[])[i % 4]}`}><Ico name={chip.icon} accent={(['green', 'violet', 'pink', 'amber'] as Accent[])[i % 4]} size="xs" />{chip.text}</span>)}</p>}{dates}</div>
    <DetailGallery photos={photos} name={name} lang={lang} />
    <div className="dv-grid"><div className="dv-main">{lead && <p className="dv-lead" data-reveal>{lead}</p>}{children}</div><aside className="dv-card" id="dv-contact" tabIndex={-1}>{bar && <button type="button" className="dv-card-close" data-sheet-close aria-label={lang === 'vi' ? 'Đóng' : 'Close'}>×</button>}{card}</aside></div>
    {after}
    {bar && <EnquirySheet summary={bar} open={barLabel || ''} />}
  </section>;
}
type RoomType = Building['types'][number];
function TypeCard({ type, lang, dateQuery = '' }: { type: RoomType; lang: Lang; dateQuery?: string }) {
  const t = copy[lang];
  return <article className="structure-card" data-reveal><Link href={`/${lang}/types/${type.id}${dateQuery}`}><img src={type.images[0]?.url || '/drm-stay-logo.png'} alt={type.images[0]?.alt || type.name} {...(type.images[0] ? imgSize(type.images[0]) : LOGO_SIZE)} /></Link><div><ul className="dv-minispecs">{type.areaSqm > 0 && <li className="is-green"><Ico name="area" accent="green" size="xs" />{type.areaSqm} m²</li>}{type.maxGuests > 0 && <li className="is-violet"><Ico name="users" accent="violet" size="xs" />{type.maxGuests}</li>}{type.beds > 0 && <li className="is-pink"><Ico name="bed" accent="pink" size="xs" />{type.beds}</li>}</ul><h3>{type.name}</h3>{type.priceFrom > 0 && <p className="structure-price">{t.fromPrice} {money(type.priceFrom)} ₫ / {t.month}</p>}<p className="dv-pills">{dateQuery && type.availableCount !== null ? <span className={`dv-pill ${type.availableCount > 0 ? 'is-ok' : 'is-bad'}`}><i />{type.availableCount > 0 ? `${type.availableCount} ${t.roomsFree}` : t.noFreeRooms}</span> : <span className="dv-pill is-info"><i />{type.rooms.length} {t.roomsCount}</span>}</p><Link className="structure-arrow" href={`/${lang}/types/${type.id}${dateQuery}`}>{t.viewType} →</Link></div></article>;
}
function TypeRooms({ type, lang, dateQuery }: { type: RoomType; lang: Lang; dateQuery: string }) {
  const t = copy[lang];
  return <section className="dv-block" data-reveal><h2><Ico name="home" accent="green" size="sm" />{t.roomsOfType}</h2>{groupByFloor(type.rooms).map(group => <div key={group.floor || 'none'} className="structure-type-floor"><h3>{group.floor ? `${t.viewByFloor} ${group.floor}` : ''}</h3><ul className="structure-room-chips">{group.rooms.map(entry => <li key={entry.id} className={dateQuery && entry.available !== null ? (entry.available ? 'is-available' : 'is-unavailable') : ''}><i aria-hidden="true" /><strong>{entry.name}</strong>{entry.monthlyPrice > 0 && entry.monthlyPrice !== type.priceFrom && <span>{money(entry.monthlyPrice)} ₫</span>}{dateQuery && entry.available !== null && <small>{entry.available ? t.available : t.unavailable}</small>}</li>)}</ul></div>)}</section>;
}
function ContentCards({ items, lang, images }: { items: ContentItem[]; lang: Lang; images: Record<string, ContentImage[]> }) { return items.length ? <div className="structure-content-grid">{items.map(item => <article className="structure-content-card" key={item.id}>{images[item.id]?.[0] && <img className="structure-content-cover" src={images[item.id][0].url} alt={images[item.id][0].alt || contentTitle(item, lang)} {...imgSize(images[item.id][0])} />}<h2>{contentTitle(item, lang)}</h2><p>{contentBody(item, lang)}</p>{images[item.id]?.length > 1 && <div className="structure-content-gallery">{images[item.id].slice(1).map(image => <img key={image.id} src={image.url} alt={image.alt || contentTitle(item, lang)} {...imgSize(image)} />)}</div>}</article>)}</div> : <p>{copy[lang].empty}</p>; }

async function catalog(checkIn: string | undefined, checkOut: string | undefined, lang: Lang) { try { return await getPublicCatalog(checkIn, checkOut, lang); } catch { return null; } }

export default async function Page({ params, searchParams }: { params: Promise<{ lang: string; path?: string[] }>; searchParams: Promise<{ checkIn?: string; checkOut?: string; sent?: string }> }) {
  const { lang: input, path: segments = [] } = await params;
  if (input !== 'vi' && input !== 'en') notFound();
  const lang: Lang = input, t = copy[lang], [section, id] = segments, q = await searchParams;
  const dateQuery = selectedDateQuery(q.checkIn, q.checkOut);
  const isPolicy = policySections.includes(section as PolicySection);
  const isContent = contentSections.includes(section as ContentSection);
  if (segments.length > 2 || (section && !['stays', 'buildings', 'rooms', 'types', 'contact', 'faq', ...contentSections, ...policySections].includes(section))) notFound();
  if ((section === 'buildings' || section === 'rooms' || section === 'types') && !id) notFound();
  if (id && !['buildings', 'rooms', 'types', 'journal'].includes(section)) notFound();
  const needsCatalog = !section || ['stays', 'buildings', 'rooms', 'types', 'contact'].includes(section);
  const data = needsCatalog ? await catalog(dateQuery ? q.checkIn : undefined, dateQuery ? q.checkOut : undefined, lang) : null;
  const landmarks = section === 'stays' ? await getPublicLandmarks() : [];
  const building = section === 'buildings' ? data?.buildings.find(item => item.id === id) : undefined;
  const room = section === 'rooms' ? data?.buildings.flatMap(item => item.rooms).find(item => item.id === id) : undefined;
  const roomType = section === 'types' ? data?.buildings.flatMap(item => item.types.map(entry => ({ ...entry, building: item }))).find(item => item.id === id) : undefined;
  if (section === 'rooms' && data && !room) {
    const typed = data.buildings.flatMap(item => item.types).find(item => item.rooms.some(entry => entry.id === id));
    if (typed) redirect(`/${lang}/types/${typed.id}${dateQuery}`);
  }
  if ((section === 'buildings' && data && !building) || (section === 'rooms' && data && !room) || (section === 'types' && data && !roomType)) notFound();
  const content = !section || isContent ? await getContentItems((section || 'journal') as ContentSection) : [];
  const contentImages = isContent ? await getContentImages(content) : {};
  const article = section === 'journal' && id ? content.find(item => item.id === id) : undefined;
  if (section === 'journal' && id && !article) notFound();
  const sectionTitles: Record<string,string> = { privacy: policies[lang].privacy.title, cancellation: policies[lang].cancellation.title, terms: policies[lang].terms.title, stays: t.navStays, services: t.navServices, partners: t.partnerTitle, about: t.navAbout, journal: t.navJournal, faq: t.navFaq, contact: t.navContact };
  const title = building ? propertyName(building.name) : roomType ? roomType.name : room?.name || (article ? contentTitle(article, lang) : sectionTitles[section || ''] || '');
  const contactChannels = await getContactChannels();
  const contactPhoto = section === 'contact' ? data?.buildings.map(item => buildingPhotos(item)[0]).find(Boolean) : undefined;
  const ld = env.PREVIEW_DEMO === '1' ? null : !section ? structuredData('home', lang) : building ? structuredData('building', lang, building) : room ? structuredData('room', lang, room, data?.buildings.find(item => item.rooms.some(r => r.id === room.id))) : roomType ? structuredData('type', lang, { id: roomType.id, name: roomType.name, description: roomType.description, monthlyPrice: roomType.priceFrom, areaSqm: roomType.areaSqm, maxGuests: roomType.maxGuests, beds: roomType.beds, images: roomType.images }, roomType.building) : null;
  const homeCrumb = { name: lang === 'vi' ? 'Trang chủ' : 'Home', path: `/${lang}` };
  const staysCrumb = { name: t.navStays, path: `/${lang}/stays` };
  const roomBuilding = room ? data?.buildings.find(item => item.rooms.some(r => r.id === room.id)) : undefined;
  const buildingCrumb = (item: Building) => ({ name: propertyName(item.name), path: `/${lang}/buildings/${item.id}` });
  const crumbs = env.PREVIEW_DEMO === '1' ? null : building ? breadcrumbData([homeCrumb, staysCrumb, { name: title, path: `/${lang}/buildings/${building.id}` }])
    : room ? breadcrumbData([homeCrumb, staysCrumb, ...(roomBuilding ? [buildingCrumb(roomBuilding)] : []), { name: title, path: `/${lang}/rooms/${room.id}` }])
    : roomType ? breadcrumbData([homeCrumb, staysCrumb, buildingCrumb(roomType.building), { name: title, path: `/${lang}/types/${roomType.id}` }])
    : article ? breadcrumbData([homeCrumb, { name: t.navJournal, path: `/${lang}/journal` }, { name: title, path: `/${lang}/journal/${article.id}` }]) : null;
  return <div className="structure-site" lang={lang}>{ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />}{crumbs && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />}{env.PREVIEW_DEMO === '1' && <p className="catalog-demo-banner">{t.demo}</p>}<Header lang={lang} segments={segments} dateQuery={dateQuery} />
    <main id="main-content"><PageTransition>
    {!section && <PublicHome lang={lang} buildings={data?.buildings || []} journal={content} />}
    {section === 'stays' && <><section className="structure-page-hero"><span className="eyebrow">DRM STAYS</span><h1>{title}</h1><DateRangeSearch lang={lang} checkIn={q.checkIn} checkOut={q.checkOut} /></section>{data?.buildings.length ? <MapExplorer lang={lang} dateQuery={dateQuery} buildings={data.buildings.map(item => ({ id: item.id, name: propertyName(item.name), address: item.address, imageUrl: buildingPhotos(item)[0]?.url || '/drm-stay-logo.png', imageAlt: buildingPhotos(item)[0]?.alt || propertyName(item.name), imageIsIllustrative: (buildingPhotos(item)[0] as { id?: string } | undefined)?.id?.startsWith('demo-') ?? false, photos: buildingPhotos(item).slice(0, 3).map(image => ({ url: image.url, alt: image.alt || propertyName(item.name) })), roomCount: buildingRoomCount(item), monthlyPrice: buildingFromPrice(item) || null, latitude: item.latitude, longitude: item.longitude, coordinateApproximate: item.coordinateApproximate }))} landmarks={landmarks.map(place => ({ id: place.id, name: lang === 'vi' ? place.nameVi : place.nameEn || place.nameVi, description: lang === 'vi' ? place.descriptionVi : place.descriptionEn || place.descriptionVi, latitude: place.latitude, longitude: place.longitude, buildingIds: place.buildingIds }))} /> : <section className="structure-section"><p>{data ? t.noBuildings : t.noResults}</p></section>}</>}
    {section === 'buildings' && (building ? <DetailShell lang={lang} crumbs={[[t.navStays, `/${lang}/stays${dateQuery}`]]} title={title} chips={[building.address ? { icon: 'home', text: building.address } : null, building.propertyType ? { icon: 'key', text: building.propertyType } : null, building.floorCount ? { icon: 'area', text: `${building.floorCount} ${t.floors.toLowerCase()}` } : null]} dates={<SelectedDates lang={lang} checkIn={q.checkIn} checkOut={q.checkOut} />} photos={building.images.length ? building.images : building.types[0]?.images || building.rooms[0]?.images || []} name={title} lead={building.description}
      card={<><h2>{t.aboutBuilding}</h2>{building.address && <p className="dv-card-address">{building.address}</p>}{(() => { const price = Math.min(...[...building.types.map(entry => entry.priceFrom), ...building.rooms.map(entry => entry.monthlyPrice)].filter(value => value > 0), Infinity); return price !== Infinity ? <div className="dv-card-price">{t.fromPrice} <strong>{money(price)} ₫</strong><span>/ {t.month}</span></div> : null; })()}<a className="dv-button" href="#dv-types">{t.roomTypes}</a><Link className="dv-button is-ghost" href={`/${lang}/contact`}>{t.navContact}</Link></>}
      after={<>{building.types.length > 0 && <section className="dv-list" id="dv-types"><h2 data-reveal><Ico name="home" accent="green" size="sm" />{t.roomTypes}</h2><div className="structure-grid">{building.types.map(item => <TypeCard key={item.id} type={item} lang={lang} dateQuery={dateQuery} />)}</div></section>}{building.rooms.length > 0 && <section className="dv-list"><h2 data-reveal><Ico name="key" accent="amber" size="sm" />{building.types.length ? t.otherRooms : t.rooms}</h2><div className="structure-grid">{building.rooms.map(item => <RoomCard key={item.id} room={item} lang={lang} dateQuery={dateQuery} />)}</div></section>}{!building.rooms.length && !building.types.length && <p>{t.noRooms}</p>}</>}>
      <DetailBlock title={t.info} icon="info" accent="blue"><StatTiles items={[{ icon: 'home', accent: 'green', label: t.propertyType, value: building.propertyType }, { icon: 'area', accent: 'blue', label: t.buildingArea, value: building.areaSqm ? `${building.areaSqm} m²` : '' }, { icon: 'plan', accent: 'violet', label: t.floors, value: building.floorCount }]} /></DetailBlock>
      {building.amenities.length > 0 && <DetailBlock title={t.amenities} icon="sparkle" accent="teal"><FeatureGrid items={building.amenities} more={n => `${t.showMore} ${n}`} /></DetailBlock>}
      {building.services.length > 0 && <DetailBlock title={t.services} icon="key" accent="amber"><FeatureGrid items={building.services} more={n => `${t.showMore} ${n}`} /></DetailBlock>}
      {building.rules && <DetailBlock title={t.rules} icon="shield" accent="green"><RuleRows text={building.rules} /></DetailBlock>}
      {building.floorplans.length > 0 && <DetailBlock title={t.floorplan} icon="plan" accent="violet"><Floorplans title={t.floorplan} items={building.floorplans} bare /></DetailBlock>}
    </DetailShell> : <section className="structure-page-hero"><Link className="structure-back" href={`/${lang}/stays${dateQuery}`}>← {t.allBuildings}</Link><h1>{title || t.noResults}</h1></section>)}
    {section === 'types' && (roomType ? <DetailShell lang={lang} crumbs={[[t.navStays, `/${lang}/stays${dateQuery}`], [propertyName(roomType.building.name), `/${lang}/buildings/${roomType.building.id}${dateQuery}`]]} title={title} chips={[roomType.areaSqm ? { icon: 'area', text: `${roomType.areaSqm} m²` } : null, roomType.maxGuests ? { icon: 'users', text: `${roomType.maxGuests} ${t.guests.toLowerCase()}` } : null, roomType.beds ? { icon: 'bed', text: `${roomType.beds} ${t.beds.toLowerCase()}` } : null]} dates={<SelectedDates lang={lang} checkIn={q.checkIn} checkOut={q.checkOut} />} photos={roomType.images} name={roomType.name} lead={roomType.description}
      bar={roomType.priceFrom > 0 ? `${t.fromPrice} ${money(roomType.priceFrom)} ₫ / ${t.month}` : t.contactTitle} barLabel={t.contactTitle}
      card={<>{roomType.priceFrom > 0 && <div className="dv-card-price">{t.fromPrice} <strong>{money(roomType.priceFrom)} ₫</strong><span>/ {t.month}</span></div>}<FactRows rows={[[t.deposit, roomType.depositVnd ? `${money(roomType.depositVnd)} ₫` : ''], [t.minStay, roomType.minStayMonths ? `${roomType.minStayMonths} ${t.month}` : '']]} />{dateQuery && roomType.availableCount !== null && <p className="dv-pills"><span className={`dv-pill ${roomType.availableCount > 0 ? 'is-ok' : 'is-bad'}`}><i />{roomType.availableCount > 0 ? `${roomType.availableCount} ${t.roomsFree}` : t.noFreeRooms}</span></p>}<h2>{t.contactTitle}</h2><p>{t.contactText}</p>{q.sent === '1' && <p role="status">{t.received}</p>}<ContactForm lang={lang} typeId={roomType.id} checkIn={dateQuery ? q.checkIn : undefined} checkOut={dateQuery ? q.checkOut : undefined} /></>}>
      <DetailBlock title={t.info} icon="info" accent="blue"><StatTiles items={[{ icon: 'area', accent: 'green', label: t.area, value: roomType.areaSqm ? `${roomType.areaSqm} m²` : '' }, { icon: 'bed', accent: 'pink', label: t.beds, value: roomType.beds }, { icon: 'bath', accent: 'blue', label: t.bathrooms, value: roomType.bathrooms }, { icon: 'users', accent: 'violet', label: t.guests, value: roomType.maxGuests }, { icon: 'wallet', accent: 'amber', label: t.deposit, value: roomType.depositVnd ? `${money(roomType.depositVnd)} ₫` : '' }, { icon: 'calendar', accent: 'teal', label: t.minStay, value: roomType.minStayMonths ? `${roomType.minStayMonths} ${t.month}` : '' }]} /></DetailBlock>
      {roomType.furniture.length > 0 && <DetailBlock title={t.furniture} icon="bed" accent="pink"><FeatureGrid items={roomType.furniture} more={n => `${t.showMore} ${n}`} /></DetailBlock>}
      {roomType.amenities.length > 0 && <DetailBlock title={t.amenities} icon="sparkle" accent="teal"><FeatureGrid items={roomType.amenities} more={n => `${t.showMore} ${n}`} /></DetailBlock>}
      {roomType.serviceFees && <DetailBlock title={t.serviceFees} icon="wallet" accent="amber"><RuleRows text={roomType.serviceFees} /></DetailBlock>}
      {roomType.rules && <DetailBlock title={t.rules} icon="shield" accent="green"><RuleRows text={roomType.rules} /></DetailBlock>}
      {roomType.floorplans.length > 0 && <DetailBlock title={t.floorplan} icon="plan" accent="violet"><Floorplans title={t.floorplan} items={roomType.floorplans} bare /></DetailBlock>}
      <TypeRooms type={roomType} lang={lang} dateQuery={dateQuery} />
    </DetailShell> : <section className="structure-page-hero"><h1>{title || t.noResults}</h1></section>)}
    {section === 'rooms' && (room ? <DetailShell lang={lang} crumbs={[[t.navStays, `/${lang}/stays${dateQuery}`]]} title={title} chips={[room.type ? { icon: 'key', text: room.type } : null, room.floor ? { icon: 'home', text: `${t.floor} ${room.floor}` } : null, room.areaSqm ? { icon: 'area', text: `${room.areaSqm} m²` } : null, room.maxGuests ? { icon: 'users', text: `${room.maxGuests} ${t.guests.toLowerCase()}` } : null]} dates={<SelectedDates lang={lang} checkIn={q.checkIn} checkOut={q.checkOut} />} photos={room.images} name={room.name} lead={room.description}
      bar={room.monthlyPrice > 0 ? `${money(room.monthlyPrice)} ₫ / ${t.month}` : t.contactTitle} barLabel={t.contactTitle}
      card={<>{room.monthlyPrice > 0 && <div className="dv-card-price"><strong>{money(room.monthlyPrice)} ₫</strong><span>/ {t.month}</span></div>}<FactRows rows={[[t.deposit, room.depositVnd ? `${money(room.depositVnd)} ₫` : ''], [t.minStay, room.minStayMonths ? `${room.minStayMonths} ${t.month}` : '']]} />{dateQuery && room.available !== null && <p className="dv-pills"><span className={`dv-pill ${room.available ? 'is-ok' : 'is-bad'}`}><i />{room.available ? t.available : t.unavailable}</span></p>}<h2>{t.contactTitle}</h2><p>{t.contactText}</p>{q.sent === '1' && <p role="status">{t.received}</p>}<ContactForm lang={lang} roomId={room.id} checkIn={dateQuery ? q.checkIn : undefined} checkOut={dateQuery ? q.checkOut : undefined} /></>}>
      <DetailBlock title={t.info} icon="info" accent="blue"><StatTiles items={[{ icon: 'area', accent: 'green', label: t.area, value: room.areaSqm ? `${room.areaSqm} m²` : '' }, { icon: 'bed', accent: 'pink', label: t.beds, value: room.beds }, { icon: 'bath', accent: 'blue', label: t.bathrooms, value: room.bathrooms }, { icon: 'users', accent: 'violet', label: t.guests, value: room.maxGuests }, { icon: 'wallet', accent: 'amber', label: t.deposit, value: room.depositVnd ? `${money(room.depositVnd)} ₫` : '' }, { icon: 'calendar', accent: 'teal', label: t.minStay, value: room.minStayMonths ? `${room.minStayMonths} ${t.month}` : '' }]} /></DetailBlock>
      {room.furniture.length > 0 && <DetailBlock title={t.furniture} icon="bed" accent="pink"><FeatureGrid items={room.furniture} more={n => `${t.showMore} ${n}`} /></DetailBlock>}
      {room.amenities.length > 0 && <DetailBlock title={t.amenities} icon="sparkle" accent="teal"><FeatureGrid items={room.amenities} more={n => `${t.showMore} ${n}`} /></DetailBlock>}
      {room.serviceFees && <DetailBlock title={t.serviceFees} icon="wallet" accent="amber"><RuleRows text={room.serviceFees} /></DetailBlock>}
      {room.rules && <DetailBlock title={t.rules} icon="shield" accent="green"><RuleRows text={room.rules} /></DetailBlock>}
      {room.floorplans.length > 0 && <DetailBlock title={t.floorplan} icon="plan" accent="violet"><Floorplans title={t.floorplan} items={room.floorplans} bare /></DetailBlock>}
    </DetailShell> : <section className="structure-page-hero"><h1>{title || t.noResults}</h1></section>)}
    {['about','services','partners','journal','faq','contact'].includes(section || '') && <><section className="structure-page-hero"><span className="eyebrow">DRM STAYS</span><h1>{title}</h1>{section === 'partners' && <p>{lang === 'vi' ? 'Chia sẻ thông tin tòa nhà và nhu cầu hợp tác. Chúng tôi sẽ liên hệ để trao đổi phương án phù hợp.' : 'Share your building details and partnership goals. Our team will contact you to discuss a suitable approach.'}</p>}</section><section className="structure-section structure-content">{section === 'about' && <img className="structure-logo-large" src="/drm-stay-logo.png" alt="DRM STAY — Your Stay Our Care" {...LOGO_SIZE} />}{section === 'journal' ? article ? <><Link className="structure-back" href={`/${lang}/journal`}>← {t.backJournal}</Link><ContentCards items={[article]} lang={lang} images={contentImages} /></> : content.length ? <div>{content.map(item => <Link className="structure-article-link" key={item.id} href={`/${lang}/journal/${item.id}`}>{contentImages[item.id]?.[0] && <img src={contentImages[item.id][0].url} alt={contentImages[item.id][0].alt || contentTitle(item,lang)} {...imgSize(contentImages[item.id][0])} />}<strong>{contentTitle(item,lang)}</strong><span>{contentBody(item,lang).slice(0,180)}…</span></Link>)}</div> : <p>{t.empty}</p> : isContent && <ContentCards items={content} lang={lang} images={contentImages} />}{section === 'partners' && <>{q.sent === '1' && <p role="status">{t.received}</p>}<form className="structure-form" action="/api/partner-inquiries" method="post"><input type="hidden" name="lang" value={lang} /><label>{t.name}<input name="name" required maxLength={100} /></label><label>{t.phone}<input name="phone" required maxLength={24} /></label><label>{t.email}<input name="email" type="email" maxLength={254} /></label><label>{t.partnerProperty}<input name="property" maxLength={200} /></label><label>{t.message}<textarea name="message" rows={5} maxLength={2000} /></label><label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label><button>{t.partnerSend}</button><small><Link href={`/${lang}/privacy`}>{lang === 'vi' ? 'Chính sách quyền riêng tư' : 'Privacy Policy'}</Link></small></form></>}{section === 'contact' && <>{q.sent === '1' && <p role="status">{t.received}</p>}<p>{t.contactText}</p><ContactForm lang={lang} roomId="" />{contactPhoto && <img className="editorial-contact-photo" src={contactPhoto.url} alt={contactPhoto.alt || "DRM Stays apartment"} loading="lazy" {...imgSize(contactPhoto)} />}</>}</section></>}
    {isPolicy && <><section className="structure-page-hero"><span className="eyebrow">DRM STAYS</span><h1>{policies[lang][section as PolicySection].title}</h1><p>{policies[lang][section as PolicySection].intro}</p></section><section className="structure-section structure-content structure-policy">{policies[lang][section as PolicySection].blocks.map(block => <section className="structure-detail-block" key={block.heading}><h2>{block.heading}</h2>{block.paragraphs.map(text => <p key={text}>{text}</p>)}</section>)}<p><small>{lang === 'vi' ? 'Cập nhật' : 'Last updated'}: {POLICIES_UPDATED}</small></p></section></>}
    </PageTransition></main>
    <ScrollReveal />
    <Footer lang={lang} />
    <QuickContact lang={lang} preview={env.PREVIEW_DEMO === '1'} channels={[
      { name: 'WhatsApp', mark: 'W', url: contactChannels.whatsapp.published ? contactChannels.whatsapp.url : undefined },
      { name: 'Telegram', mark: 'T', url: contactChannels.telegram.published ? contactChannels.telegram.url : undefined },
      { name: 'Facebook', mark: 'f', url: contactChannels.facebook.published ? contactChannels.facebook.url : undefined },
      { name: 'Zalo', mark: 'Z', url: contactChannels.zalo.published ? contactChannels.zalo.url : undefined },
    ]} />
  </div>;
}
