import type { TextEdit } from './editor-text';

/*
 * Editing Markdown tables the way a word processor edits a table: add or remove rows and columns, tidy the columns so the
 * bars line up, move from cell to cell. Pure functions on the text and a cursor position; each change returns one
 * replacement of the whole table so the editor can apply it as a single undoable step.
 */

export type TableModel = {
  /** The table's lines in the text. */
  from: number; to: number;
  /** True when the second line is a divider row, i.e. the first row is a header row. */
  hasHeader: boolean;
  header: string[];
  rows: string[][];
  cols: number;
  /** Where the cursor is: -1 is the header row, 0.. the body rows; the column is 0.. */
  rowIndex: number; colIndex: number;
};

const isTableLine = (line: string) => /^\s*\|/.test(line);
const isDivider = (line: string) => /^\s*\|?[\s:-]+(\|[\s:-]+)*\|?\s*$/.test(line) && /-/.test(line);

/** The cells of one row. A bar written as \| is part of a cell, not a separator. */
export function splitRow(line: string): string[] {
  const text = line.trim();
  const cells: string[] = [];
  let current = '';
  for (let i = text.startsWith('|') ? 1 : 0; i < text.length; i++) {
    if (text[i] === '\\' && text[i + 1] === '|') { current += '\\|'; i++; }
    else if (text[i] === '|') { cells.push(current.trim()); current = ''; }
    else current += text[i];
  }
  if (current.trim() || !text.endsWith('|')) cells.push(current.trim());
  return cells;
}

/** Number of unescaped bars in `text` (the column of a position in a row is the count before it, minus the opening bar). */
const bars = (text: string) => { let n = 0; for (let i = 0; i < text.length; i++) { if (text[i] === '\\' && text[i + 1] === '|') i++; else if (text[i] === '|') n++; } return n; };

/** The table the position is in, or null. */
export function tableAt(value: string, position: number): TableModel | null {
  const lines = value.split('\n');
  let offset = 0, line = 0;
  while (line < lines.length - 1 && position > offset + lines[line].length) { offset += lines[line].length + 1; line++; }
  if (!isTableLine(lines[line] ?? '')) return null;
  let first = line, last = line;
  while (first > 0 && isTableLine(lines[first - 1])) first--;
  while (last < lines.length - 1 && isTableLine(lines[last + 1])) last++;
  const block = lines.slice(first, last + 1);
  const from = lines.slice(0, first).reduce((sum, item) => sum + item.length + 1, 0);
  const to = from + block.join('\n').length;
  const hasHeader = block.length > 1 && isDivider(block[1]);
  const parsed = block.filter((_, i) => !(hasHeader && i === 1)).map(splitRow);
  const cols = Math.max(1, ...parsed.map(row => row.length));
  const pad = (row: string[]) => [...row, ...Array(cols - row.length).fill('')];
  const header = hasHeader ? pad(parsed[0]) : [];
  const rows = (hasHeader ? parsed.slice(1) : parsed).map(pad);
  const inBlock = line - first;
  // With a header the second line is the divider (counted as the first body row), body row i is line i + 2.
  const rowIndex = hasHeader ? (inBlock === 0 ? -1 : Math.max(0, inBlock - 2)) : inBlock;
  const column = bars(lines[line].slice(0, Math.max(0, position - offset))) - (lines[line].trimStart().startsWith('|') ? 1 : 0);
  return { from, to, hasHeader, header, rows, cols, rowIndex: Math.max(hasHeader ? -1 : 0, rowIndex), colIndex: Math.min(cols - 1, Math.max(0, column)) };
}

const width = (cell: string) => Math.max(3, [...cell].length);

/** The table as text with every column padded to the same width, so the bars line up. */
export function formatTable(header: string[], rows: string[][]): string {
  const cols = Math.max(header.length, ...rows.map(row => row.length));
  const all = [header, ...rows];
  const widths = Array.from({ length: cols }, (_, c) => Math.max(...all.map(row => width(row[c] ?? ''))));
  const line = (row: string[]) => `| ${widths.map((w, c) => { const cell = row[c] ?? ''; return cell + ' '.repeat(w - [...cell].length); }).join(' | ')} |`;
  return [line(header), `| ${widths.map(w => '-'.repeat(w)).join(' | ')} |`, ...rows.map(line)].join('\n');
}

/** Where cell (row, col) starts in text made by formatTable (row -1 is the header), and how long its text is. */
function cellSpan(header: string[], rows: string[][], row: number, col: number): { start: number; length: number } {
  const cols = Math.max(header.length, ...rows.map(r => r.length));
  const all = [header, ...rows];
  const widths = Array.from({ length: cols }, (_, c) => Math.max(...all.map(r => width(r[c] ?? ''))));
  const lines = formatTable(header, rows).split('\n');
  const lineIndex = row === -1 ? 0 : row + 2;
  const start = lines.slice(0, lineIndex).reduce((sum, l) => sum + l.length + 1, 0) + 2 + widths.slice(0, col).reduce((sum, w) => sum + w + 3, 0);
  return { start, length: [...(all[row === -1 ? 0 : row + 1][col] ?? '')].length };
}

const done = (model: TableModel, header: string[], rows: string[][], row: number, col: number): TextEdit => {
  const text = formatTable(header, rows);
  const span = cellSpan(header, rows, row, col);
  return { from: model.from, to: model.to, text, selectFrom: model.from + span.start, selectTo: model.from + span.start + span.length };
};

/** A table of `cols` columns and `rows` body rows, with a header row; the first header cell is selected. */
export function newTable(cols: number, rows: number): { text: string; select: { from: number; to: number } } {
  const header = Array.from({ length: cols }, (_, c) => `Column ${c + 1}`);
  const body = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 'Text'));
  const text = formatTable(header, body);
  const span = cellSpan(header, body, -1, 0);
  return { text, select: { from: span.start, to: span.start + span.length } };
}

/** Tidies the table: columns padded so the bars line up (and a missing header divider is not added). */
export const tidyTable = (model: TableModel): TextEdit | null => model.hasHeader ? done(model, model.header, model.rows, model.rowIndex, model.colIndex) : null;

export function insertRow(model: TableModel, where: 'above' | 'below'): TextEdit | null {
  if (!model.hasHeader || (where === 'above' && model.rowIndex < 0)) return null;
  const at = model.rowIndex < 0 ? 0 : where === 'above' ? model.rowIndex : model.rowIndex + 1;
  const rows = [...model.rows.slice(0, at), Array(model.cols).fill(''), ...model.rows.slice(at)];
  return done(model, model.header, rows, at, model.colIndex);
}

export function deleteRow(model: TableModel): TextEdit | null {
  if (!model.hasHeader || model.rowIndex < 0 || model.rows.length < 2) return null;
  const rows = model.rows.filter((_, i) => i !== model.rowIndex);
  return done(model, model.header, rows, Math.min(model.rowIndex, rows.length - 1), model.colIndex);
}

export function insertColumn(model: TableModel, where: 'left' | 'right'): TextEdit | null {
  if (!model.hasHeader) return null;
  const at = where === 'left' ? model.colIndex : model.colIndex + 1;
  const put = (row: string[], cell: string) => [...row.slice(0, at), cell, ...row.slice(at)];
  return done(model, put(model.header, 'Column'), model.rows.map(row => put(row, '')), model.rowIndex, at);
}

export function deleteColumn(model: TableModel): TextEdit | null {
  if (!model.hasHeader || model.cols < 2) return null;
  const drop = (row: string[]) => row.filter((_, c) => c !== model.colIndex);
  return done(model, drop(model.header), model.rows.map(drop), model.rowIndex, Math.min(model.colIndex, model.cols - 2));
}

/** Removes the whole table and the line break after it. */
export function deleteTable(value: string, model: TableModel): TextEdit {
  const to = value[model.to] === '\n' ? model.to + 1 : model.to;
  return { from: model.from, to, text: '', selectFrom: model.from, selectTo: model.from };
}

/** A table without a header row gets one: its first row becomes the header. */
export function addHeader(model: TableModel): TextEdit | null {
  if (model.hasHeader || !model.rows.length) return null;
  const [header, ...rows] = model.rows;
  return done({ ...model, hasHeader: true }, header, rows, -1, model.colIndex);
}

/** The text of each cell as a range in the current text, row by row (header first when there is one); used to move between cells. */
export function cellRanges(value: string, model: TableModel): Array<{ row: number; col: number; from: number; to: number }> {
  const out: Array<{ row: number; col: number; from: number; to: number }> = [];
  const lines = value.slice(model.from, model.to).split('\n');
  let offset = model.from;
  lines.forEach((line, index) => {
    const isDividerRow = model.hasHeader && index === 1;
    if (!isDividerRow) {
      const row = model.hasHeader ? (index === 0 ? -1 : index - 2) : index;
      let col = 0, cursor = 0;
      let start = line.indexOf('|') + 1;
      for (cursor = start; cursor <= line.length; cursor++) {
        const atEnd = cursor === line.length;
        if (atEnd || (line[cursor] === '|' && line[cursor - 1] !== '\\')) {
          const text = line.slice(start, cursor);
          if (!(atEnd && !text.trim())) {
            const lead = text.length - text.trimStart().length;
            out.push({ row, col, from: offset + start + lead, to: offset + start + lead + text.trim().length });
            col++;
          }
          start = cursor + 1;
        }
      }
    }
    offset += line.length + 1;
  });
  return out;
}
