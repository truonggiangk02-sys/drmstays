import { splitLines } from '@/lib/text-lines';
import { Ico, iconForAmenity, iconForRule, type Accent, type IconName } from './detail-icons';

/** A titled block of a detail page, separated from the previous one by a rule. */
export function DetailBlock({ title, children, icon, accent = 'green' }: { title: string; children: React.ReactNode; icon?: IconName; accent?: Accent }) {
  return <section className="dv-block" data-reveal><h2>{icon && <Ico name={icon} accent={accent} size="sm" />}{title}</h2>{children}</section>;
}

/** "Label ........ value" rows in two columns (used where space is tight, e.g. the enquiry card). */
export function FactRows({ rows }: { rows: Array<[string, string | number | undefined]> }) {
  const visible = rows.filter(([, value]) => value !== undefined && value !== '' && value !== 0);
  if (!visible.length) return null;
  return <dl className="dv-facts">{visible.map(([label, value], i) => <div key={label} style={{ '--i': i } as React.CSSProperties}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

/** Key numbers as coloured tiles: icon, big value, small label. */
export function StatTiles({ items }: { items: Array<{ icon: IconName; accent: Accent; label: string; value: string | number | undefined }> }) {
  const visible = items.filter(item => item.value !== undefined && item.value !== '' && item.value !== 0);
  if (!visible.length) return null;
  return <ul className="dv-stats">{visible.map((item, i) => <li key={item.label} className={`is-${item.accent}`} style={{ '--i': i } as React.CSSProperties}>
    <Ico name={item.icon} accent={item.accent} size="lg" /><strong>{item.value}</strong><span>{item.label}</span></li>)}</ul>;
}

/** Amenities and furniture, each with its own coloured icon; long lists fold the rest behind "show more". */
export function FeatureGrid({ items, more }: { items: string[]; more: (count: number) => string }) {
  if (!items.length) return null;
  // fold only a real tail: showing "3 more" is not worth an extra click
  const limit = items.length > 11 ? 9 : items.length, head = items.slice(0, limit), rest = items.slice(limit);
  const list = (entries: string[]) => <ul className="dv-features">{entries.map((item, i) => { const [name, accent] = iconForAmenity(item); return <li key={item} style={{ '--i': i } as React.CSSProperties}><Ico name={name} accent={accent} /><span>{item}</span></li>; })}</ul>;
  return <>{list(head)}{rest.length > 0 && <details className="dv-more"><summary>{more(rest.length)}</summary>{list(rest)}</details>}</>;
}

/** House rules or fees as one row per line, each with an icon that matches what it says. */
export function RuleRows({ text }: { text: string }) {
  const rows = splitLines(text);
  if (!rows.length) return null;
  return <ul className="dv-rules">{rows.map((row, i) => { const [name, accent] = iconForRule(row); return <li key={row} style={{ '--i': i } as React.CSSProperties}><Ico name={name} accent={accent} size="sm" /><span>{row}</span></li>; })}</ul>;
}
