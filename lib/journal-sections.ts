import { markdownLinks, mediaImageId, outline } from '@/lib/journal-markdown';
import { asBlock, lineRange, type TextEdit } from '@/lib/editor-text';

/*
 * The post seen as sections, for the picture panel: the opening (before the first heading) and every ## section (its ### parts
 * belong to it). Each section knows where a new picture goes (right under the heading; in the opening, after the first
 * paragraph so the answer stays first) and which pictures it already has. Pure functions: no DOM.
 */

export type SectionPicture = { url: string; alt: string; id: string; offset: number; length: number };
export type Section = {
  /** 'intro' or 'h2-<n>' (n counts the ## headings from 0): stays the same while pictures are added. */
  key: string;
  title: string;
  /** Where the section starts and ends in the text. */
  from: number; to: number;
  /** Where a new picture is put. */
  insertAt: number;
  pictures: SectionPicture[];
};

export function planSections(body: string): Section[] {
  const headings = outline(body).filter(item => item.level === 2);
  const intro = headings[0]?.offset ?? body.length;
  const firstBreak = /\n\s*\n/.exec(body.slice(0, intro));
  const sections: Section[] = [{ key: 'intro', title: '', from: 0, to: intro, insertAt: firstBreak ? firstBreak.index : intro, pictures: [] }];
  headings.forEach((heading, index) => {
    const end = headings[index + 1]?.offset ?? body.length;
    sections.push({ key: `h2-${index}`, title: heading.text, from: heading.offset, to: end, insertAt: lineRange(body, heading.offset, heading.offset).to, pictures: [] });
  });
  for (const link of markdownLinks(body)) {
    if (!link.image) continue;
    const section = sections.find(item => link.offset >= item.from && link.offset < item.to);
    section?.pictures.push({ url: link.url, alt: link.text, id: mediaImageId(link.url) || '', offset: link.offset, length: link.length });
  }
  return sections;
}

export const applyEdit = (value: string, edit: TextEdit) => value.slice(0, edit.from) + edit.text + value.slice(edit.to);

/** The text with the pictures (Markdown lines) put in the section, as their own block. */
export function addPictures(body: string, key: string, lines: string[]): string {
  if (!lines.length) return body;
  const sections = planSections(body);
  const section = sections.find(item => item.key === key) || sections[0];
  return applyEdit(body, asBlock(body, section.insertAt, section.insertAt, lines.join('\n\n')));
}

/** The text without one picture (its whole line, when the picture is alone on it) and without the blank line it leaves behind. */
export function removePicture(body: string, picture: Pick<SectionPicture, 'offset' | 'length'>): string {
  const { from, to } = lineRange(body, picture.offset, picture.offset + picture.length);
  const alone = body.slice(from, to).trim() === body.slice(picture.offset, picture.offset + picture.length).trim();
  if (!alone) return body.slice(0, picture.offset) + body.slice(picture.offset + picture.length);
  const before = body.slice(0, from), after = body.slice(to).replace(/^\n+/, '');
  return `${before.replace(/\n+$/, before.trim() ? '\n\n' : '')}${after}`.replace(/\n{3,}/g, '\n\n');
}

/** Ids of the pictures that appear in the text. */
export const usedPictureIds = (body: string) => new Set(markdownLinks(body).filter(link => link.image).map(link => mediaImageId(link.url)).filter(Boolean));

/** Numbered headings for the outline: "1", "1.1", … (## and ### only; the page's own H1 is the title). */
export function numberHeadings<T extends { level: number }>(items: T[]): Array<T & { number: string }> {
  let two = 0, three = 0;
  return items.map(item => {
    if (item.level === 2) { two += 1; three = 0; return { ...item, number: `${two}` }; }
    if (item.level === 3) { three += 1; return { ...item, number: `${two}.${three}` }; }
    return { ...item, number: '' };
  });
}
