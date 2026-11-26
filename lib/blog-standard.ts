/**
 * The blog standard (docs: "Tiêu chuẩn bài blog SEO-GEO" and the admin spec). Every number the checks use lives here,
 * so the owner can change a limit in one place. Pure data: safe to import from the browser.
 */
export const BLOG = {
  /** H1 of the page (title_en). */
  h1: { min: 45, max: 70 },
  /** Title on Google; the site adds `suffix` after it. */
  seoTitle: { min: 30, max: 48 },
  suffix: ' | DRM Stays',
  /** Description on Google (excerpt_en). */
  meta: { min: 140, max: 160 },
  slug: { minWords: 3, maxWords: 6 },
  /** Length by level; below hardMin or above hardMax the post is blocked, between is only a warning. */
  words: { A: { min: 1200, max: 1800 }, B: { min: 800, max: 1300 }, hardMin: 700, hardMax: 3000 },
  h2: { min: 3, max: 8 },
  takeaways: { min: 3, max: 5, withinFirst: 0.2 },
  faq: { min: 3, max: 5, answerWords: { min: 30, max: 70 } },
  internalLinks: { min: 2, ctaWithinLast: 0.15 },
  externalLinks: { max: 3 },
  alt: { minWords: 8, maxWords: 15 },
  inlineImages: { min: 2 },
  paragraphWords: 120,
  sentenceAvgWords: 25,
  /** The keyword may appear at most once per this many words. */
  keywordEveryWords: 150,
  keywordFirstWords: 100,
  similarH1: 0.8,
  /** Longest values the form accepts (storage limits, not quality limits). */
  store: { h1: 180, seoTitle: 80, meta: 300, slug: 120, keyword: 100, variations: 500, coverAlt: 200, body: 60_000 },
  /** Largest photo accepted in the editor, in bytes. */
  imageBytes: 8_000_000,
  imagesPerPost: 30,
  keyTakeawaysHeading: 'Key takeaways',
  faqHeading: 'Frequently asked questions',
  pricesCheckedLabel: 'Prices and details checked:',
  forbiddenWords: ['guaranteed', '100% safe', 'cheapest in', '#1', 'number one', 'world-class'],
  /** Text left in by the writing step. Matched case-sensitively unless it is a regex with the i flag. */
  placeholders: [/\[NEEDS INPUT/, /\bTODO\b/, /lorem/i, /\{\{/, /\}\}/, /\bINSERT\b/, /\[(?:…|\.\.\.)\]/],
} as const;

export const TEMPLATES = { A: 'A · Cẩm nang khu vực', B: 'B · So sánh', C: 'C · Thực tế, hướng dẫn', D: 'D · Giá và chi phí', E: 'E · Theo mùa' } as const;
export const LEVELS = { A: 'Mức A (1.200–1.800 từ)', B: 'Mức B (800–1.300 từ)' } as const;
export const INTENTS = { informational: 'Tìm hiểu (informational)', commercial: 'So sánh để chọn (commercial)', transactional: 'Sẵn sàng thuê (transactional)' } as const;
export const TOPICS = { area: 'Khu vực', pricing: 'Giá', 'long-stay': 'Ở dài ngày', practical: 'Thực tế', season: 'Theo mùa', investor: 'Chủ đầu tư' } as const;
/** Topic names as the BlogPosting data and the page show them (English). */
export const TOPIC_NAMES_EN = { area: 'Areas', pricing: 'Prices', 'long-stay': 'Long stays', practical: 'Practical tips', season: 'Seasons', investor: 'Investors' } as const;
export const STATUSES = { draft: 'Nháp', ready: 'Sẵn sàng', published: 'Đã đăng', archived: 'Lưu trữ' } as const;

export type Template = keyof typeof TEMPLATES;
export type Level = keyof typeof LEVELS;
export type Intent = keyof typeof INTENTS;
export type Topic = keyof typeof TOPICS;
export type Status = keyof typeof STATUSES;

const has = (map: object, value: unknown): boolean => typeof value === 'string' && Object.prototype.hasOwnProperty.call(map, value);
export const isTemplate = (value: unknown): value is Template => has(TEMPLATES, value);
export const isLevel = (value: unknown): value is Level => has(LEVELS, value);
export const isIntent = (value: unknown): value is Intent => has(INTENTS, value);
export const isTopic = (value: unknown): value is Topic => has(TOPICS, value);
export const isStatus = (value: unknown): value is Status => has(STATUSES, value);

/** The six boxes the reviewer ticks by hand before a post goes live (admin spec 3.3). */
export const REVIEW_ITEMS = [
  '60 từ đầu trả lời thẳng câu hỏi của tiêu đề (có kết luận hoặc con số).',
  'Mọi giá, khoảng cách, thời gian, ngày đã đối chiếu với dữ liệu thật hoặc có nguồn chính thức.',
  'Không có đánh giá, thứ hạng, "khách nói" mà DRM không có thật.',
  'Ảnh là ảnh thật của DRM Stays hoặc đã được phép dùng.',
  'Tên tòa nhà, địa danh, số điện thoại viết đúng và nhất quán (DRM Stays, Doraemon\'s Land Do Ba, AnLiu Apartment).',
  'Đã xem trước trên điện thoại và máy tính: bảng không tràn, ảnh hiện đủ.',
] as const;
