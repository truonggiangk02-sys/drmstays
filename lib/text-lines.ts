/**
 * Splits free text into readable rows: one per line, and a single long paragraph is cut into sentences.
 * Used for house rules, which are typed as one block but read better as a list.
 */
export function splitLines(text: string): string[] {
  const lines = text.split(/\r?\n/).map(line => line.replace(/^[\s•·*\-–]+/, '').trim()).filter(Boolean);
  const rows = lines.length > 1 ? lines : lines[0] && lines[0].length > 70 ? lines[0].split(/(?<=[.!?;])\s+(?=\p{Lu}|\d)/u) : lines;
  return rows.map(row => row.replace(/[;]$/, '').trim()).filter(Boolean);
}
