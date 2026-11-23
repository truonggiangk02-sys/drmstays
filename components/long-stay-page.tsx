import Link from 'next/link';
import { formatPostDate } from '@/lib/journal';
import { opening, priceRows, priceSummary, usd, vnd, type LongStayBuilding } from '@/lib/long-stay';
import type { ContentItem } from '@/lib/site-content';

/** FAQ ids that answer money and terms questions. They are the site's own FAQ items (editable in the admin), so the page and the FAQ never disagree. */
// The "how much is the rent" question is left out on purpose: the table above answers it from live prices, and a typed number could disagree with it.
export const LONG_STAY_FAQ_IDS = ['sample-faq-n3', 'sample-faq-n4', 'sample-faq-n5', 'sample-faq-n1', 'sample-faq-n7'] as const;

export const longStayFaq = (items: ContentItem[]) => LONG_STAY_FAQ_IDS.map(id => items.find(item => item.id === id)).filter((item): item is ContentItem => !!item && !!item.title_en.trim() && !!item.body_en.trim());

/**
 * The page that answers "how much is a furnished apartment in Da Nang per month": the answer first, a table built from the
 * live catalog, the costs and terms from the FAQ, how renting works and a call to action. English only.
 */
export function LongStayPage({ title, buildings, faq, rate, updated }: { title: string; buildings: LongStayBuilding[]; faq: ContentItem[]; rate: number; updated: string }) {
  const rows = priceRows(buildings, 'en');
  const summary = priceSummary(rows);
  const answer = opening(rows, rate);
  const money = (value: number) => <>{vnd(value)}{usd(value, rate) && <small className="longstay-usd"> {usd(value, rate)}</small>}</>;
  const takeaways = [
    summary.studio > 0 && <>Studios from <strong>{vnd(summary.studio)}</strong> per month{usd(summary.studio, rate) && ` (${usd(summary.studio, rate)})`}.</>,
    summary.oneBedroom > 0 && <>One-bedroom apartments from <strong>{vnd(summary.oneBedroom)}</strong> per month{usd(summary.oneBedroom, rate) && ` (${usd(summary.oneBedroom, rate)})`}.</>,
    <>Every apartment is furnished, with a kitchen, Wi-Fi and air conditioning. The deposit is paid once and shown for each type below.</>,
    <>Electricity, water, Wi-Fi and cleaning are separate and written out in the questions further down: no surprise charges.</>,
  ].filter(Boolean);
  const day = formatPostDate(updated, 'en');
  return <>
    <section className="structure-page-hero journal-hero"><span className="eyebrow">DRM STAYS · LONG STAYS</span><h1>{title}</h1><p className="journal-lead">{answer}</p>{day && <p className="journal-meta">Prices last changed {day}. They come straight from our booking system, so they match each room page.</p>}</section>
    <div className="structure-section journal-body-wrap longstay">
      <aside className="longstay-takeaways" aria-label="Key takeaways"><h2>Key takeaways</h2><ul>{takeaways.map((item, index) => <li key={index}>{item}</li>)}</ul></aside>
      <section aria-labelledby="ls-prices">
        <h2 id="ls-prices">Monthly rent by apartment type</h2>
        <p>Prices are per month in Vietnamese dong{rate ? ', with an approximate US dollar amount' : ''}. “From” is the lowest price for that type; each page shows the individual rooms.</p>
        <div className="journal-table"><table>
          <thead><tr><th scope="col">Apartment</th><th scope="col">Building</th><th scope="col">Size</th><th scope="col">Guests</th><th scope="col">Rent from (per month)</th><th scope="col">Deposit</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.href}>
            <td><Link href={row.href}>{row.name}</Link></td><td><Link href={`/en/buildings/${row.buildingId}`}>{row.building}</Link></td>
            <td>{row.areaSqm ? `${row.areaSqm} m²` : ''}</td><td>{row.maxGuests ? `up to ${row.maxGuests}` : ''}</td><td>{money(row.priceFrom)}</td><td>{row.depositVnd ? vnd(row.depositVnd) : ''}</td>
          </tr>)}</tbody>
        </table></div>
        <p>Minimum stay: {Math.min(...rows.map(row => row.minStayMonths || 1))} month{Math.min(...rows.map(row => row.minStayMonths || 1)) === 1 ? '' : 's'}. See all <Link href="/en/stays">buildings and rooms</Link> with photos and availability.</p>
      </section>
      {faq.length > 0 && <section aria-labelledby="ls-costs">
        <h2 id="ls-costs">What you pay besides the rent, and what is included</h2>
        <div className="journal-body">{faq.map(item => <div key={item.id}><h3>{item.title_en}</h3><p>{item.body_en}</p></div>)}</div>
        <p>More answers on the <Link href="/en/faq">FAQ page</Link>.</p>
      </section>}
      <section aria-labelledby="ls-how">
        <h2 id="ls-how">How renting works</h2>
        <ol className="journal-body">
          <li>Choose a building and an apartment type on the <Link href="/en/stays">buildings and rooms page</Link>.</li>
          <li>Send an inquiry with your dates. It is a request, not a reservation or a payment.</li>
          <li>Our team confirms availability and the rental terms in writing, and arranges a viewing at a time that suits you.</li>
          <li>If you decide to rent, you sign the agreement and move in.</li>
        </ol>
      </section>
      <aside className="journal-cta">
        <h2>Ready to see the apartments?</h2><p>Tell us your dates and we reply in English, Japanese, Korean, Chinese, Russian or Vietnamese. Office hours 8:00–17:00 (Vietnam time).</p>
        <div><Link className="structure-button" href="/en/stays">See apartments</Link><Link className="structure-arrow" href="/en/contact">Contact us</Link></div>
      </aside>
    </div>
  </>;
}
