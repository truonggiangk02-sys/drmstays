import { CONTACT } from '@/lib/site';

const words = {
  vi: { label: 'VĂN PHÒNG', title: 'Ghé thăm văn phòng DRM Stays', lead: 'Gặp trực tiếp đội ngũ để xem phòng, trao đổi nhu cầu và hoàn tất thủ tục thuê.', hours: 'Giờ làm việc', hoursValue: '8:00 – 17:00', address: 'Địa chỉ', phone: 'Điện thoại', email: 'Email', directions: 'Chỉ đường', open: 'Mở trong Google Maps', mapTitle: 'Bản đồ văn phòng DRM Stays' },
  en: { label: 'OFFICE', title: 'Visit the DRM Stays office', lead: 'Meet the team in person to view rooms, talk through your needs and complete your rental.', hours: 'Office hours', hoursValue: '8:00 – 17:00', address: 'Address', phone: 'Phone', email: 'Email', directions: 'Get directions', open: 'Open in Google Maps', mapTitle: 'DRM Stays office map' },
} as const;

/** Office location: a Google map found by the street address, with the details and a directions button beside it. */
export function OfficeMap({ lang }: { lang: 'vi' | 'en' }) {
  const w = words[lang];
  const query = encodeURIComponent(CONTACT.address);
  return <section className="office-map structure-section" aria-labelledby="office-map-title" data-reveal>
    <div className="office-map-info">
      <span className="editorial-section-label">DRM STAYS / {w.label}</span>
      <h2 id="office-map-title">{w.title}</h2>
      <p>{w.lead}</p>
      <dl>
        <div><dt>{w.address}</dt><dd>{CONTACT.address}</dd></div>
        <div><dt>{w.hours}</dt><dd>{w.hoursValue}</dd></div>
        <div><dt>{w.phone}</dt><dd><a href={`tel:${CONTACT.phoneIntl}`}>{CONTACT.phoneDisplay}</a></dd></div>
        <div><dt>{w.email}</dt><dd><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></dd></div>
      </dl>
      <div className="office-map-actions">
        <a className="editorial-primary-link" href={`https://www.google.com/maps/dir/?api=1&destination=${query}`} target="_blank" rel="noopener noreferrer">{w.directions}<span aria-hidden="true">↗</span></a>
        <a className="editorial-text-link" href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noopener noreferrer">{w.open}<span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <div className="office-map-frame">
      <iframe title={w.mapTitle} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${query}&hl=${lang}&z=16&output=embed`} />
    </div>
  </section>;
}
