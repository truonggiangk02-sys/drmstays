/** Positions of every non-overlapping match of `query` in `text`. */
export function findMatches(text: string, query: string, matchCase = false): number[] {
  if (!query) return [];
  const haystack = matchCase ? text : text.toLowerCase();
  const needle = matchCase ? query : query.toLowerCase();
  const found: number[] = [];
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) found.push(at);
  return found;
}

/** The text with every match replaced, and how many there were. The replacement is taken as it is (no pattern characters). */
export function replaceAllText(text: string, query: string, replacement: string, matchCase = false): { text: string; count: number } {
  const matches = findMatches(text, query, matchCase);
  if (!matches.length) return { text, count: 0 };
  let out = '', at = 0;
  for (const match of matches) { out += text.slice(at, match) + replacement; at = match + query.length; }
  return { text: out + text.slice(at), count: matches.length };
}

/** The first match at or after `from`, wrapping round to the start; null when there is none. */
export function nextMatch(text: string, query: string, from: number, matchCase = false): number | null {
  const matches = findMatches(text, query, matchCase);
  return matches.find(position => position >= from) ?? matches[0] ?? null;
}
