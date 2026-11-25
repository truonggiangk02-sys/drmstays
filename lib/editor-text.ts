/*
 * Text edits for the journal editor's toolbar and shortcuts. Each function takes the text and the selection and returns one
 * replacement (what to cut out, what to put in, where the selection ends up), so the editor can apply it as a single
 * undoable step. Pure functions: no DOM, easy to test.
 */

export type TextEdit = {
  /** The range of the old text that is replaced. */
  from: number; to: number;
  text: string;
  /** Selection in the new text, as positions in the whole new text. */
  selectFrom: number; selectTo: number;
};

/** Start of the line that holds `position`, and the end of the line that holds `end` (without the line break). */
export function lineRange(value: string, start: number, end: number): { from: number; to: number } {
  const from = value.lastIndexOf('\n', Math.max(0, start) - 1) + 1;
  const next = value.indexOf('\n', end);
  return { from, to: next === -1 ? value.length : next };
}

/** **bold**, *italic*, `code`: wraps the selection, or takes the wrapping off when it is already there. */
export function wrapSelection(value: string, start: number, end: number, mark: string, placeholder: string): TextEdit {
  const before = value.slice(start - mark.length, start), after = value.slice(end, end + mark.length);
  if (start !== end && before === mark && after === mark) {
    return { from: start - mark.length, to: end + mark.length, text: value.slice(start, end), selectFrom: start - mark.length, selectTo: end - mark.length };
  }
  const inside = start === end ? placeholder : value.slice(start, end);
  return { from: start, to: end, text: `${mark}${inside}${mark}`, selectFrom: start + mark.length, selectTo: start + mark.length + inside.length };
}

/** Turns the lines of the selection into a list or a quote ("- ", "> ", or "1. 2. 3."); a second press turns them back. */
export function toggleLinePrefix(value: string, start: number, end: number, kind: 'bullet' | 'quote' | 'number'): TextEdit {
  const { from, to } = lineRange(value, start, end);
  const lines = value.slice(from, to).split('\n');
  const pattern = kind === 'bullet' ? /^\s*[-*+]\s+/ : kind === 'quote' ? /^\s*>\s?/ : /^\s*\d+\.\s+/;
  const filled = lines.filter(line => line.trim());
  const already = filled.length > 0 && filled.every(line => pattern.test(line));
  let count = 0;
  const next = lines.map(line => {
    if (!line.trim()) return line;
    if (already) return line.replace(pattern, '');
    count += 1;
    const bare = line.replace(/^\s*(?:[-*+]|\d+\.|>)\s+/, ''); // another list or quote mark is replaced, not kept
    return `${kind === 'bullet' ? '- ' : kind === 'quote' ? '> ' : `${count}. `}${bare}`;
  }).join('\n');
  return { from, to, text: next, selectFrom: from, selectTo: from + next.length };
}

/** Makes the line a ## or ### heading (a second press removes the heading mark). */
export function toggleHeading(value: string, start: number, end: number, level: 2 | 3): TextEdit {
  const { from, to } = lineRange(value, start, start === end ? end : start);
  const line = value.slice(from, to);
  const mark = '#'.repeat(level);
  const bare = line.replace(/^\s*#{1,6}\s*/, '');
  const text = new RegExp(`^\\s*${mark}\\s`).test(line) ? bare : `${mark} ${bare || 'Heading'}`;
  return { from, to, text, selectFrom: from + text.length - (bare || 'Heading').length, selectTo: from + text.length };
}

/** Puts `text` where the cursor is (replacing the selection), with the cursor after it, or on `select` inside it. */
export function insertText(start: number, end: number, text: string, select?: { from: number; to: number }): TextEdit {
  return { from: start, to: end, text, selectFrom: start + (select ? select.from : text.length), selectTo: start + (select ? select.to : text.length) };
}

/** [label](https://drmstays.vn/en/): the selection becomes the label and the address is selected, ready to type over. */
export function makeLink(value: string, start: number, end: number): TextEdit {
  const label = start === end ? 'link text' : value.slice(start, end);
  const address = 'https://drmstays.vn/en/';
  const text = `[${label}](${address})`;
  const at = label.length + 3;
  return insertText(start, end, text, { from: at, to: at + address.length });
}

/**
 * The line breaks to put around a block (heading, list, table) so it stands on its own: a blank line before and after,
 * not more than needed, depending on what is already there.
 */
export function asBlock(value: string, start: number, end: number, block: string, select?: { from: number; to: number }): TextEdit {
  const before = value.slice(0, start), after = value.slice(end);
  const lead = !before.trim() ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = !after.trim() ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  return insertText(start, end, `${lead}${block}${trail}`, select ? { from: lead.length + select.from, to: lead.length + select.to } : { from: lead.length + block.length + trail.length, to: lead.length + block.length + trail.length });
}

/* Sections the standard asks for. The gaps are marked [NEEDS INPUT: ...] on purpose: rule R16 blocks the post until they are filled. */
export const KEY_TAKEAWAYS_BLOCK = '## Key takeaways\n\n- [NEEDS INPUT: key point 1]\n- [NEEDS INPUT: key point 2]\n- [NEEDS INPUT: key point 3]';
export const FAQ_BLOCK = '## Frequently asked questions\n\n### [NEEDS INPUT: question 1]?\n\n[NEEDS INPUT: answer, 30-70 words]\n\n### [NEEDS INPUT: question 2]?\n\n[NEEDS INPUT: answer, 30-70 words]\n\n### [NEEDS INPUT: question 3]?\n\n[NEEDS INPUT: answer, 30-70 words]';
export const CTA_BLOCK = 'Ready to see rooms? [See our apartments](/en/stays) or [contact us](/en/contact).';
export const TABLE_BLOCK = '| Column | Column |\n| --- | --- |\n| Text | Text |';

export type OutlineEntry = { level: number; text: string; offset: number; words: number };

/** The headings of the post with the number of words under each (up to the next heading). */
export function outlineWithWords(items: Array<{ level: number; text: string; offset: number }>, value: string, countWords: (text: string) => number): OutlineEntry[] {
  return items.filter(item => item.level >= 2).map((item, index, all) => {
    const stop = all[index + 1]?.offset ?? value.length;
    const body = value.slice(item.offset, stop).replace(/^[^\n]*\n?/, '');
    return { ...item, words: countWords(body) };
  });
}
