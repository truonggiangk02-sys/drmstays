import { formatOpenMonth, type BuildingStatus } from './catalog-details';

const names = {
  vi: { building: 'Đang hoàn thiện', soon: 'Sắp mở', expected: 'dự kiến' },
  en: { building: 'Being completed', soon: 'Coming soon', expected: 'expected' },
} as const;

/** "Sắp mở · tháng 3/2027", "Đang hoàn thiện" ... and '' for a building that is already open. */
export function buildingStatusLabel(status: BuildingStatus | undefined, openMonth: string | undefined, lang: 'vi' | 'en'): string {
  if (!status || status === 'open') return '';
  const month = openMonth ? formatOpenMonth(openMonth, lang) : '';
  return `${names[lang][status]}${month ? ` · ${month}` : ''}`;
}
