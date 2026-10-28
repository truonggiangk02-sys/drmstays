'use client';

import { useState } from 'react';

type Photo = { id: string; url: string; alt: string };

export function PropertyGallery({ photos, name, lang, variant }: { photos: Photo[]; name: string; lang: 'vi' | 'en'; variant: 'building' | 'room' }) {
  const [active, setActive] = useState(0);
  const images = photos.length ? photos : [{ id: 'fallback', url: '/drm-stay-logo.png', alt: name }];
  const index = Math.min(active, images.length - 1);
  const labels = lang === 'vi'
    ? { previous: 'Ảnh trước', next: 'Ảnh tiếp', choose: 'Xem ảnh', photo: 'Ảnh' }
    : { previous: 'Previous photo', next: 'Next photo', choose: 'Show photo', photo: 'Photo' };

  return <div className={`structure-property-gallery is-${variant}`} role="group" aria-label={`${name} — ${labels.photo.toLowerCase()}`}>
    <div className="structure-gallery-main">
      <img src={images[index].url} alt={images[index].alt || name} />
      {images.length > 1 && <div className="structure-gallery-controls">
        <button type="button" aria-label={labels.previous} onClick={() => setActive((index - 1 + images.length) % images.length)}>‹</button>
        <span aria-live="polite">{index + 1} / {images.length}</span>
        <button type="button" aria-label={labels.next} onClick={() => setActive((index + 1) % images.length)}>›</button>
      </div>}
    </div>
    {images.length > 1 && <div className="structure-gallery-thumbnails" role="group" aria-label={`${labels.photo} — ${name}`}>
      {images.map((image, photoIndex) => <button key={image.id} type="button" aria-label={`${labels.choose} ${photoIndex + 1}: ${image.alt || name}`} aria-pressed={photoIndex === index} onClick={() => setActive(photoIndex)}><img src={image.url} alt="" loading="lazy" /></button>)}
    </div>}
  </div>;
}
