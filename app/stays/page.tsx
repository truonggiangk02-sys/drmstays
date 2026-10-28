import Link from 'next/link';
import { getPublicCatalog } from '@/lib/public-catalog';

export const dynamic = 'force-dynamic';

function money(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
}) {
  const query = await searchParams;
  const checkIn = typeof query.checkIn === 'string' ? query.checkIn : '';
  const checkOut = typeof query.checkOut === 'string' ? query.checkOut : '';
  let catalog;
  let error = '';
  try {
    catalog = await getPublicCatalog(checkIn || undefined, checkOut || undefined);
  } catch {
    error = 'Room listings are temporarily unavailable. Please try again later.';
  }
  return (
    <main className="public-catalog">
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">D</span>
          <span>
            DORAEMON<span className="brand-accent"> LAND</span>
            <small>OPERATED BY DRM STAYS</small>
          </span>
        </Link>
        <nav>
          <Link href="/">Home</Link>
          <a href="#buildings">Buildings</a>
        </nav>
      </header>
      <section className="catalog-hero">
        <span className="eyebrow">DORAEMON LAND · DRM STAYS</span>
        <h1>Find your place in Da Nang.</h1>
        <p>
          Explore our buildings and rooms. Select your dates to see current availability, then leave
          your details and our team will contact you.
        </p>
        <form action="/stays" method="get" className="catalog-date-search">
          <label>
            Check-in
            <input name="checkIn" type="date" required defaultValue={checkIn} />
          </label>
          <label>
            Check-out
            <input name="checkOut" type="date" required defaultValue={checkOut} />
          </label>
          <button>Check availability</button>
        </form>
      </section>
      <section id="buildings" className="catalog-buildings">
        {error && (
          <p role="alert" className="catalog-error">
            {error}
          </p>
        )}
        {catalog && !catalog.buildings.length && <p>No buildings have been published yet.</p>}
        {catalog?.buildings.map((building) => (
          <article key={building.id} className="catalog-building">
            <div className="catalog-building-intro">
              {building.images[0] ? (
                <img src={building.images[0].url} alt={building.images[0].alt || building.name} />
              ) : (
                <div className="catalog-image-placeholder">{building.name}</div>
              )}
              <div>
                <span className="eyebrow">OPERATED BY DRM STAYS</span>
                <h2>{building.name}</h2>
                {building.address && <p>{building.address}</p>}
                {building.description && <p>{building.description}</p>}
                {building.services.length > 0 && (
                  <ul className="catalog-services">
                    {building.services.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {building.images.length > 1 && (
                  <div className="catalog-building-gallery">
                    {building.images.slice(1).map((image) => (
                      <img key={image.id} src={image.url} alt={image.alt || building.name} loading="lazy" decoding="async" />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="catalog-room-grid">
              {building.rooms.map((room) => (
                <section key={room.id} className="catalog-room">
                  {room.images[0] ? (
                    <img
                      className="catalog-room-cover"
                      src={room.images[0].url}
                      alt={room.images[0].alt || room.name}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="catalog-image-placeholder">Photo coming soon</div>
                  )}
                  <div className="catalog-room-body">
                    <div className="catalog-room-title">
                      <h3>{room.name}</h3>
                      {room.available !== null && (
                        <span
                          className={room.available ? 'catalog-available' : 'catalog-unavailable'}
                        >
                          {room.available
                            ? 'Available for selected dates'
                            : 'Unavailable for selected dates'}
                        </span>
                      )}
                    </div>
                    {room.description && <p>{room.description}</p>}
                    <p className="catalog-prices">
                      {room.nightlyPrice > 0 && <span>{money(room.nightlyPrice)} ₫ / night</span>}
                      {room.monthlyPrice > 0 && <span>{money(room.monthlyPrice)} ₫ / month</span>}
                    </p>
                    {room.services.length > 0 && (
                      <ul className="catalog-services">
                        {room.services.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {room.images.length > 1 && (
                      <div className="catalog-room-gallery">
                        {room.images.slice(1).map((image) => (
                          <img key={image.id} src={image.url} alt={image.alt || room.name} loading="lazy" decoding="async" />
                        ))}
                      </div>
                    )}
                    <details className="catalog-contact">
                      <summary>Ask about this room</summary>
                      <form action="/api/catalog-inquiries" method="post">
                        <input type="hidden" name="sourceRoomId" value={room.id} />
                        <label>
                          Your name
                          <input name="name" required maxLength={100} />
                        </label>
                        <label>
                          Phone or WhatsApp
                          <input name="phone" required maxLength={24} />
                        </label>
                        <label>
                          Email (optional)
                          <input type="email" name="email" maxLength={254} />
                        </label>
                        <div className="catalog-date-pair">
                          <label>
                            Preferred check-in
                            <input type="date" name="checkIn" defaultValue={checkIn} />
                          </label>
                          <label>
                            Preferred check-out
                            <input type="date" name="checkOut" defaultValue={checkOut} />
                          </label>
                        </div>
                        <label>
                          Message / viewing request
                          <textarea name="message" maxLength={1000} rows={3} />
                        </label>
                        <label className="honeypot" aria-hidden="true">
                          Website
                          <input name="website" tabIndex={-1} autoComplete="off" />
                        </label>
                        <button>Send request</button>
                        <small>
                          Our team will contact you to confirm details. No reservation or payment is
                          made here.
                        </small>
                      </form>
                    </details>
                  </div>
                </section>
              ))}
            </div>
          </article>
        ))}
      </section>
      <footer>
        <div className="footer-brand">
          Doraemon Land<span>Operated by DRM Stays</span>
        </div>
        <p>Availability and prices are confirmed by our team when we contact you.</p>
      </footer>
    </main>
  );
}
