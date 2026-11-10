export type SitemapEntry = { path: string; lastmod?: string; images?: string[] };

const LANGS = ["vi", "en"] as const;
const MAX_IMAGES = 10;

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** "2026-11-10 02:44:17" (how D1's CURRENT_TIMESTAMP is stored, in UTC) -> "2026-11-10T02:44:17Z"; anything else -> undefined. */
export function toLastmod(value: string | null | undefined): string | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(String(value || ""));
  return match ? `${match[1]}T${match[2]}Z` : undefined;
}

/** Absolute address of a photo for the image sitemap; external addresses pass through. */
export function absoluteImage(origin: string, url: string): string {
  return url.startsWith("/") ? `${origin}${url}` : url;
}

/** One <url> per page per language, each pointing at both languages (hreflang). <lastmod> and <image:image> only when known. */
export function buildSitemap(origin: string, entries: SitemapEntry[]): string {
  const rows = entries.flatMap(({ path, lastmod, images = [] }) => {
    const links = [["vi", `${origin}/vi${path}`], ["en", `${origin}/en${path}`], ["x-default", `${origin}/vi${path}`]]
      .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(href)}"/>`).join("");
    const stamp = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : "";
    const pictures = [...new Set(images)].slice(0, MAX_IMAGES).map((src) => `<image:image><image:loc>${escapeXml(src)}</image:loc></image:image>`).join("");
    return LANGS.map((lang) => `  <url><loc>${escapeXml(`${origin}/${lang}${path}`)}</loc>${stamp}${links}${pictures}</url>`);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join("\n")}\n</urlset>\n`;
}
