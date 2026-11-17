/** Areas of a home a photo can show, in the order they appear on the site. */
export const IMAGE_AREAS = ['living', 'bedroom', 'kitchen', 'bathroom', 'balcony'] as const;
export type ImageArea = (typeof IMAGE_AREAS)[number];

export const AREA_LABELS: Record<'vi' | 'en', Record<ImageArea | 'other' | 'render' | 'progress', string>> = {
  vi: { living: 'Phòng khách', bedroom: 'Phòng ngủ', kitchen: 'Bếp', bathroom: 'Phòng tắm', balcony: 'Ban công', other: 'Khác', render: 'Phối cảnh 3D', progress: 'Tiến độ' },
  en: { living: 'Living room', bedroom: 'Bedroom', kitchen: 'Kitchen', bathroom: 'Bathroom', balcony: 'Balcony', other: 'Other', render: '3D renders', progress: 'Progress' },
};

export const isImageArea = (value: string): value is ImageArea => (IMAGE_AREAS as readonly string[]).includes(value);

const GUESS: Array<[ImageArea, RegExp]> = [
  ['bathroom', /tắm|vệ sinh|toilet|bath|shower|\bwc\b/i],
  ['bedroom', /ngủ|giường|bedroom|\bbed\b/i],
  ['kitchen', /bếp|kitchen|dining|bàn ăn/i],
  ['balcony', /ban công|balcony|terrace|logia/i],
  ['living', /khách|living|lounge|sofa/i],
];

/** The area saved for a photo, or else a guess from its caption, or '' when neither says anything. */
export function areaOf(saved: string | undefined, caption: string): ImageArea | '' {
  if (saved && isImageArea(saved)) return saved;
  return GUESS.find(([, pattern]) => pattern.test(caption))?.[0] || '';
}
