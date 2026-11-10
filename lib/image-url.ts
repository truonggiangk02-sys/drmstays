/** Public address of a catalog image. It lives outside /api/ so robots.txt (Disallow: /api/) does not hide photos from crawlers. */
export const catalogImageUrl = (id: string) => `/media/catalog/${id}`;

/** The logo file's pixel size, for <img> tags that fall back to it. */
export const LOGO_SIZE = { width: 1254, height: 1254 } as const;

/** width/height attributes for an <img> (so the page reserves the space and does not jump), or nothing when the size is unknown. */
export const imgSize = (photo?: { width?: number; height?: number }) =>
  photo?.width && photo?.height ? { width: photo.width, height: photo.height } : {};
