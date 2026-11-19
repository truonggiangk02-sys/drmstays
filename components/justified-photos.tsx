'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { balancedRows, photoRatio } from '@/lib/justified';
import { imgSize } from '@/lib/image-url';

type Photo = { url: string; alt: string; width?: number; height?: number };

/** Measures the width of an element and splits photos into full-width rows for that width (null until measured, e.g. on the server). */
export function useJustifiedRows(ratios: number[], target: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('ResizeObserver' in window)) return;
    const observer = new ResizeObserver(() => setWidth(Math.round(element.clientWidth)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const key = ratios.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => width ? balancedRows(ratios, width, target) : null, [key, width, target]);
  return { ref, rows };
}

/** A set of photos laid out in full-width rows, none of them cropped. */
export function JustifiedPhotos({ photos, label, target = 240, onOpen, maxRowHeight }: { photos: Photo[]; label: string; target?: number; onOpen?: (index: number) => void; maxRowHeight?: number }) {
  const ratios = photos.map(photoRatio);
  const { ref, rows } = useJustifiedRows(ratios, target);
  const render = (index: number) => onOpen ? <button type="button" className="jp-open" key={photos[index].url} style={{ '--r': ratios[index], '--i': index } as React.CSSProperties} aria-label={`${label} ${index + 1}`} onClick={() => onOpen(index)}><img src={photos[index].url} alt={photos[index].alt || label} loading="lazy" {...imgSize(photos[index])} /></button> : <img key={photos[index].url} src={photos[index].url} alt={photos[index].alt || label} loading="lazy" style={{ '--r': ratios[index], '--i': index } as React.CSSProperties} {...imgSize(photos[index])} />;
  return <div className="jp" ref={ref}>
    {rows ? rows.map((row, i) => <div className="jp-row" key={i} style={maxRowHeight ? { maxWidth: Math.round(maxRowHeight * row.reduce((sum, index) => sum + ratios[index], 0) + (row.length - 1) * 6) } : undefined}>{row.map(render)}</div>) : <div className="jp-row is-wrap">{photos.map((_, index) => render(index))}</div>}
  </div>;
}
