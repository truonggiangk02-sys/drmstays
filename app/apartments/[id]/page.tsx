import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApartments } from "@/lib/data";
import { money } from "@/lib/apartments";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/site";

// Short ISR window: CMS edits show up within a minute without hitting D1 on every visit.
export const revalidate = 60;
const findRoom = async (id: string) => (await getApartments()).find((item) => (item.slug === id || String(item.id) === id) && item.active);
const summary = (text: string) => text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const apartment = await findRoom(id);
  if (!apartment) return { title: "Room not found", robots: { index: false } };
  const image = absoluteUrl(apartment.image);
  const description = summary(`${apartment.description} ${apartment.beds}, up to ${apartment.guests} guests, ${apartment.sqm} m² at ${apartment.building}, Da Nang.`);
  return {
    title: apartment.name,
    description,
    // Canonical and OG URLs must be absolute, so they are only emitted once SITE_URL is configured.
    ...(siteUrl() ? { alternates: { canonical: `/apartments/${apartment.slug}` } } : {}),
    openGraph: { type: "website", title: apartment.name, description, ...(siteUrl() ? { url: `/apartments/${apartment.slug}` } : {}), ...(image ? { images: [{ url: image, alt: apartment.imageDescription }] } : {}) },
  };
}

export default async function ApartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apartment = await findRoom(id);
  if (!apartment) notFound();
  const base = siteUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "HotelRoom",
    name: apartment.name,
    description: apartment.description,
    image: [apartment.image, ...apartment.images.slice(1).map((image) => image.url)].map(absoluteUrl).filter(Boolean),
    ...(base ? { url: `${base}/apartments/${apartment.slug}` } : {}),
    bed: { "@type": "BedDetails", description: apartment.beds },
    occupancy: { "@type": "QuantitativeValue", maxValue: apartment.guests },
    floorSize: { "@type": "QuantitativeValue", value: apartment.sqm, unitCode: "MTK" },
    amenityFeature: apartment.amenities.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    containedInPlace: { "@type": "LodgingBusiness", name: apartment.building, address: { "@type": "PostalAddress", streetAddress: apartment.address, addressLocality: "Da Nang", addressCountry: "VN" } },
    offers: { "@type": "Offer", price: apartment.price, priceCurrency: "VND", availability: apartment.availableUnits === 0 ? "https://schema.org/SoldOut" : "https://schema.org/InStock" },
  };
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}/>
    <header className="site-header detail-header"><Link className="brand" href="/"><span className="brand-mark">D</span><span>DORAEMON<span className="brand-accent"> LAND</span><small>SERVICED APARTMENTS IN DA NANG</small></span></Link><Link href="/#apartments">← All room types</Link></header>
    <div className="detail-wrap"><p className="eyebrow">{apartment.building.toUpperCase()} · {apartment.area.toUpperCase()}</p><h1>{apartment.name}</h1><p className="detail-sub">Up to {apartment.guests} guests · {apartment.beds} · {apartment.sqm} m²</p>
      <div className="detail-layout"><div><div className="detail-photo"><img className="detail-image" src={apartment.image} alt={apartment.imageDescription} width={1040} height={800} fetchPriority="high" decoding="async"/>{!apartment.images.length && <span>Illustrative photo · actual room photos coming soon</span>}</div>{apartment.images.length > 1 && <div className="detail-gallery">{apartment.images.slice(1).map(image => <img key={image.id} src={image.url} alt={image.alt} width={480} height={400} loading="lazy" decoding="async"/>)}</div>}<div className="detail-copy"><h2>Settle in, stay a while.</h2><p>{apartment.description}</p><p>Wi-Fi: {apartment.wifi}</p><div className="detail-facts"><p><strong>Building</strong>{apartment.building}<br/>{apartment.address}</p><p><strong>View</strong>{apartment.view}</p></div><h3>What’s included</h3><ul>{apartment.amenities.map((amenity) => <li key={amenity}>✓ {amenity}</li>)}</ul></div></div>
        <aside className="booking-panel"><span className="eyebrow">YOUR STAY</span><p className="price-large">{money(apartment.price)} <small>/ night</small></p><p className="price-large monthly">{money(apartment.monthlyPrice)} <small>/ month</small></p><p className="usd-guide">USD guide: ${apartment.usdNightly}/night · ${apartment.usdMonthly}/month</p>{apartment.availableUnits !== null && <p className={apartment.availableUnits === 0 ? "availability-badge unavailable" : "availability-badge"}>{apartment.availableUnits === 0 ? "Fully booked for selected period" : `Only ${apartment.availableUnits} ${apartment.availableUnits === 1 ? "room" : "rooms"} left`}</p>}<p className="price-note">Rates are indicative. We’ll confirm availability and the final price for your dates before booking.</p>{apartment.availableUnits !== 0 && <form action="/api/inquiries" method="post"><input type="hidden" name="apartmentId" value={apartment.id}/><label>Check in<input required name="checkIn" type="date"/></label><label>Check out<input required name="checkOut" type="date"/></label><label>Guests<input required name="guests" type="number" min="1" max={apartment.guests} defaultValue="2"/></label><label>Your name<input required name="name" maxLength={100} autoComplete="name"/></label><label>Email<input required name="email" type="email" maxLength={254} autoComplete="email"/></label><label>Message (optional)<textarea name="message" maxLength={1000} rows={3}/></label><div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><button type="submit">Request to book ↗</button></form>}<small>No payment is collected. We’ll reply to confirm your request.</small></aside></div>
    </div>
  </main>;
}

