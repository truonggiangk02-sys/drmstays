import type { Check } from './blog-check';

/** A stretch of the article to colour. Where problems overlap, the stretch is split and a blocking problem wins over a warning. */
export type Mark = { from: number; to: number; level: 'block' | 'warn'; /** The problem to read out when the cursor is in the stretch. */ code: string; message: string };

/**
 * The stretches of the text the checks point at (checks with an offset and a length in the body), cut at every start and end so
 * no two overlap. Stretches outside the text are dropped. Used to colour the problems inside the writing box.
 */
export function problemMarks(checks: Check[], textLength: number): Mark[] {
  const found = checks.filter(check => check.field === 'body' && (check.level === 'block' || check.level === 'warn') && check.offset !== undefined && (check.length || 0) > 0)
    .map(check => ({ from: Math.max(0, check.offset!), to: Math.min(textLength, check.offset! + check.length!), check }))
    .filter(item => item.to > item.from);
  const edges = [...new Set(found.flatMap(item => [item.from, item.to]))].sort((a, b) => a - b);
  const marks: Mark[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const from = edges[i], to = edges[i + 1];
    const covering = found.filter(item => item.from <= from && item.to >= to);
    if (!covering.length) continue;
    const chosen = covering.find(item => item.check.level === 'block') || covering[0];
    const last = marks[marks.length - 1];
    const next: Mark = { from, to, level: chosen.check.level as 'block' | 'warn', code: chosen.check.code, message: chosen.check.message };
    // Neighbouring pieces of the same problem become one.
    if (last && last.to === from && last.code === next.code && last.message === next.message && last.level === next.level) last.to = to;
    else marks.push(next);
  }
  return marks;
}

/** The text cut into pieces: plain stretches and marked ones, in order, for drawing the colours behind the text. */
export function segments(text: string, marks: Mark[]): Array<{ text: string; mark?: Mark }> {
  const out: Array<{ text: string; mark?: Mark }> = [];
  let at = 0;
  for (const mark of marks) {
    if (mark.from > at) out.push({ text: text.slice(at, mark.from) });
    out.push({ text: text.slice(mark.from, mark.to), mark });
    at = mark.to;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
