import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ContentItem, ContentImage } from '@/lib/site-content';
import { buildingPhotos, buildingRoomCount } from '@/lib/building-media';
import { buildingStatusLabel } from '@/lib/building-status';
import { propertyName } from '@/lib/site';
import { imgSize } from '@/lib/image-url';
import { CountUp } from '@/components/smooth-motion';
import { BeforeAfter } from '@/components/investor-motion';
import { Frame, Staggered } from '@/components/about-page';

type Lang = 'vi' | 'en';
type Photo = { url: string; alt: string; width?: number; height?: number };
export type InvestorBuilding = {
  id: string; name: string; address: string; status: 'open' | 'building' | 'soon'; openMonth: string;
  images: Photo[]; renders: Photo[]; progressPhotos: Photo[];
  rooms: Array<{ monthlyPrice: number; images: Photo[] }>; types: Array<{ images: Photo[]; priceFrom: number; rooms: unknown[] }>;
};

const words = {
  vi: {
    cta: 'Nhận tư vấn', ctaSecond: 'Xem cách làm',
    howHead: ['CÁCH', 'CHÚNG TÔI LÀM'], howLabel: 'TRỌN VÒNG ĐỜI TÀI SẢN', howLead: 'Bạn có thể giao toàn bộ hoặc chỉ những phần bạn cần.',
    modelsHead: ['HÌNH THỨC', 'HỢP TÁC'], modelsLabel: 'CHỌN PHẦN BẠN CẦN',
    modelA: 'Tư vấn', modelAText: 'Dành cho chủ đầu tư cần ý kiến chuyên môn ở từng giai đoạn.', modelB: 'Vận hành trọn gói', modelBText: 'Dành cho chủ đầu tư muốn tài sản tạo dòng tiền mà không phải tự điều hành.', feeLabel: 'Phí hợp tác',
    reportHead: ['BÁO CÁO', 'CHO CHỦ NHÀ'], reportLabel: 'MINH BẠCH TỪNG KHOẢN', reportLead: 'Mỗi chủ nhà nhận một đường dẫn riêng đến báo cáo của chính tài sản mình, cập nhật theo tháng và theo năm.',
    reportItems: ['Doanh thu', 'Chi tiết thu và chi', 'Chi phí vận hành', 'Lợi nhuận'],
    numbersHead: ['CON SỐ', 'THỰC TẾ'], numbersLabel: 'ĐANG VẬN HÀNH', asOf: 'tính đến hiện tại', reportsPerYear: 'báo cáo tài chính mỗi năm cho chủ đầu tư',
    area: 'Khu vực', rooms: 'Phòng', types: 'Loại phòng', status: 'Trạng thái', roomsUnit: 'phòng', open: 'Đang vận hành', view: 'Xem tòa nhà',
    compareLabel: 'TỪ BẢN VẼ ĐẾN VẬN HÀNH', compareBefore: '3D render', compareAfter: 'Hoàn thiện', compareHint: 'Kéo để so sánh ảnh 3D và ảnh thực tế', compareNote: 'Ảnh 3D mang tính minh họa.',
    faqHead: ['CÂU HỎI', 'THƯỜNG GẶP'], faqLabel: 'DÀNH CHO CHỦ ĐẦU TƯ',
    faq: [
      ['Phí hợp tác được tính thế nào?', 'Mức phí phụ thuộc quy mô và phạm vi công việc của từng dự án. DRM Stays gửi báo giá riêng sau khi trao đổi với bạn.'],
      ['Tôi theo dõi doanh thu bằng cách nào?', 'Bạn nhận một đường dẫn riêng đến báo cáo của tài sản mình, gồm doanh thu, chi tiết thu và chi, chi phí và lợi nhuận, cập nhật theo tháng và theo năm.'],
      ['Tôi có thể chỉ thuê tư vấn không?', 'Có. Bạn chọn tư vấn ở từng giai đoạn hoặc giao trọn gói vận hành, tùy nhu cầu.'],
      ['Tôi cần chuẩn bị gì để bắt đầu?', 'Chỉ cần cho chúng tôi biết địa chỉ và tình trạng của bất động sản. Đội ngũ sẽ liên hệ lại trong giờ làm việc, 8:00 đến 17:00.'],
    ],
    formHead: ['GỬI', 'THÔNG TIN'], formLabel: 'LIÊN HỆ HỢP TÁC', formLead: 'Chia sẻ thông tin tòa nhà và nhu cầu hợp tác. Chúng tôi sẽ liên hệ để trao đổi phương án phù hợp.',
    steps: [['Gửi thông tin', 'Cho chúng tôi biết về tòa nhà và nhu cầu của bạn.'], ['Chúng tôi liên hệ', 'Đội ngũ gọi lại trong giờ làm việc.'], ['Đề xuất và báo phí', 'Phương án và phí xây dựng riêng cho dự án.'], ['Bắt đầu hợp tác', 'Thống nhất phạm vi và triển khai.']],
    privacy: 'Thông tin chỉ dùng để liên hệ hợp tác.', policy: 'Chính sách quyền riêng tư',
  },
  en: {
    cta: 'Get advice', ctaSecond: 'See how we work',
    howHead: ['HOW', 'WE WORK'], howLabel: 'THE WHOLE LIFE OF AN ASSET', howLead: 'Hand over everything, or only the parts you need.',
    modelsHead: ['WAYS TO', 'WORK TOGETHER'], modelsLabel: 'CHOOSE THE PART YOU NEED',
    modelA: 'Advisory', modelAText: 'For owners who want expert input at each stage.', modelB: 'Full operation', modelBText: 'For owners who want their property to earn without running it themselves.', feeLabel: 'Fees',
    reportHead: ['OWNER', 'REPORTS'], reportLabel: 'EVERY LINE IN THE OPEN', reportLead: 'Each owner gets a private link to the report for their own property, updated monthly and yearly.',
    reportItems: ['Revenue', 'Income and expense detail', 'Operating costs', 'Profit'],
    numbersHead: ['REAL', 'NUMBERS'], numbersLabel: 'IN OPERATION', asOf: 'as of now', reportsPerYear: 'financial reports a year for owners',
    area: 'Area', rooms: 'Rooms', types: 'Room types', status: 'Status', roomsUnit: 'rooms', open: 'Open', view: 'View building',
    compareLabel: 'FROM DRAWING TO OPERATION', compareBefore: '3D render', compareAfter: 'Completed', compareHint: 'Drag to compare the 3D render with the finished building', compareNote: '3D images are illustrative.',
    faqHead: ['COMMON', 'QUESTIONS'], faqLabel: 'FOR INVESTORS',
    faq: [
      ['How are fees worked out?', 'Fees depend on the scale and scope of each project. DRM Stays sends a quote after talking with you.'],
      ['How do I follow the revenue?', 'You receive a private link to the report for your property: revenue, income and expense detail, costs and profit, updated monthly and yearly.'],
      ['Can I hire advice only?', 'Yes. Choose advice at each stage, or hand over full operation, as you prefer.'],
      ['What do I need to get started?', 'Just tell us the address and condition of the property. Our team will call you back during office hours, 8:00–17:00.'],
    ],
    formHead: ['SEND', 'YOUR DETAILS'], formLabel: 'GET IN TOUCH', formLead: 'Share your building details and partnership goals. We will get in touch to discuss a suitable approach.',
    steps: [['Send your details', 'Tell us about your building and what you need.'], ['We get in touch', 'Our team calls you back during office hours.'], ['Proposal and fees', 'A plan and fees built for your project.'], ['Start working together', 'Agree the scope and begin.']],
    privacy: 'Your details are used only to contact you about working together.', policy: 'Privacy Policy',
  },
} as const;

const pick = (item: ContentItem | undefined, lang: Lang) => item ? { title: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, body: lang === 'vi' ? item.body_vi : item.body_en || item.body_vi } : { title: '', body: '' };
const parseNumber = (value: string) => { const match = /^(\d+)(.*)$/.exec(value.trim()); return match ? { to: Number(match[1]), suffix: match[2] } : null; };

export function InvestorPage({ lang, title, items, metrics, buildings, images, sent, labels }: {
  lang: Lang; title: string; items: ContentItem[]; metrics: ContentItem[]; buildings: InvestorBuilding[]; images: Record<string, ContentImage[]>; sent: boolean;
  labels: { name: string; phone: string; email: string; property: string; message: string; send: string; received: string };
}) {
  const w = words[lang];
  const byId = (id: string) => items.find(item => item.id === id);
  const intro = pick(byId('sample-partner-1'), lang), fee = pick(byId('sample-partner-2'), lang);
  const stageIds = ['sample-partner-3', 'sample-partner-4', 'sample-partner-5', 'sample-partner-6', 'sample-partner-7'];
  const known = new Set(['sample-partner-1', 'sample-partner-2', 'sample-partner-8', ...stageIds]);
  const stages = [...stageIds.map(byId), ...items.filter(item => !known.has(item.id))].filter((item): item is ContentItem => !!item).map(item => ({ id: item.id, ...pick(item, lang) }));
  const metric = (id: string) => { const item = metrics.find(entry => entry.id === id); return item ? { value: lang === 'vi' ? item.title_vi : item.title_en || item.title_vi, label: pick(item, lang).body } : null; };
  const occupancy = metric('sample-metric-occupancy'), reports = metric('sample-metric-reports');
  const operating = buildings.filter(building => building.status === 'open');
  const reportShots = images['sample-partner-7'] || [];

  const perBuilding = buildings.map(buildingPhotos);
  const pool = [...new Map(Array.from({ length: Math.max(0, ...perBuilding.map(list => list.length)) }, (_, round) => perBuilding.map(list => list[round]).filter(Boolean)).flat().map(photo => [photo.url, photo])).values()];
  const hero = pool[0], howPhoto = pool[1] || pool[0];
  // "Completed" photos are the building's own, room type and room photos: progress photos and renders never stand in for them here.
  const finished = (building: InvestorBuilding) => buildingPhotos(building);
  const compareBuilding = buildings.find(building => building.renders.length && finished(building).length);
  const compareAfter = compareBuilding ? finished(compareBuilding)[0] : undefined;
  const stat = (value: string, label: string, note?: string) => { const num = parseNumber(value); return <div className="inv2-stat abt-rise"><p className="abt-number">{num ? <CountUp to={num.to} suffix={num.suffix} /> : <strong>{value}</strong>}</p><h3>{label}</h3>{note && <p className="inv2-note">{note}</p>}</div>; };

  return <div className="abt inv2">
    <section className="abt-hero" aria-labelledby="inv-title">
      {hero && <img src={hero.url} alt="" fetchPriority="high" {...imgSize(hero)} />}
      <div className="abt-hero-veil" />
      <div className="abt-hero-inner">
        <h1 id="inv-title" className="inv2-title">{title}</h1>
        {intro.body && <p className="abt-hero-text">{intro.body}</p>}
        <div className="abt-hero-actions"><a className="abt-button" href="#inv-form">{w.cta}<ArrowUpRight size={16} aria-hidden="true" /></a><a className="abt-link" href="#inv-how">{w.ctaSecond}</a></div>
      </div>
    </section>

    {stages.length > 0 && <section className="abt-section" id="inv-how" aria-labelledby="inv-how-title">
      <div className="abt-top" data-reveal><span className="abt-small">{w.howLabel}</span><Staggered lines={w.howHead} id="inv-how-title" /></div>
      <div className="inv2-how" data-reveal>
        <div className="inv2-how-side abt-rise"><Frame photo={howPhoto} alt="" /><p>{w.howLead}</p></div>
        <ol>{stages.map((stage, index) => <li key={stage.id} className="abt-rise" style={{ '--d': `${index * 0.09}s` } as React.CSSProperties}><span className="abt-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{stage.title}</h3><p>{stage.body}</p></div></li>)}</ol>
      </div>
    </section>}

    <section className="abt-section" aria-labelledby="inv-models-title">
      <div className="abt-top" data-reveal><span className="abt-small">{w.modelsLabel}</span><Staggered lines={w.modelsHead} id="inv-models-title" /></div>
      <div className="inv2-models" data-reveal>
        <article className="abt-rise"><span className="abt-index" aria-hidden="true">A</span><h3>{w.modelA}</h3><p>{w.modelAText}</p><ul>{stages.slice(0, 2).map(stage => <li key={stage.id}>{stage.title}</li>)}</ul></article>
        <article className="abt-rise" style={{ '--d': '.2s' } as React.CSSProperties}><span className="abt-index" aria-hidden="true">B</span><h3>{w.modelB}</h3><p>{w.modelBText}</p><ul>{stages.slice(2, 5).map(stage => <li key={stage.id}>{stage.title}</li>)}</ul></article>
      </div>
      {fee.body && <p className="inv2-fee"><span>{w.feeLabel}</span>{fee.body}</p>}
    </section>

    <section className="abt-section" aria-labelledby="inv-report-title">
      <div className="abt-top" data-reveal><span className="abt-small">{w.reportLabel}</span><Staggered lines={w.reportHead} id="inv-report-title" /></div>
      <div className="inv2-report" data-reveal>
        <div className="inv2-report-text abt-rise"><p>{w.reportLead}</p><ul>{w.reportItems.map((entry, index) => <li key={entry}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{entry}</li>)}</ul></div>
        {reportShots.length > 0 && <div className={`inv2-shots is-${Math.min(reportShots.length, 2)}`}>{reportShots.slice(0, 2).map(shot => <Frame key={shot.id} photo={shot} alt={shot.alt || ''} className="is-shot" />)}</div>}
      </div>
    </section>

    {(occupancy || reports || operating.length > 0) && <section className="abt-section" aria-labelledby="inv-numbers-title">
      <div className="abt-top" data-reveal><span className="abt-small">{w.numbersLabel}</span><Staggered lines={w.numbersHead} id="inv-numbers-title" /></div>
      <div className="inv2-stats" data-reveal>{occupancy && stat(occupancy.value, occupancy.label, w.asOf)}{reports && stat(reports.value, w.reportsPerYear)}</div>
      {operating.map((building, index) => {
        const count = buildingRoomCount(building);
        return <article className="abt-project inv2-project" key={building.id} data-reveal>
          <header className="abt-rise"><span className="abt-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h3>{propertyName(building.name)}</h3>
            <dl><div><dt>{w.area}</dt><dd>{building.address}</dd></div>{count > 0 && <div><dt>{w.rooms}</dt><dd>{count} {w.roomsUnit}</dd></div>}{building.types.length > 0 && <div><dt>{w.types}</dt><dd>{building.types.length}</dd></div>}<div><dt>{w.status}</dt><dd>{buildingStatusLabel(building.status, building.openMonth, lang) || w.open}</dd></div></dl>
            <Link className="abt-link" href={`/${lang}/buildings/${building.id}`}>{w.view}<ArrowUpRight size={15} aria-hidden="true" /></Link></header>
        </article>;
      })}
      {compareBuilding && compareAfter && <div className="inv2-compare"><span className="abt-small">{w.compareLabel}</span><BeforeAfter before={compareBuilding.renders[0].url} after={compareAfter.url} beforeLabel={w.compareBefore} afterLabel={w.compareAfter} alt={propertyName(compareBuilding.name)} hint={w.compareHint} /><p className="inv2-note">{propertyName(compareBuilding.name)} · {w.compareNote}</p></div>}
    </section>}

    <section className="abt-section" aria-labelledby="inv-faq-title">
      <div className="abt-top" data-reveal><span className="abt-small">{w.faqLabel}</span><Staggered lines={w.faqHead} id="inv-faq-title" /></div>
      <div className="inv2-faq" data-reveal>{w.faq.map(([question, answer], index) => <details key={question} open={index === 0}><summary><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{question}<i aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
    </section>

    <section className="abt-section inv2-contact" id="inv-form" aria-labelledby="inv-form-title">
      <div className="abt-top" data-reveal><span className="abt-small">{w.formLabel}</span><Staggered lines={w.formHead} id="inv-form-title" /></div>
      <div className="inv2-contact-grid" data-reveal>
        <div><p className="inv2-lead">{w.formLead}</p><ol className="inv2-steps">{w.steps.map(([step, text], index) => <li key={index}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{step}</h3><p>{text}</p></div></li>)}</ol></div>
        <div>
          {sent && <p role="status" className="inv2-sent">{labels.received}</p>}
          <form className="inv2-form" action="/api/partner-inquiries" method="post"><input type="hidden" name="lang" value={lang} />
            <label>{labels.name}<input name="name" required maxLength={100} /></label>
            <label>{labels.phone}<input name="phone" required maxLength={24} /></label>
            <label>{labels.email}<input name="email" type="email" maxLength={254} /></label>
            <label>{labels.property}<input name="property" maxLength={200} /></label>
            <label>{labels.message}<textarea name="message" rows={4} maxLength={2000} /></label>
            <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            <button className="abt-button" type="submit">{labels.send}<ArrowUpRight size={16} aria-hidden="true" /></button>
            <small>{w.privacy} <Link href={`/${lang}/privacy`}>{w.policy}</Link></small>
          </form>
        </div>
      </div>
    </section>
  </div>;
}
