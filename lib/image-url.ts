/** Public address of a catalog image. It lives outside /api/ so robots.txt (Disallow: /api/) does not hide photos from crawlers. */
export const catalogImageUrl = (id: string) => `/media/catalog/${id}`;

/** The logo file's pixel size, for <img> tags that fall back to it (public/drm-stay-logo.png, kept small on purpose). */
export const LOGO_SIZE = { width: 800, height: 800 } as const;

/** The picture shown when a page is shared and has no photo of its own (public/og-default.jpg, 1200x630). */
export const OG_DEFAULT = { url: '/og-default.jpg', width: 1200, height: 630 } as const;

/**
 * Whether this build may ask Cloudflare for resized photos (/cdn-cgi/image/...). Only the production deploy sets
 * IMAGE_RESIZE=1 (Images > Transformations is enabled for the drmstays.vn zone); staging, *.workers.dev and local
 * builds have no such service, so they keep the original files.
 */
declare const __IMAGE_RESIZE__: string | undefined;
const resizing = () => (typeof __IMAGE_RESIZE__ === 'string' ? __IMAGE_RESIZE__ : '') === '1';

/** Widths offered to the browser; it picks the smallest that fills the slot on that screen. */
export const PHOTO_WIDTHS = [400, 800, 1200, 1600] as const;

/** Address of a catalog photo resized by Cloudflare to `width` pixels (never enlarged), as AVIF/WebP when the browser takes it. */
export const resizedUrl = (url: string, width: number) => `/cdn-cgi/image/width=${width},quality=80,format=auto,fit=scale-down${url}`;

/** srcset for a catalog photo, or undefined for other images or when resizing is off. Widths above the photo's own are left out. */
export function photoSrcSet(photo?: { url?: string; width?: number }): string | undefined {
  if (!resizing() || !photo?.url || !photo.url.startsWith('/media/catalog/')) return undefined;
  const widths = PHOTO_WIDTHS.filter(width => !photo.width || width < photo.width);
  if (!widths.length) return undefined;
  return [...widths.map(width => `${resizedUrl(photo.url!, width)} ${width}w`), ...(photo.width && photo.width <= 2400 ? [`${photo.url} ${photo.width}w`] : [])].join(', ');
}

/**
 * Attributes for an <img> of a photo: width/height (so the page reserves the space and does not jump) and, for catalog
 * photos in production, a srcset so phones download a ~40-150 KB version instead of the 1-2.5 MB original.
 * Spread it after src: `<img src={photo.url} {...imgSize(photo)} />`. `sizes` is how wide the photo shows (default: full width).
 */
export const imgSize = (photo?: { url?: string; width?: number; height?: number }, sizes = '100vw') => {
  const srcSet = photoSrcSet(photo);
  return {
    ...(photo?.width && photo?.height ? { width: photo.width, height: photo.height } : {}),
    ...(srcSet ? { srcSet, sizes } : {}),
  };
};
