import { splitLines } from '@/lib/text-lines';

const Check = () => <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Dot = () => <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="3.2" fill="currentColor" /></svg>;

/** A titled block of a detail page, separated from the previous one by a rule. */
export function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="dv-block" data-reveal><h2>{title}</h2>{children}</section>;
}

/** "Label ........ value" rows in two columns. */
export function FactRows({ rows }: { rows: Array<[string, string | number | undefined]> }) {
  const visible = rows.filter(([, value]) => value !== undefined && value !== '' && value !== 0);
  if (!visible.length) return null;
  return <dl className="dv-facts">{visible.map(([label, value], i) => <div key={label} style={{ '--i': i } as React.CSSProperties}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

/** Amenities and furniture with a check mark each; long lists fold the rest behind "show more". */
export function FeatureGrid({ items, more }: { items: string[]; more: (count: number) => string }) {
  if (!items.length) return null;
  // fold only a real tail: showing "3 more" is not worth an extra click
  const limit = items.length > 11 ? 9 : items.length, head = items.slice(0, limit), rest = items.slice(limit);
  const list = (entries: string[]) => <ul className="dv-features">{entries.map((item, i) => <li key={item} style={{ '--i': i } as React.CSSProperties}><Check /><span>{item}</span></li>)}</ul>;
  return <>{list(head)}{rest.length > 0 && <details className="dv-more"><summary>{more(rest.length)}</summary>{list(rest)}</details>}</>;
}

/** House rules or fees as one row per line, instead of a single dense paragraph. */
export function RuleRows({ text }: { text: string }) {
  const rows = splitLines(text);
  if (!rows.length) return null;
  return <ul className="dv-rules">{rows.map((row, i) => <li key={row} style={{ '--i': i } as React.CSSProperties}><Dot /><span>{row}</span></li>)}</ul>;
}
