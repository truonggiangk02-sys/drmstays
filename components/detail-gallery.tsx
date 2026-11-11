'use client';

import { useEffect, useRef, useState } from 'react';
import { imgSize, LOGO_SIZE } from '@/lib/image-url';

type Photo = { id: string; url: string; alt: string; width?: number; height?: number };

const words = {
  vi: { all: (n: number) => `Xem tất cả ${n} ảnh`, close: 'Đóng', previous: 'Ảnh trước', next: 'Ảnh tiếp', photo: 'Ảnh', open: 'Phóng to ảnh' },
  en: { all: (n: number) => `Show all ${n} photos`, close: 'Close', previous: 'Previous photo', next: 'Next photo', photo: 'Photo', open: 'Enlarge photo' },
} as const;

/** Photo mosaic (one big photo plus a few small ones, like a listing page) with a full-screen viewer. */
export function DetailGallery({ photos, name, lang }: { photos: Photo[]; name: string; lang: 'vi' | 'en' }) {
  const w = words[lang];
  const images = photos.length ? photos : [{ id: 'fallback', url: '/drm-stay-logo.png', alt: name }];
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  // 1, 2, 3 or 5 tiles so the mosaic always fills its frame
  const shown = images.slice(0, images.length >= 5 ? 5 : images.length >= 3 ? 3 : images.length);
  const size = (image: Photo) => (image.id === 'fallback' ? LOGO_SIZE : imgSize(image));
  const step = (delta: number) => setIndex(current => (current + delta + images.length) % images.length);

  function open(at: number) { setIndex(at); dialog.current?.showModal(); }

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    element.addEventListener('keydown', onKey);
    return () => element.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  return <div className={`dv-gallery has-${shown.length}`} role="group" aria-label={`${name} — ${w.photo.toLowerCase()}`}>
    {shown.map((image, position) => <button key={image.id} type="button" className="dv-tile" style={{ '--i': position } as React.CSSProperties} aria-label={`${w.open} ${position + 1}`} onClick={() => open(position)}>
      <img src={image.url} alt={image.alt || name} loading={position === 0 ? 'eager' : 'lazy'} {...size(image)} />
    </button>)}
    {images.length > 1 && <button type="button" className="dv-all" onClick={() => open(0)}>{w.all(images.length)}</button>}
    <dialog ref={dialog} className="dv-viewer" aria-label={name} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <button type="button" className="dv-viewer-close" aria-label={w.close} onClick={() => dialog.current?.close()}>×</button>
      <div className="dv-viewer-stage">
        {images.length > 1 && <button type="button" className="dv-viewer-nav is-prev" aria-label={w.previous} onClick={() => step(-1)}>‹</button>}
        <img key={images[index].id} src={images[index].url} alt={images[index].alt || name} />
        {images.length > 1 && <button type="button" className="dv-viewer-nav is-next" aria-label={w.next} onClick={() => step(1)}>›</button>}
      </div>
      <p className="dv-viewer-count" aria-live="polite">{index + 1} / {images.length}</p>
      {images.length > 1 && <div className="dv-viewer-strip">{images.map((image, position) => <button key={image.id} type="button" aria-pressed={position === index} aria-label={`${w.photo} ${position + 1}`} onClick={() => setIndex(position)}><img src={image.url} alt="" loading="lazy" /></button>)}</div>}
    </dialog>
  </div>;
}
