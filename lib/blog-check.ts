import { BLOG, isIntent, isLevel, isTemplate, isTopic } from './blog-standard';
import { bodyWords, countTextWords, faqItems, markdownLinks, mediaImageId, outline, sectionLines } from './journal-markdown';
import { looksVietnamese } from './seo-copy';

/*
 * The blog standard as code: rules R01-R27 of the admin spec. Pure functions, so the editor runs them while the
 * reviewer types and the server runs the very same ones before it saves, marks ready or publishes.
 *
 *   block = the post cannot be marked ready or published; warn = it can, with the warning shown;
 *   ok    = the rule is met;                              todo = could not be checked yet.
 * (The six boxes the reviewer ticks by hand are in blog-standard.ts: REVIEW_ITEMS.)
 */

export type CheckLevel = 'block' | 'warn' | 'ok' | 'todo';
/** `field` names the form field to fix; `offset` and `length` are the stretch of the body the problem is in (the editor jumps there and colours it). */
export type Check = { code: string; level: CheckLevel; message: string; field?: string; offset?: number; length?: number };

export type BlogDraft = {
  h1: string; seoTitle: string; meta: string; slug: string; keyword: string; variations: string;
  intent: string; template: string; level: string; topic: string; authorId: string;
  body: string; coverAlt: string; hasCover: boolean;
};

export type BlogContext = {
  /** The post being checked (left out of the "another post already has it" rules). */
  selfId: string;
  /** Every other post, drafts and published ones; archived posts do not count. */
  others: Array<{ id: string; slug: string; h1: string; keyword: string; status: string }>;
  /** Real prices from the live catalog (room types, rooms, deposits), in VND. */
  knownPrices: number[];
  /** Addresses on this site that open (R12b). Leave out to skip that rule. */
  knownPaths?: string[];
};

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';

/** Characters as a reader counts them (an HTML entity is one character, accents are not counted twice). */
export const chars = (text: string): number => {
  const decoded = text.replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (_, name: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', '#39': "'" })[name]!);
  return [...decoded.normalize('NFC').trim()].length;
};

/** Lower case, accents kept, everything that is not a letter or digit turned into one space, with a space at both ends. */
const norm = (text: string) => ` ${text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
const includesPhrase = (text: string, phrase: string) => norm(phrase).trim().length > 0 && norm(text).includes(norm(phrase));
const countPhrase = (text: string, phrase: string) => { const needle = norm(phrase); return needle.trim() ? norm(text).split(needle).length - 1 : 0; };
const words = (text: string) => countTextWords(text);
const range = (value: number, min: number, max: number) => value >= min && value <= max;

/** The body with the content of ``` blocks blanked out (same length, so positions still match). */
function maskCode(body: string): string {
  let fence = false;
  return body.split('\n').map(line => {
    if (/^\s*```/.test(line)) { fence = !fence; return line; }
    return fence ? line.replace(/[^\n]/g, ' ') : line;
  }).join('\n');
}

/** Length of the line that starts at `offset`. */
const lineLength = (text: string, offset: number) => { const end = text.indexOf('\n', offset); return (end === -1 ? text.length : end) - offset; };

const ok = (code: string, message: string): Check => ({ code, level: 'ok', message });
const block = (code: string, message: string, extra: Partial<Check> = {}): Check => ({ code, level: 'block', message, ...extra });
const warn = (code: string, message: string, extra: Partial<Check> = {}): Check => ({ code, level: 'warn', message, ...extra });

/* ---------- VND and USD amounts ---------- */

export type VndAmount = { text: string; value: number; offset: number; known: boolean };

const CURRENCY = '(?:VND|VNĐ|₫|đồng|dong|đ(?![\\p{L}]))';
const toNumber = (raw: string) => Number(raw.replace(/[.,](?=\d{3}(?:\D|$))/g, '').replace(',', '.'));

/** Every amount in Vietnamese dong the text states ("11,000,000 VND", "11 million VND", "VND 11.000.000", "800k VND"), with its value. */
export function findVndAmounts(text: string, knownPrices: number[] = []): VndAmount[] {
  const found: VndAmount[] = [];
  const add = (match: RegExpExecArray, value: number) => { if (Number.isFinite(value) && value > 0) found.push({ text: match[0].trim(), value, offset: match.index, known: knownPrices.some(price => Math.abs(price - value) < 1) }); };
  const patterns: Array<[RegExp, (match: RegExpExecArray) => number]> = [
    [new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:million|triệu|tr)\\b\\s*${CURRENCY}`, 'giu'), match => toNumber(match[1]) * 1_000_000],
    [new RegExp(`(?:VND|VNĐ|₫)\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:million|triệu|tr)\\b`, 'giu'), match => toNumber(match[1]) * 1_000_000],
    [new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*k\\s*${CURRENCY}`, 'giu'), match => toNumber(match[1]) * 1_000],
    [new RegExp(`(\\d{1,3}(?:[.,]\\d{3})+|\\d{4,})\\s*${CURRENCY}`, 'giu'), match => toNumber(match[1])],
    [new RegExp(`(?:VND|VNĐ|₫)\\s*(\\d{1,3}(?:[.,]\\d{3})+|\\d{4,})`, 'giu'), match => toNumber(match[1])],
  ];
  for (const [pattern, value] of patterns) for (let match = pattern.exec(text); match; match = pattern.exec(text)) add(match, value(match));
  // The same text can match two patterns; keep the earliest, widest match of each place.
  found.sort((a, b) => a.offset - b.offset || b.text.length - a.text.length);
  const kept: VndAmount[] = [];
  for (const item of found) { const last = kept[kept.length - 1]; if (!last || item.offset >= last.offset + last.text.length) kept.push(item); }
  return kept;
}

/* ---------- The rules ---------- */

type Table = { offset: number; hasHeader: boolean };

/** Tables of a body: blocks of lines that start with "|"; the header row is recognised by a divider row under it. */
function tables(body: string): Table[] {
  const lines = body.split('\n');
  const found: Table[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\|/.test(lines[i]) && !(i > 0 && /^\s*\|/.test(lines[i - 1]))) found.push({ offset, hasHeader: i + 1 < lines.length && /^\s*\|?[\s:-]+(\|[\s:-]+)*\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1]) });
    offset += lines[i].length + 1;
  }
  return found;
}

/** Runs rules R01-R27. Always returns at least one entry per rule: a violation, or an "ok" when the rule is met. */
export function checkPost(draft: BlogDraft, ctx: BlogContext): Check[] {
  const out: Check[] = [];
  const h1 = draft.h1.trim(), seoTitle = draft.seoTitle.trim(), meta = draft.meta.trim(), slug = draft.slug.trim(), keyword = draft.keyword.trim();
  const body = draft.body.replace(/\r\n?/g, '\n');
  const masked = maskCode(body);
  const total = bodyWords(body);
  const headings = outline(masked);
  const links = markdownLinks(masked);
  const others = ctx.others.filter(other => other.id !== ctx.selfId && other.status !== 'archived');

  // R01 H1: the advised length is a warning, only an empty, tiny or huge H1 blocks
  const h1Chars = chars(h1);
  if (h1Chars < BLOG.h1.hardMin || h1Chars > BLOG.h1.hardMax) out.push(block('R01', `H1 đang ${h1Chars} ký tự, cần ít nhất ${BLOG.h1.hardMin} và tối đa ${BLOG.h1.hardMax}.`, { field: 'h1' }));
  else if (!range(h1Chars, BLOG.h1.min, BLOG.h1.max)) out.push(warn('R01', `H1 đang ${h1Chars} ký tự, nên ${BLOG.h1.min}–${BLOG.h1.max}. Với chủ đề ngắn, tự nhiên thì giữ nguyên cũng được.`, { field: 'h1' }));
  else out.push(ok('R01', `H1: ${h1Chars} ký tự.`));

  // R02 SEO title
  const seoChars = chars(seoTitle);
  out.push(range(seoChars, BLOG.seoTitle.min, BLOG.seoTitle.max) ? ok('R02', `Tiêu đề Google: ${seoChars} ký tự (website tự thêm "${BLOG.suffix}").`) : block('R02', `Tiêu đề Google đang ${seoChars} ký tự, cần ${BLOG.seoTitle.min}–${BLOG.seoTitle.max} (website tự thêm "${BLOG.suffix}").`, { field: 'seoTitle' }));

  // R03 meta description: empty or too long blocks, the advised 120-160 is a warning
  const metaChars = chars(meta);
  if (!metaChars || metaChars > BLOG.meta.hardMax) out.push(block('R03', metaChars ? `Mô tả Google dài ${metaChars} ký tự, tối đa ${BLOG.meta.hardMax}.` : 'Chưa có mô tả Google.', { field: 'meta' }));
  else if (!range(metaChars, BLOG.meta.min, BLOG.meta.max)) out.push(warn('R03', `Mô tả Google đang ${metaChars} ký tự, nên ${BLOG.meta.min}–${BLOG.meta.max}.`, { field: 'meta' }));
  else out.push(ok('R03', `Mô tả Google: ${metaChars} ký tự.`));
  const start = (text: string) => norm(text).trim().split(' ').slice(0, 3).join(' ');
  if (meta && h1 && start(meta) === start(h1)) out.push(warn('R03', 'Mô tả Google đang bắt đầu giống H1. Hãy mở bằng ý khác (con số, địa điểm).', { field: 'meta' }));

  // R04 address (slug)
  const slugProblems: string[] = [];
  if (!slug) slugProblems.push('Chưa có địa chỉ bài.');
  else {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) slugProblems.push('Địa chỉ bài chỉ dùng chữ a-z, số 0-9 và dấu gạch ngang.');
    const slugWords = slug.split('-').filter(Boolean).length;
    if (!range(slugWords, BLOG.slug.minWords, BLOG.slug.maxWords)) slugProblems.push(`Địa chỉ bài đang ${slugWords} từ, cần ${BLOG.slug.minWords}–${BLOG.slug.maxWords}.`);
    if (/(?:^|-)(?:(?:19|20)\d{2}-\d{1,2}(?:-\d{1,2})?|\d{1,2}-\d{1,2}-(?:19|20)\d{2})(?:-|$)/.test(slug)) slugProblems.push('Địa chỉ bài không được có ngày tháng.');
    const clash = ctx.others.find(other => other.id !== ctx.selfId && other.slug === slug);
    if (clash) slugProblems.push(`Địa chỉ bài đã có ở bài khác: "${clash.h1 || clash.slug}".`);
  }
  if (slugProblems.length) for (const message of slugProblems) out.push(block('R04', message, { field: 'slug' }));
  else if (slug.split('-').filter(Boolean).length > BLOG.slug.warnAbove) out.push(warn('R04', `Địa chỉ bài có ${slug.split('-').filter(Boolean).length} từ: được, nhưng ngắn gọn (tối đa ${BLOG.slug.warnAbove} từ) thì dễ nhớ và dễ chia sẻ hơn.`, { field: 'slug' }));
  else out.push(ok('R04', `Địa chỉ bài hợp lệ: /en/journal/${slug}.`));

  // R05 keyword in the H1
  if (!keyword) out.push(block('R05', 'Chưa nhập từ khóa chính.', { field: 'keyword' }));
  else if (includesPhrase(h1, keyword)) out.push(ok('R05', 'Từ khóa chính có trong H1.'));
  else if (norm(keyword).trim().split(' ').every(word => norm(h1).includes(` ${word} `))) out.push(warn('R05', `H1 có đủ các từ của "${keyword}" nhưng không liền nhau hoặc khác thứ tự. Được, nếu đọc vẫn tự nhiên.`, { field: 'h1' }));
  else out.push(block('R05', `H1 chưa có từ khóa chính "${keyword}".`, { field: 'h1' }));

  // R05b keyword in the SEO title, the first 100 words, a ## heading; not stuffed
  if (keyword) {
    const problems: Check[] = [];
    if (seoTitle && !includesPhrase(seoTitle, keyword)) problems.push(warn('R05b', `Tiêu đề Google chưa có từ khóa chính "${keyword}".`, { field: 'seoTitle' }));
    const firstWords = body.replace(/[#>*_`|-]/g, ' ').split(/\s+/).filter(Boolean).slice(0, BLOG.keywordFirstWords).join(' ');
    if (body.trim() && !includesPhrase(firstWords, keyword)) problems.push(warn('R05b', `${BLOG.keywordFirstWords} từ đầu của bài chưa có từ khóa chính.`));
    if (body.trim() && !headings.some(item => item.level === 2 && includesPhrase(item.text, keyword))) problems.push(warn('R05b', 'Chưa có tiêu đề ## nào chứa từ khóa chính.'));
    const uses = countPhrase(body, keyword);
    if (total > 0 && uses > Math.max(1, total / BLOG.keywordEveryWords)) problems.push(warn('R05b', `Từ khóa chính lặp ${uses} lần trong ${total} từ (tối đa khoảng 1 lần mỗi ${BLOG.keywordEveryWords} từ). Dùng biến thể cho tự nhiên.`));
    out.push(...(problems.length ? problems : [ok('R05b', 'Từ khóa chính đặt đúng chỗ, không nhồi.')]));
  }

  // R06 length
  const level = isLevel(draft.level) ? draft.level : null;
  const hardMin = BLOG.words.hardMinByTemplate[draft.template] ?? BLOG.words.hardMin;
  if (total < hardMin) out.push(block('R06', `Bài chỉ có ${total} từ, tối thiểu ${hardMin}${hardMin !== BLOG.words.hardMin ? ' (mẫu bài này được ngắn hơn)' : ''}.`, { field: 'body' }));
  else if (total > BLOG.words.hardMax) out.push(block('R06', `Bài dài ${total} từ, tối đa ${BLOG.words.hardMax}.`, { field: 'body' }));
  else if (level && !range(total, BLOG.words[level].min, BLOG.words[level].max)) out.push(warn('R06', `Bài ${total} từ, mức ${level} nên ${BLOG.words[level].min}–${BLOG.words[level].max} từ.`, { field: 'body' }));
  else out.push(ok('R06', `Độ dài: ${total} từ.`));

  // R07 English
  const sample = `${h1}\n${meta}\n${body}`;
  const accents = (sample.match(/[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/gi) || []).length;
  const letters = (sample.match(/\p{L}/gu) || []).length;
  out.push(sample.trim() && (looksVietnamese(sample) || (letters > 40 && accents / letters > 0.03)) ? block('R07', 'Bài đang là tiếng Việt. Bản tiếng Anh là bắt buộc; bản tiếng Việt viết ở mục riêng.', { field: 'body' }) : ok('R07', 'Bài viết bằng tiếng Anh.'));

  // R08 no HTML, no H1, only ## and ###
  const r08: Check[] = [];
  const tag = /<\/?[a-zA-Z][^>\n]*>|<!--/.exec(masked);
  if (tag) r08.push(block('R08', `Bài có thẻ HTML "${tag[0].slice(0, 30)}". Chỉ dùng Markdown.`, { field: 'body', offset: tag.index, length: tag[0].length }));
  const h1Line = /^[ \t]*#[ \t]+\S/m.exec(masked);
  if (h1Line) r08.push(block('R08', 'Bài có dòng bắt đầu bằng "# " (H1). Trang đã có H1 riêng; chỉ dùng ## và ###.', { field: 'body', offset: h1Line.index, length: lineLength(masked, h1Line.index) }));
  const deep = /^[ \t]*#{4,}[ \t]+\S/m.exec(masked);
  if (deep) r08.push(block('R08', 'Bài có tiêu đề cấp #### trở xuống; chỉ dùng ## và ###.', { field: 'body', offset: deep.index, length: lineLength(masked, deep.index) }));
  out.push(...(r08.length ? r08 : [ok('R08', 'Chỉ dùng Markdown, không có HTML hay H1 trong bài.')]));

  // R09 number of ## headings
  const h2 = headings.filter(item => item.level === 2);
  out.push(range(h2.length, BLOG.h2.min, BLOG.h2.max) ? ok('R09', `${h2.length} tiêu đề ##.`) : block('R09', `Bài có ${h2.length} tiêu đề ##, cần ${BLOG.h2.min}–${BLOG.h2.max}.`, { field: 'body' }));

  // R10 Key takeaways
  const takeaways = h2.find(item => item.text.toLowerCase() === BLOG.keyTakeawaysHeading.toLowerCase());
  if (!takeaways) out.push(block('R10', `Thiếu mục "## ${BLOG.keyTakeawaysHeading}".`, { field: 'body' }));
  else {
    const bullets = sectionLines(masked, takeaways).filter(line => /^\s*[-*+]\s+\S/.test(line)).length;
    const early = body.length ? takeaways.offset / body.length <= BLOG.takeaways.withinFirst : true;
    if (!range(bullets, BLOG.takeaways.min, BLOG.takeaways.max)) out.push(block('R10', `"${BLOG.keyTakeawaysHeading}" có ${bullets} gạch đầu dòng, cần ${BLOG.takeaways.min}–${BLOG.takeaways.max}.`, { field: 'body', offset: takeaways.offset, length: lineLength(masked, takeaways.offset) }));
    else if (!early) out.push(block('R10', `"${BLOG.keyTakeawaysHeading}" phải nằm trong ${Math.round(BLOG.takeaways.withinFirst * 100)}% đầu bài.`, { field: 'body', offset: takeaways.offset, length: lineLength(masked, takeaways.offset) }));
    else out.push(ok('R10', `${bullets} ý chính ở đầu bài.`));
  }

  // R11 FAQ
  const faqHeading = h2.find(item => item.text.toLowerCase() === BLOG.faqHeading.toLowerCase());
  if (!faqHeading) out.push(block('R11', `Thiếu mục "## ${BLOG.faqHeading}".`, { field: 'body' }));
  else {
    const items = faqItems(masked, BLOG.faqHeading);
    const bad = items.filter(item => !range(words(item.answer), BLOG.faq.answerWords.min, BLOG.faq.answerWords.max));
    if (!range(items.length, BLOG.faq.min, BLOG.faq.max)) out.push(block('R11', `Mục hỏi đáp có ${items.length} câu ###, cần ${BLOG.faq.min}–${BLOG.faq.max}.`, { field: 'body', offset: faqHeading.offset, length: lineLength(masked, faqHeading.offset) }));
    else if (bad.length) for (const item of bad) out.push(block('R11', `Câu trả lời "${item.question.slice(0, 50)}" dài ${words(item.answer)} từ, cần ${BLOG.faq.answerWords.min}–${BLOG.faq.answerWords.max}.`, { field: 'body', offset: masked.indexOf(item.question, faqHeading.offset) >= 0 ? masked.indexOf(item.question, faqHeading.offset) : faqHeading.offset, length: item.question.length }));
    else out.push(ok('R11', `${items.length} câu hỏi thường gặp, trả lời đủ độ dài.`));
  }

  // R12 internal links, and a link to /en/stays or /en/contact in the last part
  const internalPath = (url: string): string | null => {
    const match = /^(?:https?:\/\/(?:www\.)?drmstays\.vn)?(\/en(?:\/[^?#]*)?)(?:[?#].*)?$/i.exec(url.trim());
    return match ? match[1].replace(/\/+$/, '') || '/en' : null;
  };
  const textLinks = links.filter(link => !link.image);
  const internal = textLinks.map(link => ({ link, path: internalPath(link.url) })).filter((item): item is { link: typeof item.link; path: string } => !!item.path);
  const distinct = new Set(internal.map(item => item.path));
  const ctaFrom = body.length * (1 - BLOG.internalLinks.ctaWithinLast);
  const cta = internal.some(item => /^\/en\/(?:stays|contact)$/.test(item.path) && item.link.offset >= ctaFrom);
  const r12: Check[] = [];
  if (distinct.size < BLOG.internalLinks.min) r12.push(block('R12', `Bài có ${distinct.size} link nội bộ (/en/...), cần ít nhất ${BLOG.internalLinks.min}.`, { field: 'body' }));
  if (!cta) r12.push(block('R12', `Chưa có link tới /en/stays hoặc /en/contact trong ${Math.round(BLOG.internalLinks.ctaWithinLast * 100)}% cuối bài.`, { field: 'body' }));
  out.push(...(r12.length ? r12 : [ok('R12', `${distinct.size} link nội bộ, có lời mời liên hệ ở cuối bài.`)]));

  // R12b internal links open
  if (ctx.knownPaths) {
    const known = new Set(ctx.knownPaths.map(path => path.replace(/\/+$/, '') || '/'));
    const broken = internal.filter(item => !known.has(item.path));
    out.push(...(broken.length ? broken.map(item => warn('R12b', `Link không mở được trên website: ${item.path}`, { field: 'body', offset: item.link.offset, length: item.link.length })) : [ok('R12b', 'Mọi link nội bộ đều mở được.')]));
  }

  // R12c link texts that say nothing about where they lead
  const vague = textLinks.filter(link => (BLOG.weakAnchors as readonly string[]).includes(norm(link.text).trim()));
  out.push(...(vague.length ? vague.map(link => warn('R12c', `Chữ của link "${link.text}" không cho biết trang đích. Hãy dùng chữ mô tả, ví dụ "furnished apartments in An Thuong".`, { field: 'body', offset: link.offset, length: link.length })) : [ok('R12c', 'Chữ của các link đều mô tả trang đích.')]));

  // R13 external links
  const r13: Check[] = [];
  const outside = new Set<string>();
  for (const link of textLinks) {
    const url = link.url.trim();
    if (/^(?:javascript|data|vbscript):/i.test(url)) r13.push(block('R13', `Link bị cấm: ${url.slice(0, 40)}`, { field: 'body', offset: link.offset, length: link.length }));
    else if (/^http:\/\//i.test(url)) r13.push(block('R13', `Link ngoài chỉ dùng https://: ${url.slice(0, 60)}`, { field: 'body', offset: link.offset, length: link.length }));
    else if (/^\/\//.test(url) || (!/^(?:https:\/\/|\/|#|mailto:|tel:)/i.test(url) && url)) r13.push(block('R13', `Link thiếu https:// hoặc không hợp lệ: ${url.slice(0, 60)}`, { field: 'body', offset: link.offset, length: link.length }));
    else if (/^https:\/\//i.test(url) && !/^https:\/\/(?:www\.)?drmstays\.vn(?:[/?#]|$)/i.test(url)) outside.add(url);
  }
  if (!r13.length && outside.size > BLOG.externalLinks.max) r13.push(warn('R13', `Bài có ${outside.size} link ra ngoài, nên tối đa ${BLOG.externalLinks.max} (chỉ nguồn chính thức).`, { field: 'body' }));
  out.push(...(r13.length ? r13 : [ok('R13', `${outside.size} link ngoài, đều là https://.`)]));

  // R14 cover photo and its description
  const coverWords = words(draft.coverAlt);
  if (!draft.hasCover) out.push(block('R14', 'Chưa có ảnh bìa.', { field: 'cover' }));
  else if (!range(coverWords, BLOG.alt.minWords, BLOG.alt.maxWords)) out.push(block('R14', `Mô tả ảnh bìa có ${coverWords} từ, cần ${BLOG.alt.minWords}–${BLOG.alt.maxWords}.`, { field: 'coverAlt' }));
  else out.push(ok('R14', 'Có ảnh bìa kèm mô tả.'));

  // R15 pictures in the post
  const pictures = links.filter(link => link.image);
  const r15: Check[] = [];
  const own = pictures.filter(picture => mediaImageId(picture.url));
  for (const picture of pictures) {
    if (!mediaImageId(picture.url)) r15.push(block('R15', `Ảnh trong bài phải là ảnh tải lên website (/media/catalog/...), không dùng ảnh ngoài: ${picture.url.slice(0, 50)}`, { field: 'body', offset: picture.offset, length: picture.length }));
    else if (!range(words(picture.text), BLOG.alt.minWords, BLOG.alt.maxWords)) r15.push(block('R15', `Mô tả ảnh có ${words(picture.text)} từ, cần ${BLOG.alt.minWords}–${BLOG.alt.maxWords}: "${picture.text.slice(0, 40)}"`, { field: 'body', offset: picture.offset, length: picture.length }));
  }
  if (own.length < BLOG.inlineImages.min) r15.unshift(block('R15', `Bài có ${own.length} ảnh trong nội dung, cần ít nhất ${BLOG.inlineImages.min}.`, { field: 'body' }));
  out.push(...(r15.length ? r15 : [ok('R15', `${own.length} ảnh trong bài, đều có mô tả.`)]));

  // R16 placeholder text
  const allText = [['h1', h1], ['seoTitle', seoTitle], ['meta', meta], ['coverAlt', draft.coverAlt], ['body', masked]] as const;
  const r16: Check[] = [];
  for (const [field, text] of allText) for (const pattern of BLOG.placeholders) {
    const hit = pattern.exec(text);
    if (hit) r16.push(block('R16', `Còn chữ giữ chỗ "${hit[0]}" trong ${field === 'body' ? 'nội dung' : field}.`, field === 'body' ? { field, offset: hit.index, length: hit[0].length } : { field }));
  }
  out.push(...(r16.length ? r16 : [ok('R16', 'Không còn chữ giữ chỗ.')]));

  // R17 forbidden words
  const lower = `${h1}\n${seoTitle}\n${meta}\n${body}`.toLowerCase();
  const forbidden = BLOG.forbiddenWords.filter(word => lower.includes(word));
  out.push(forbidden.length ? warn('R17', `Có từ quảng cáo quá lời: ${forbidden.map(word => `"${word}"`).join(', ')}. Người duyệt quyết định giữ hay bỏ.`, { field: 'body', offset: Math.max(0, body.toLowerCase().indexOf(forbidden[0])), length: forbidden[0].length }) : ok('R17', 'Không có từ cấm.'));

  // R18 amounts in VND against the real prices; R19 the "checked" line
  const amounts = findVndAmounts(masked, ctx.knownPrices);
  const strange = amounts.filter(amount => !amount.known);
  if (!amounts.length) out.push(ok('R18', 'Bài không nêu số tiền VND.'));
  else if (strange.length) for (const amount of strange) out.push(warn('R18', `Số tiền "${amount.text}" không trùng giá thật nào trong hệ thống (loại phòng, phòng, cọc). Hãy đối chiếu.`, { field: 'body', offset: amount.offset, length: amount.text.length }));
  else out.push(ok('R18', `${amounts.length} số tiền VND đều khớp giá thật.`));
  if (amounts.length) out.push(new RegExp(`${BLOG.pricesCheckedLabel}\\s*(?:${MONTHS})\\s+\\d{4}`, 'i').test(body) ? ok('R19', 'Có dòng ngày kiểm tra giá.') : block('R19', `Bài có số tiền VND nên phải có dòng "${BLOG.pricesCheckedLabel} <Tháng Năm>", ví dụ "${BLOG.pricesCheckedLabel} November 2026".`, { field: 'body' }));

  // R20 USD amounts come with the month of the conversion
  const usd = /(?:USD|US\$|\$)\s?\d[\d,.]*|\d[\d,.]*\s?(?:USD|US\$|dollars?)\b/gi;
  const r20: Check[] = [];
  let offset = 0;
  for (const paragraph of masked.split(/\n\s*\n/)) {
    const hit = usd.exec(paragraph); usd.lastIndex = 0;
    if (hit && !new RegExp(`\\b(?:${MONTHS})\\b|\\b20\\d\\d\\b`, 'i').test(paragraph)) r20.push(warn('R20', `Số tiền USD "${hit[0].trim()}" chưa kèm tháng hoặc năm quy đổi, ví dụ "about USD 440, Nov 2026".`, { field: 'body', offset: offset + hit.index, length: hit[0].length }));
    offset += paragraph.length + 2;
  }
  out.push(...(r20.length ? r20 : [ok('R20', 'Số tiền USD (nếu có) đều kèm ngày quy đổi.')]));

  // R21 readability
  const r21: Check[] = [];
  offset = 0;
  for (const paragraph of masked.split(/\n\s*\n/)) {
    if (!/^\s*(?:#|>|[-*+]\s|\d+\.\s|\||!\[|```)/.test(paragraph) && words(paragraph) > BLOG.paragraphWords) r21.push(warn('R21', `Có đoạn dài ${words(paragraph)} từ (tối đa ${BLOG.paragraphWords}). Hãy tách ra.`, { field: 'body', offset: offset + paragraph.search(/\S|$/), length: paragraph.trim().length }));
    offset += paragraph.length + 2;
  }
  const sentences = bodyWords(body) ? body.replace(/\|[^\n]*/g, ' ').split(/[.!?]+(?:\s|$)/).filter(sentence => words(sentence) > 0) : [];
  const average = sentences.length ? sentences.reduce((sum, sentence) => sum + words(sentence), 0) / sentences.length : 0;
  if (average > BLOG.sentenceAvgWords) r21.push(warn('R21', `Câu trung bình ${average.toFixed(1)} từ (nên tối đa ${BLOG.sentenceAvgWords}). Hãy viết câu ngắn hơn.`, { field: 'body' }));
  out.push(...(r21.length ? r21 : [ok('R21', 'Đoạn văn và câu đủ ngắn.')]));

  // R22 a keyword another post already uses; similar H1
  if (keyword) {
    const same = others.find(other => other.keyword.trim() && norm(other.keyword) === norm(keyword));
    out.push(same ? block('R22', `Từ khóa chính "${keyword}" đã được bài khác dùng: "${same.h1 || same.slug}". Mỗi bài một từ khóa.`, { field: 'keyword' }) : ok('R22', 'Từ khóa chính chưa bài nào dùng.'));
  }
  const tokens = (text: string) => new Set(norm(text).trim().split(' ').filter(Boolean));
  const mine = tokens(h1);
  const similar = h1 ? others.find(other => { const theirs = tokens(other.h1); const shared = [...mine].filter(token => theirs.has(token)).length; const union = new Set([...mine, ...theirs]).size; return union > 0 && shared / union >= BLOG.similarH1; }) : undefined;
  out.push(similar ? warn('R22b', `H1 giống bài "${similar.h1}" từ ${Math.round(BLOG.similarH1 * 100)}% trở lên.`, { field: 'h1' }) : ok('R22b', 'H1 khác các bài khác.'));

  // R23 choices made
  const missing = [
    !isTemplate(draft.template) && 'mẫu bài', !isLevel(draft.level) && 'mức', !isIntent(draft.intent) && 'ý định tìm kiếm', !isTopic(draft.topic) && 'chủ đề', !draft.authorId && 'tác giả',
  ].filter(Boolean);
  out.push(missing.length ? block('R23', `Chưa chọn: ${missing.join(', ')}.`, { field: 'choices' }) : ok('R23', 'Đã chọn mẫu bài, mức, ý định, chủ đề và tác giả.'));

  // R24 tables have a header row
  const headless = tables(masked).filter(table => !table.hasHeader);
  out.push(...(headless.length ? headless.map(table => warn('R24', 'Có bảng chưa có hàng tiêu đề (dòng thứ hai phải là | --- | --- |).', { field: 'body', offset: table.offset, length: lineLength(masked, table.offset) })) : [ok('R24', 'Bảng (nếu có) đều có hàng tiêu đề.')]));

  // R25 brand and place named inside the parts an AI cuts out (key takeaways, FAQ answers)
  const takeawaysHeading = h2.find(item => item.text.toLowerCase() === BLOG.keyTakeawaysHeading.toLowerCase());
  const cuttable = [...(takeawaysHeading ? sectionLines(masked, takeawaysHeading) : []), ...faqItems(masked, BLOG.faqHeading).flatMap(item => [item.question, item.answer])].join('\n');
  if (cuttable.trim()) {
    const lacking = [!BLOG.brand.test(cuttable) && 'tên thương hiệu "DRM Stays"', !BLOG.places.test(cuttable) && 'tên thành phố hoặc khu vực (ví dụ Da Nang, An Thuong)'].filter(Boolean);
    out.push(lacking.length ? warn('R25', `Key takeaways và hỏi đáp chưa nhắc ${lacking.join(' và ')}. AI hay cắt riêng từng ý ra khỏi bài, nên nhắc tên một cách tự nhiên trong ít nhất một ý hoặc một câu trả lời.`, { field: 'body' }) : ok('R25', 'Key takeaways và hỏi đáp có nhắc thương hiệu và địa điểm.'));
  }

  // R26 answer first: the paragraph right under a ## answers the point, in a few words
  const r26: Check[] = [];
  const bodyLines = masked.split('\n');
  for (const heading of h2) {
    const title = heading.text.toLowerCase();
    if (title === BLOG.keyTakeawaysHeading.toLowerCase() || title === BLOG.faqHeading.toLowerCase()) continue;
    const lines: string[] = [];
    let kind = '';
    for (let i = heading.line + 1; i < bodyLines.length; i++) {
      const line = bodyLines[i];
      if (/^\s*#{1,6}\s/.test(line)) break;
      if (!line.trim()) { if (lines.length) break; continue; }
      if (!lines.length) kind = /^\s*\|/.test(line) ? 'bảng' : /^\s*(?:[-*+]|\d+\.)\s/.test(line) ? 'danh sách' : /^\s*!\[/.test(line) ? 'ảnh' : /^\s*>/.test(line) ? 'trích dẫn' : '';
      lines.push(line);
    }
    if (!lines.length) continue;
    const place = { field: 'body' as const, offset: heading.offset, length: lineLength(masked, heading.offset) };
    if (kind) r26.push(warn('R26', `Mục "${heading.text.slice(0, 40)}" mở đầu bằng ${kind}. Hãy mở bằng 1–2 câu trả lời thẳng vào ý của mục, rồi mới phân tích.`, place));
    else if (words(lines.join(' ')) > BLOG.answerFirstWords) r26.push(warn('R26', `Đoạn đầu của mục "${heading.text.slice(0, 40)}" dài ${words(lines.join(' '))} từ. Hãy mở bằng câu trả lời ngắn (khoảng 40–${BLOG.answerFirstWords} từ).`, place));
  }
  out.push(...(r26.length ? r26 : [ok('R26', 'Mỗi mục mở đầu bằng đoạn trả lời ngắn.')]));

  // R27 real data: a level A post has at least one table or a list with figures
  if (level === 'A') {
    const figures = masked.split('\n').filter(line => /^\s*(?:[-*+]|\d+\.)\s/.test(line) && /\d/.test(line)).length;
    out.push(tables(masked).length || figures >= 3 ? ok('R27', 'Có bảng hoặc danh sách số liệu cụ thể.') : warn('R27', 'Bài mức A nên có ít nhất một bảng so sánh hoặc danh sách số liệu (khoảng cách, thời gian di chuyển, diện tích, chi phí).', { field: 'body' }));
  }

  return out;
}

export const blockers = (checks: Check[]) => checks.filter(check => check.level === 'block');
export const summary = (checks: Check[]) => ({
  block: checks.filter(check => check.level === 'block').length,
  warn: checks.filter(check => check.level === 'warn').length,
  ok: checks.filter(check => check.level === 'ok').length,
});
