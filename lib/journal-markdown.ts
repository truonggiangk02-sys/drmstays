import { imgSize } from './image-url';

/*
 * Markdown helpers for journal posts. Pure functions with no server imports, so the admin editor can run them in the
 * browser (live checks and preview) and the public pages on the server use the very same code.
 */

/** Readable address part from a title: "Monthly rent in Da Nang: 2027 prices" -> "monthly-rent-in-da-nang-2027-prices". */
export function slugify(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
}

/** Plain text of a markdown body, for summaries and reading time. */
export function plainText(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '').replace(/^\s*\|?[-:\s|]+\|?\s*$/gm, ' ').replace(/[*_`]/g, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
}

const wordTokens = (text: string) => text.split(/\s+/).filter(token => /[\p{L}\p{N}]/u.test(token));

/** Words of a text (a token needs at least one letter or digit). */
export const countTextWords = (text: string) => wordTokens(text).length;

/** The markdown without code blocks, tables and image lines: what the word counts are taken from. */
function proseOnly(markdown: string): string {
  const out: string[] = [];
  let fence = false;
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*```/.test(line)) { fence = !fence; continue; }
    if (fence || /^\s*\|/.test(line) || IMAGE_LINE.test(line)) continue;
    out.push(line);
  }
  return out.join('\n');
}

/** Words of a post body: tables, code and images are not counted. */
export const bodyWords = (markdown: string) => countTextWords(plainText(proseOnly(markdown)));

/** Reading time at about 220 words a minute, at least one minute. */
export const readingMinutes = (markdown: string) => Math.max(1, Math.round(plainText(markdown).split(' ').filter(Boolean).length / 220));

/** "2027-01-15" -> "15 January 2027" / "15 tháng 1, 2027"; "" when not a date. */
export function formatPostDate(date: string, lang: 'vi' | 'en'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  if (!match) return '';
  const value = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(value);
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Links may only go to web pages, this site, an anchor, email or phone: never javascript: or data:. */
function safeHref(url: string): string | null {
  const href = url.trim();
  if (/^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(href)) return href;
  return null;
}

/* ---------- Images ---------- */

const IMAGE_LINE = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;
const MEDIA_PATH = /^(?:https?:\/\/(?:www\.)?drmstays\.vn)?\/media\/catalog\/([0-9a-f-]{36})$/i;

/** The photo id of a /media/catalog/<id> address (also with the site's own origin in front), or null for any other source. */
export const mediaImageId = (src: string): string | null => MEDIA_PATH.exec(src.trim())?.[1].toLowerCase() ?? null;

/** What the renderer knows about a photo of the post, by id: its pixel size and caption from the photo library. */
export type PostImage = { width?: number; height?: number; alt?: string };
export type RenderOptions = { images?: Record<string, PostImage | undefined> };

function figure(alt: string, id: string, options: RenderOptions): string {
  const known = options.images?.[id];
  const url = `/media/catalog/${id}`;
  const attrs = imgSize({ url, width: known?.width, height: known?.height }, '(max-width: 900px) 100vw, 860px');
  const extra = Object.entries(attrs).map(([key, value]) => ` ${key === 'srcSet' ? 'srcset' : key}="${escapeHtml(String(value))}"`).join('');
  return `<figure class="journal-figure"><img src="${url}" alt="${escapeHtml(alt.trim() || known?.alt || '')}" loading="lazy" decoding="async"${extra}></figure>`;
}

/* ---------- Inline text ---------- */

/** Bold, italic, inline code and links inside one line. The text is escaped first, so no HTML from the post gets through. */
function inline(text: string): string {
  const codes: string[] = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, code: string) => { codes.push(code); return `\u0000${codes.length - 1}\u0000`; });
  out = out.replace(/!\[[^\]]*\]\([^)\s]*\)/g, ''); // pictures are only drawn on a line of their own
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, url: string) => {
    const href = safeHref(url.replace(/&amp;/g, '&'));
    if (!href) return label;
    const external = /^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?drmstays\.vn/i.test(href);
    return `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${codes[Number(i)]}</code>`);
}

const headingId = (text: string, used: Set<string>) => {
  const base = slugify(plainText(text)) || 'section';
  let id = base, n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
};

export type Heading = { level: 2 | 3; id: string; text: string };

/**
 * A safe subset of Markdown for journal posts: ## and ### headings (a single # is shown as ##, the page has its own H1),
 * paragraphs, - and 1. lists, > quotes, --- rules, | tables |, ``` code blocks, **bold**, *italic*, `code`, [links](https://...) and
 * pictures of the post (![description](/media/catalog/<id>) on a line of their own; any other picture source is dropped).
 * Everything else is shown as text; no HTML in the post is ever rendered. Also returns the headings, for the contents list.
 */
export function renderMarkdownFull(markdown: string, options: RenderOptions = {}): { html: string; headings: Heading[] } {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  const headings: Heading[] = [];
  const used = new Set<string>();
  let i = 0;
  const isBlockStart = (line: string) => /^\s*(#{1,6}\s|>|[-*+]\s|\d+\.\s|\||```)/.test(line) || /^\s*(-{3,}|\*{3,})\s*$/.test(line) || IMAGE_LINE.test(line);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*```/.test(line)) {
      // A code block: shown as plain preformatted text, never as HTML or Markdown.
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++;
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length <= 2 ? 2 : 3;
      const id = headingId(heading[2], used);
      headings.push({ level, id, text: plainText(heading[2]) });
      html.push(`<h${level} id="${id}">${inline(heading[2].trim())}</h${level}>`);
      i++; continue;
    }
    const picture = IMAGE_LINE.exec(line);
    if (picture) {
      const id = mediaImageId(picture[2]);
      if (id) html.push(figure(picture[1], id, options));
      i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { html.push('<hr>'); i++; continue; }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      html.push(`<blockquote><p>${quote.map(inline).join('<br>')}</p></blockquote>`);
      continue;
    }
    if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      const ordered = /^\s*\d+\.\s/.test(line);
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(pattern, ''))}</li>`);
      html.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
      const isDivider = (row: string) => /^\s*\|?[\s:-]+(\|[\s:-]+)*\|?\s*$/.test(row);
      const hasHeader = rows.length > 1 && isDivider(rows[1]);
      const head = hasHeader ? `<thead><tr>${cells(rows[0]).map(cell => `<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead>` : '';
      const bodyRows = (hasHeader ? rows.slice(2) : rows).filter(row => !isDivider(row));
      html.push(`<div class="journal-table"><table>${head}<tbody>${bodyRows.map(row => `<tr>${cells(row).map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !(para.length && isBlockStart(lines[i]))) para.push(lines[i++].trim());
    html.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return { html: html.join('\n'), headings };
}

export const renderMarkdown = (markdown: string, options: RenderOptions = {}): string => renderMarkdownFull(markdown, options).html;

/* ---------- Reading the structure (for the contents list, the FAQ data and the checks) ---------- */

export type OutlineItem = { level: number; text: string; line: number; offset: number };

/** Every heading of the post (any level) with its line and character position. Lines inside ``` blocks are not headings. */
export function outline(markdown: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  let fence = false, offset = 0;
  markdown.replace(/\r\n?/g, '\n').split('\n').forEach((line, index) => {
    if (/^\s*```/.test(line)) fence = !fence;
    else if (!fence) {
      const match = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (match) items.push({ level: match[1].length, text: plainText(match[2]), line: index, offset });
    }
    offset += line.length + 1;
  });
  return items;
}

/** The lines of one section: from the line after its heading to the line before the next heading of the same or a higher level. */
export function sectionLines(markdown: string, heading: OutlineItem): string[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const next = outline(markdown).find(item => item.line > heading.line && item.level <= heading.level);
  return lines.slice(heading.line + 1, next ? next.line : lines.length);
}

/** The FAQ section's questions (### headings) and the plain text of each answer. */
export function faqItems(markdown: string, faqHeading: string): Array<{ question: string; answer: string }> {
  const items = outline(markdown);
  const faq = items.find(item => item.level === 2 && item.text.toLowerCase() === faqHeading.toLowerCase());
  if (!faq) return [];
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const end = items.find(item => item.line > faq.line && item.level <= 2)?.line ?? lines.length;
  const questions = items.filter(item => item.level === 3 && item.line > faq.line && item.line < end);
  return questions.map((question, index) => {
    const stop = questions[index + 1]?.line ?? end;
    return { question: question.text, answer: plainText(lines.slice(question.line + 1, stop).join('\n')) };
  });
}

export type MarkdownLink = { text: string; url: string; image: boolean; offset: number };

/** Every [text](url) and ![alt](url) of the text, with its position. */
export function markdownLinks(markdown: string): MarkdownLink[] {
  const found: MarkdownLink[] = [];
  const pattern = /(!?)\[([^\]]*)\]\(([^)\s]*)(?:\s+"[^"]*")?\)/g;
  for (let match = pattern.exec(markdown); match; match = pattern.exec(markdown)) found.push({ image: match[1] === '!', text: match[2], url: match[3], offset: match.index });
  return found;
}
