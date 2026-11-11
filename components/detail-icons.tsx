// Small stroke icons (24x24) with a coloured tile behind them, used on the detail pages.
export type Accent = 'green' | 'amber' | 'blue' | 'pink' | 'violet' | 'teal';

const paths = {
  area: 'M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6',
  bed: 'M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 15h18M7 9V7a1 1 0 011-1h3a1 1 0 011 1v2',
  bath: 'M4 12h16v2a5 5 0 01-5 5H9a5 5 0 01-5-5v-2zM6 12V6a2 2 0 014 0M7 19l-1 2M17 19l1 2',
  users: 'M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7M20 19v-1a3.5 3.5 0 00-2.5-3.3M16.5 4.2a3.5 3.5 0 010 6.6',
  wallet: 'M4 7a2 2 0 012-2h11v4M4 7v10a2 2 0 002 2h13a1 1 0 001-1v-8a1 1 0 00-1-1H6a2 2 0 01-2-2zM16 14h2',
  calendar: 'M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zM4 10h16M8 3v4M16 3v4',
  wifi: 'M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5h.01',
  elevator: 'M5 3h14v18H5zM9 9l3-3 3 3M9 15l3 3 3-3',
  parking: 'M6 3h7a5 5 0 010 10H6zM6 3v18',
  washer: 'M5 3h14v18H5zM5 8h14M12 18a4 4 0 100-8 4 4 0 000 8M8 5.5h.01M11 5.5h.01',
  snow: 'M3 7h18v6H3zM6 17l1 3M12 17v3M18 17l-1 3',
  kitchen: 'M5 4h14v16H5zM5 9h14M9 6.5h.01M13 6.5h.01M8 14h8',
  tv: 'M3 6h18v11H3zM8 21h8M12 17v4',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6zM9 12l2 2 4-4',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7',
  key: 'M14 10a4 4 0 11-3 6.7L4 20v-3l2-2h2l2-2.3A4 4 0 0114 10zM17 8h.01',
  coffee: 'M5 8h11v6a4 4 0 01-4 4H9a4 4 0 01-4-4zM16 9h2a2 2 0 010 4h-2M8 3v2M12 3v2',
  store: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9M10 20v-6h4v6',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.6 17.6l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.6 6.4l1.4-1.4',
  fridge: 'M6 2h12v20H6zM6 10h12M9 6v1.5M9 13v3',
  drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
  desk: 'M3 9h18v3H3zM5 12v8M19 12v8M9 12v4h6v-4',
  wardrobe: 'M5 3h14v18H5zM12 3v18M9.5 11v2M14.5 11v2',
  curtain: 'M4 4h16M6 4v16M18 4v16M6 8c3 0 3 6 6 6s3-6 6-6',
  bolt: 'M13 2L5 14h6l-1 8 8-12h-6z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z',
  ban: 'M12 21a9 9 0 100-18 9 9 0 000 18zM5.6 5.6l12.8 12.8',
  idcard: 'M3 6h18v12H3zM8 12a2 2 0 100-4 2 2 0 000 4M5.5 16c.6-1.5 1.7-2 2.5-2s1.9.5 2.5 2M14 10h4M14 14h3',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
  plan: 'M4 4h16v16H4zM4 10h7M11 10v10M15 4v6h5',
  home: 'M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5',
  check: 'M4 12l5 5 11-11',
} as const;
export type IconName = keyof typeof paths;

/** Coloured rounded tile holding an icon. */
export function Ico({ name, accent = 'green', size = 'md' }: { name: IconName; accent?: Accent; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  return <span className={`dv-ico is-${size} is-${accent}`} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d={paths[name]} /></svg>
  </span>;
}

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const amenityRules: Array<[RegExp, IconName, Accent]> = [
  [/wi-?fi|internet/, 'wifi', 'blue'], [/thang may|elevator|\blift\b/, 'elevator', 'violet'],
  [/sac xe|electric|charging|dien xe/, 'bolt', 'amber'], [/xe may|do xe|bai xe|parking|garage|o to/, 'parking', 'blue'],
  [/may giat|washer|washing|laundry/, 'washer', 'teal'], [/dieu hoa|may lanh|air.?con|\ba\/c\b/, 'snow', 'blue'],
  [/bep|kitchen|cooker|induction/, 'kitchen', 'amber'], [/tivi|\btv\b|television/, 'tv', 'violet'],
  [/camera|cctv/, 'camera', 'green'], [/an ninh|bao ve|security|guard|le tan|reception/, 'shield', 'green'],
  [/the tu|khoa|key|smart lock|card/, 'key', 'amber'], [/ca phe|cafe|coffee/, 'coffee', 'amber'],
  [/tap hoa|cua hang|shop|store|grocery|sieu thi|mini ?mart/, 'store', 'pink'], [/ban cong|balcony|terrace|view|cua so lon/, 'sun', 'amber'],
  [/tu lanh|fridge|refrigerator/, 'fridge', 'teal'], [/nong lanh|nuoc nong|heater|hot water/, 'drop', 'blue'],
  [/ban lam viec|desk|workspace/, 'desk', 'violet'], [/tu quan ao|wardrobe|closet/, 'wardrobe', 'amber'],
  [/rem|curtain/, 'curtain', 'pink'], [/giuong|bed|nem\b|mattress/, 'bed', 'pink'],
  [/pccc|chay|fire/, 'flame', 'pink'], [/ve sinh|don phong|clean|housekeeping|khan|towel|ga giuong|linen/, 'sparkle', 'teal'],
];
const ruleRules: Array<[RegExp, IconName, Accent]> = [
  [/yen tinh|quiet|on ao|noise|22:00/, 'moon', 'violet'], [/nhan phong|tra phong|check-?in|check-?out|gio |hour|\d{1,2}[:h]\d{2}/, 'clock', 'blue'],
  [/ho chieu|passport|dang ky|cccd|\bid\b|giay to/, 'idcard', 'teal'], [/thu cung|pet|dong vat|animal/, 'ban', 'pink'],
  [/hut thuoc|smok|tiec|party|cam |khong |no /, 'ban', 'pink'], [/khach|guest|nguoi|people|person/, 'users', 'violet'],
  [/xe|car |parking|o to/, 'parking', 'blue'], [/dien|nuoc|wifi|phi |fee|price|gia /, 'wallet', 'amber'],
];

export const iconForAmenity = (text: string): [IconName, Accent] => {
  const key = plain(text);
  const hit = amenityRules.find(([pattern]) => pattern.test(key));
  return hit ? [hit[1], hit[2]] : ['check', 'green'];
};
export const iconForRule = (text: string): [IconName, Accent] => {
  const key = plain(text);
  const hit = ruleRules.find(([pattern]) => pattern.test(key));
  return hit ? [hit[1], hit[2]] : ['check', 'amber'];
};
