import Link from 'next/link';
import { ArrowUpRight, Building2, ClipboardList, FileBarChart, HardHat, KeyRound, Search, Users } from 'lucide-react';
import type { ContentItem } from '@/lib/site-content';
import { buildingFromPrice, buildingPhotos, buildingRoomCount } from '@/lib/building-media';
import { buildingStatusLabel } from '@/lib/building-status';
import { CONTACT, propertyName } from '@/lib/site';
import { imgSize } from '@/lib/image-url';
import { CountUp } from '@/components/smooth-motion';
import { BeforeAfter, Lifecycle } from '@/components/investor-motion';

type Lang = 'vi' | 'en';
type Photo = { url: string; alt: string; width?: number; height?: number };
export type InvestorBuilding = {
  id: string; name: string; address: string; status: 'open' | 'building' | 'soon'; openMonth: string;
  images: Photo[]; renders: Photo[]; progressPhotos: Photo[];
  rooms: Array<{ monthlyPrice: number; images: Photo[] }>; types: Array<{ images: Photo[]; priceFrom: number; rooms: unknown[] }>;
};

const words = {
  vi: {
    kicker: 'DÀNH CHO CHỦ ĐẦU TƯ', cta: 'Nhận tư vấn', ctaSecondary: 'Xem tòa đang vận hành', open: 'Đang vận hành', rooms: 'phòng',
    buildingsTitle: 'Các tòa do DRM Stays vận hành và phát triển',
    metricsLabel: 'CON SỐ', metricsTitle: 'Những con số nói lên cách chúng tôi làm việc', metricsLead: 'Số liệu do DRM Stays cung cấp, cập nhật theo tình hình vận hành.',
    liveBuildings: 'tòa nhà đang vận hành', liveRooms: 'phòng đang được quản lý',
    lifeLabel: 'TRỌN VÒNG ĐỜI', lifeTitle: 'Một đối tác, từ chọn mua đến báo cáo hằng tháng', lifeLead: 'Bạn có thể giao toàn bộ hoặc chỉ những phần bạn cần.',
    compareLabel: 'TỪ BẢN VẼ ĐẾN VẬN HÀNH', compareTitle: 'Thấy bất động sản của bạn thay đổi', compareBefore: '3D render', compareAfter: 'Hoàn thiện', compareHint: 'Kéo để so sánh ảnh 3D và ảnh thực tế', compareNote: 'Ảnh 3D mang tính minh họa.',
    modelsLabel: 'HÌNH THỨC HỢP TÁC', modelsTitle: 'Chọn phần bạn cần', modelA: 'Tư vấn', modelAText: 'Dành cho chủ đầu tư cần ý kiến chuyên môn ở từng giai đoạn.', modelB: 'Vận hành trọn gói', modelBText: 'Dành cho chủ đầu tư muốn tài sản tạo dòng tiền mà không phải tự điều hành.',
    processLabel: 'CÁCH BẮT ĐẦU', processTitle: 'Bốn bước để bắt đầu', steps: [['Gửi thông tin', 'Cho chúng tôi biết về tòa nhà và nhu cầu của bạn.'], ['Chúng tôi liên hệ', 'Đội ngũ gọi lại trong giờ làm việc, 8:00 đến 17:00.'], ['Đề xuất và báo phí', 'Phương án và phí được xây dựng riêng cho từng dự án.'], ['Bắt đầu hợp tác', 'Thống nhất phạm vi và triển khai.']],
    formLabel: 'LIÊN HỆ HỢP TÁC', formTitle: 'Cùng bàn về tòa nhà của bạn', formLead: 'Chia sẻ thông tin tòa nhà và nhu cầu hợp tác. Chúng tôi sẽ liên hệ để trao đổi phương án phù hợp.',
    hours: 'Giờ làm việc', hoursValue: '8:00 – 17:00', phone: 'Điện thoại', email: 'Email', privacy: 'Thông tin chỉ dùng để liên hệ hợp tác.', policy: 'Chính sách quyền riêng tư',
  },
  en: {
    kicker: 'FOR INVESTORS', cta: 'Get advice', ctaSecondary: 'See buildings we operate', open: 'Open', rooms: 'rooms',
    buildingsTitle: 'Buildings DRM Stays operates and develops',
    metricsLabel: 'IN NUMBERS', metricsTitle: 'The numbers behind how we work', metricsLead: 'Figures supplied by DRM Stays and updated as operations change.',
    liveBuildings: 'buildings in operation', liveRooms: 'rooms under management',
    lifeLabel: 'FULL LIFECYCLE', lifeTitle: 'One partner, from purchase to the monthly report', lifeLead: 'Hand over everything, or only the parts you need.',
    compareLabel: 'FROM DRAWING TO OPERATION', compareTitle: 'See a property change', compareBefore: '3D render', compareAfter: 'Completed', compareHint: 'Drag to compare the 3D render with the finished building', compareNote: '3D images are illustrative.',
    modelsLabel: 'WAYS TO WORK TOGETHER', modelsTitle: 'Choose the part you need', modelA: 'Advisory', modelAText: 'For owners who want expert input at each stage.', modelB: 'Full operation', modelBText: 'For owners who want their property to earn without running it themselves.',
    processLabel: 'HOW TO START', processTitle: 'Four steps to begin', steps: [['Send your details', 'Tell us about your building and what you need.'], ['We get in touch', 'Our team calls you back during office hours, 8:00–17:00.'], ['Proposal and fees', 'A plan and fees built for your project.'], ['Start working together', 'Agree the scope and begin.']],
    formLabel: 'GET IN TOUCH', formTitle: 'Let’s talk about your building', formLead: 'Share your building details and partnership goals. We will get in touch to discuss a suitable approach.',
    hours: 'Office hours', hoursValue: '8:00 – 17:00', phone: 'Phone', email: 'Email', privacy: 'Your details are used only to contact you about working together.', policy: 'Privacy Policy',
  },
} as const;

const stageIcons = [Search, HardHat, KeyRound, Users, FileBarChart];
const pick = (item: ContentItem, lang: Lang) => ({ title: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, body: lang === 'vi' ? item.body_vi : item.body_en || item.body_vi });

/** "75%" -> a counting number with its suffix; anything that is not a number is shown as written. */
function Metric({ value }: { value: string }) {
  const match = /^(\d+)(.*)$/.exec(value.trim());
  return match ? <CountUp to={Number(match[1])} suffix={match[2]} /> : <strong>{value}</strong>;
}

export function InvestorPage({ lang, title, items, metrics, buildings, sent, labels }: {
  lang: Lang; title: string; items: ContentItem[]; metrics: ContentItem[]; buildings: InvestorBuilding[]; sent: boolean;
  labels: { name: string; phone: string; email: string; property: string; message: string; send: string; received: string };
}) {
  const w = words[lang];
  const byId = (id: string) => items.find(item => item.id === id);
  const intro = byId('sample-partner-1'), fee = byId('sample-partner-2');
  const stageIds = ['sample-partner-3', 'sample-partner-4', 'sample-partner-5', 'sample-partner-6', 'sample-partner-7'];
  const known = new Set(['sample-partner-1', 'sample-partner-2', 'sample-partner-8', ...stageIds]);
  const stages = [...stageIds.map(byId), ...items.filter(item => !known.has(item.id))].filter((item): item is ContentItem => !!item);
  const operating = buildings.filter(building => building.status === 'open');
  const liveRooms = operating.reduce((sum, building) => sum + buildingRoomCount(building), 0);
  const numbers = [
    ...metrics.map(item => ({ id: item.id, value: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, label: pick(item, lang).body })),
    ...(operating.length ? [{ id: 'live-buildings', value: String(operating.length), label: w.liveBuildings }] : []),
    ...(liveRooms ? [{ id: 'live-rooms', value: String(liveRooms), label: w.liveRooms }] : []),
  ];
  const compareBuilding = buildings.find(building => building.renders.length && (building.images.length || building.rooms.some(room => room.images.length) || building.types.some(type => type.images.length)));
  const compareAfter = compareBuilding ? buildingPhotos(compareBuilding).find(photo => !compareBuilding.renders.some(render => render.url === photo.url)) : undefined;

  return <div className="inv">
    <section className="inv-hero structure-section">
      <div className="inv-hero-head">
        <div><span className="editorial-section-label">{w.kicker}</span><h1>{title}</h1></div>
        <div className="inv-hero-side">
          {intro && <p>{pick(intro, lang).body}</p>}
          <div className="inv-hero-actions"><a className="inv-cta" href="#inv-form">{w.cta}<ArrowUpRight size={18} aria-hidden="true" /></a>{buildings.length > 0 && <a className="editorial-text-link" href="#inv-buildings">{w.ctaSecondary}<span aria-hidden="true">↓</span></a>}</div>
        </div>
      </div>
    </section>

    {buildings.length > 0 && <section className="inv-buildings" id="inv-buildings" aria-label={w.buildingsTitle}>
      <div className="inv-building-track">{buildings.map(building => {
        const photo = buildingPhotos(building)[0] || building.renders[0] || building.progressPhotos[0];
        const status = buildingStatusLabel(building.status, building.openMonth, lang) || w.open;
        const count = buildingRoomCount(building);
        return <Link className="inv-building" href={`/${lang}/buildings/${building.id}`} key={building.id}>
          {photo ? <img src={photo.url} alt={photo.alt || propertyName(building.name)} loading="lazy" {...imgSize(photo)} /> : <span className="inv-building-empty" aria-hidden="true" />}
          <span className={`inv-building-tag is-${building.status}`}>{status}</span>
          <div className="inv-building-info"><h3>{propertyName(building.name)}</h3><p>{building.address}</p>{count > 0 && <small>{count} {w.rooms}{buildingFromPrice(building) ? '' : ''}</small>}</div>
          <ArrowUpRight className="inv-building-arrow" size={20} aria-hidden="true" />
        </Link>;
      })}</div>
    </section>}

    {numbers.length > 0 && <section className="inv-metrics" aria-labelledby="inv-metrics-title" data-reveal>
      <div className="inv-metrics-inner structure-section">
        <div className="inv-section-head is-dark"><span className="editorial-section-label">{w.metricsLabel}</span><h2 id="inv-metrics-title">{w.metricsTitle}</h2><p>{w.metricsLead}</p></div>
        <dl className="inv-numbers">{numbers.map(number => <div key={number.id}><dt><Metric value={number.value} /></dt><dd>{number.label}</dd></div>)}</dl>
      </div>
    </section>}

    {stages.length > 0 && <section className="inv-life structure-section" aria-labelledby="inv-life-title" data-reveal>
      <div className="inv-section-head"><span className="editorial-section-label">{w.lifeLabel}</span><h2 id="inv-life-title">{w.lifeTitle}</h2><p>{w.lifeLead}</p></div>
      <Lifecycle steps={stages.map(stage => pick(stage, lang))} />
    </section>}

    {compareBuilding && compareAfter && <section className="inv-compare-section structure-section" aria-labelledby="inv-compare-title" data-reveal>
      <div className="inv-section-head"><span className="editorial-section-label">{w.compareLabel}</span><h2 id="inv-compare-title">{w.compareTitle}</h2><p>{propertyName(compareBuilding.name)} · {w.compareNote}</p></div>
      <BeforeAfter before={compareBuilding.renders[0].url} after={compareAfter.url} beforeLabel={w.compareBefore} afterLabel={w.compareAfter} alt={propertyName(compareBuilding.name)} hint={w.compareHint} />
    </section>}

    <section className="inv-models structure-section" aria-labelledby="inv-models-title" data-reveal>
      <div className="inv-section-head"><span className="editorial-section-label">{w.modelsLabel}</span><h2 id="inv-models-title">{w.modelsTitle}</h2>{fee && <p>{pick(fee, lang).body}</p>}</div>
      <div className="inv-model-grid">
        <article><span className="inv-model-icon" aria-hidden="true"><ClipboardList size={26} /></span><h3>{w.modelA}</h3><p>{w.modelAText}</p><ul>{[stages[0], stages[1]].filter(Boolean).map(stage => <li key={stage.id}>{pick(stage, lang).title}</li>)}</ul></article>
        <article className="is-featured"><span className="inv-model-icon" aria-hidden="true"><Building2 size={26} /></span><h3>{w.modelB}</h3><p>{w.modelBText}</p><ul>{stages.slice(2, 5).map(stage => <li key={stage.id}>{pick(stage, lang).title}</li>)}</ul></article>
      </div>
    </section>

    <section className="inv-process structure-section" aria-labelledby="inv-process-title" data-reveal>
      <div className="inv-section-head"><span className="editorial-section-label">{w.processLabel}</span><h2 id="inv-process-title">{w.processTitle}</h2></div>
      <ol className="inv-process-list">{w.steps.map(([step, text], index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><h3>{step}</h3><p>{text}</p></li>)}</ol>
    </section>

    <section className="inv-form-section structure-section" id="inv-form" aria-labelledby="inv-form-title" data-reveal>
      <div className="inv-form-info">
        <span className="editorial-section-label">{w.formLabel}</span><h2 id="inv-form-title">{w.formTitle}</h2><p>{w.formLead}</p>
        <dl><div><dt>{w.phone}</dt><dd><a href={`tel:${CONTACT.phoneIntl}`}>{CONTACT.phoneDisplay}</a></dd></div><div><dt>{w.email}</dt><dd><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></dd></div><div><dt>{w.hours}</dt><dd>{w.hoursValue}</dd></div></dl>
      </div>
      <div className="inv-form-card">
        {sent && <p role="status" className="inv-sent">{labels.received}</p>}
        <form className="structure-form" action="/api/partner-inquiries" method="post"><input type="hidden" name="lang" value={lang} />
          <label>{labels.name}<input name="name" required maxLength={100} /></label>
          <label>{labels.phone}<input name="phone" required maxLength={24} /></label>
          <label>{labels.email}<input name="email" type="email" maxLength={254} /></label>
          <label>{labels.property}<input name="property" maxLength={200} /></label>
          <label>{labels.message}<textarea name="message" rows={5} maxLength={2000} /></label>
          <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <button>{labels.send}</button>
          <small>{w.privacy} <Link href={`/${lang}/privacy`}>{w.policy}</Link></small>
        </form>
      </div>
    </section>
  </div>;
}
