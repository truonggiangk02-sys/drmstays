/** Public address of a catalog image. It lives outside /api/ so robots.txt (Disallow: /api/) does not hide photos from crawlers. */
export const catalogImageUrl = (id: string) => `/media/catalog/${id}`;

/** The logo file's pixel size, for <img> tags that fall back to it (public/drm-stay-logo.png, kept small on purpose). */
export const LOGO_SIZE = { width: 800, height: 800 } as const;

/** The picture shown when a page is shared and has no photo of its own (public/og-default.jpg, 1200x630). */
export const OG_DEFAULT = { url: '/og-default.jpg', width: 1200, height: 630 } as const;

/** width/height attributes for an <img> (so the page reserves the space and does not jump), or nothing when the size is unknown. */
export const imgSize = (photo?: { width?: number; height?: number }) =>
  photo?.width && photo?.height ? { width: photo.width, height: photo.height } : {};
