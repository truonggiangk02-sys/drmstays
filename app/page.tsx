import type { Metadata } from "next";
import Link from "next/link";
import { getApartments } from "@/lib/data";
import { BookingExperience } from "@/components/booking-experience";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, jsonLd, siteUrl } from "@/lib/site";

// Short ISR window: CMS edits show up within a minute without hitting D1 on every visit.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return siteUrl() ? { alternates: { canonical: "/" } } : {};
}

export default async function Home() {
  const apartments = (await getApartments()).filter((apartment) => apartment.active);
  const base = siteUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    ...(base ? { url: base } : {}),
    ...(apartments[0] && absoluteUrl(apartments[0].image) ? { image: absoluteUrl(apartments[0].image) } : {}),
    address: { "@type": "PostalAddress", addressLocality: "Da Nang", addressCountry: "VN" },
    makesOffer: apartments.map((room) => ({ "@type": "Offer", name: room.name, price: room.price, priceCurrency: "VND" })),
  };
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}/>
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark">D</span><span>DORAEMON<span className="brand-accent"> LAND</span><small>SERVICED APARTMENTS IN DA NANG</small></span></Link>
      <nav><a href="#apartments">Room types</a><a href="#buildings">Our buildings</a><a href="#why-stay">The experience</a></nav>
      <a className="header-cta" href="#apartments">Explore stays <span>↗</span></a>
    </header>
    <section className="hero">
      <div className="hero-shade"/>
      <div className="hero-content"><div className="eyebrow light">DORAEMON LAND · DA NANG, VIETNAM</div><h1>Make room for<br/><em>more moments.</em></h1><p>Boutique Living by My Khe Beach &amp; An Thuong Quarter.</p><a className="hero-link" href="#apartments">Find your place <span>↘</span></a></div>
      <div className="hero-side">MY KHE BEACH <span>·</span> AN THUONG QUARTER</div>
    </section>
    <BookingExperience apartments={apartments}/>
    <section id="buildings" className="buildings"><span className="eyebrow">TWO DA NANG ADDRESSES</span><h2>Choose your neighbourhood.</h2><div className="building-grid"><div><span>01 / MY KHE BEACH</span><h3>AnLiu Apartment</h3><p>Mai Thuc Lan Street · 150 m to My Khe Beach</p><p>Oceanfront executive suites and peaceful courtyard studios.</p></div><div><span>02 / AN THUONG</span><h3>Doraemonland</h3><p>Do Ba Street · About 300 m walk to My Khe Beach</p><p>Urban studios close to cafés, the night market, and beach life.</p></div></div></section>
    <section id="why-stay" className="promise"><div><span className="eyebrow light">STAY A LITTLE LONGER</span><h2>The ease of a hotel.<br/><em>The feeling of home.</em></h2></div><div className="promise-items"><div><span>01</span><h3>Space to settle in</h3><p>Studios and suites with practical kitchens and in-unit laundry.</p></div><div><span>02</span><h3>Set up for your routine</h3><p>Fast Wi-Fi and comfortable spaces for work or downtime.</p></div><div><span>03</span><h3>Da Nang at your door</h3><p>Walk to the beach, neighbourhood cafés, and local favourites.</p></div></div></section>
    <footer><div className="footer-brand">Doraemon Land<span>Serviced Apartments in Da Nang</span></div><p>Boutique Living by My Khe Beach &amp; An Thuong Quarter.</p><div><a href="#apartments">Request a stay</a><Link href="/admin/login">Host login</Link></div><small>© {new Date().getFullYear()} Doraemon Land · Some room photos are illustrative. Prices and availability are confirmed with every request.</small></footer>
  </main>;
}


