'use client';

import { useEffect, useRef, useState } from 'react';
import { imgSize, LOGO_SIZE } from '@/lib/image-url';
import { AREA_LABELS, IMAGE_AREAS, isImageArea } from '@/lib/image-area';
import { JustifiedPhotos } from '@/components/justified-photos';

type Photo = { id: string; url: string; alt: string; width?: number; height?: number; area?: string };

const words = {
  vi: { all: (n: number) => `Xem tất cả ${n} ảnh`, close: 'Đóng', previous: 'Ảnh trước', next: 'Ảnh tiếp', photo: 'Ảnh', open: 'Phóng to ảnh', byArea: 'Ảnh theo khu vực', every: 'Tất cả ảnh', photos: 'ảnh' },
  en: { all: (n: number) => `Show all ${n} photos`, close: 'Close', previous: 'Previous photo', next: 'Next photo', photo: 'Photo', open: 'Enlarge photo', byArea: 'Photos by area', every: 'All photos', photos: 'photos' },
} as const;

/** Photo mosaic (one big photo plus a few small ones, like a listing page) with a full-screen viewer. */
export function DetailGallery({ photos, name, lang, areas = true }: { photos: Photo[]; name: string; lang: 'vi' | 'en'; areas?: boolean }) {
  const w = words[lang];
  const images = photos.length ? photos : [{ id: 'fallback', url: '/drm-stay-logo.png', alt: name }];
  // Every photo is shown below the mosaic, grouped by the part of the home it shows (bedroom, living room, bathroom ...).
  const groups = (() => {
    if (!areas || photos.length <= 1) return [];
    const labels = AREA_LABELS[lang];
    const tagged = photos.some(photo => photo.area && isImageArea(photo.area));
    if (!tagged) return [{ key: 'all', label: w.every, items: photos }];
    const list = IMAGE_AREAS.map(area => ({ key: area as string, label: labels[area], items: photos.filter(photo => photo.area === area) }));
    list.push({ key: 'other', label: labels.other, items: photos.filter(photo => !photo.area || !isImageArea(photo.area)) });
    return list.filter(group => group.items.length);
  })();
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  // 1, 2 or 3 tiles: one large photo plus two beside it keeps every tile close to a photo's own shape, so little is cropped
  const shown = images.slice(0, Math.min(3, images.length));
  // the frame follows the shape of the first photo (kept within a sensible range)
  const first = images[0] as Photo;
  const shape = first.width && first.height ? Math.min(1.9, Math.max(1.15, first.width / first.height)) : 1.5;
  const size = (image: Photo) => (image.id === 'fallback' ? LOGO_SIZE : imgSize(image));
  const step = (delta: number) => setIndex(current => (current + delta + images.length) % images.length);

  const openPhoto = (photo: Photo) => open(Math.max(0, images.findIndex(image => image.id === photo.id)));
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

  return <><div className={`dv-gallery has-${shown.length}`} style={{ '--r': shape.toFixed(3) } as React.CSSProperties} role="group" aria-label={`${name} — ${w.photo.toLowerCase()}`}>
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
      <p className="dv-viewer-count" aria-live="polite">{(() => { const area = images[index].area; return area && isImageArea(area) ? `${AREA_LABELS[lang][area]} · ` : ''; })()}{index + 1} / {images.length}</p>
      {images.length > 1 && <div className="dv-viewer-strip">{images.map((image, position) => <button key={image.id} type="button" aria-pressed={position === index} aria-label={`${w.photo} ${position + 1}`} onClick={() => setIndex(position)}><img src={image.url} alt="" loading="lazy" /></button>)}</div>}
    </dialog>
  </div>
  {groups.length > 0 && <div className="dv-areas" aria-label={w.byArea}>
    {groups.length > 1 && <nav className="dv-areas-nav" aria-label={w.byArea}>{groups.map(group => <a key={group.key} href={`#dv-area-${group.key}`} onClick={event => { event.preventDefault(); document.getElementById(`dv-area-${group.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{group.label}<b>{group.items.length}</b></a>)}</nav>}
    {groups.map(group => <section key={group.key} id={`dv-area-${group.key}`} className="dv-area"><h3>{group.label}<small>{group.items.length} {w.photos}</small></h3><JustifiedPhotos photos={group.items} label={`${name} — ${group.label}`} target={190} maxRowHeight={300} onOpen={at => openPhoto(group.items[at])} /></section>)}
  </div>}
  </>;
}
