import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";
import { getPublishedJournal, rowLanguages } from "@/lib/journal";
import { getPublicCatalog } from "@/lib/public-catalog";
import { siteUrl } from "@/lib/site";
import { absoluteImage, buildSitemap, toLastmod, type SitemapEntry } from "@/lib/sitemap";

const staticPaths = ["", "/stays", "/room-types", "/services", "/partners", "/about", "/faq", "/contact", "/privacy", "/cancellation", "/terms"];

export async function GET(request: NextRequest) {
  const origin = siteUrl() || request.nextUrl.origin;
  const hidden = env.PREVIEW_DEMO === "1" || env.COMING_SOON === "1";
  const entries: SitemapEntry[] = hidden ? [] : staticPaths.map((path) => ({ path }));
  if (!hidden) {
    try {
      const catalog = await getPublicCatalog();
      const photos = (images: { url: string }[]) => images.map((image) => absoluteImage(origin, image.url));
      for (const building of catalog.buildings) {
        entries.push({ path: `/buildings/${building.id}`, lastmod: toLastmod(building.updatedAt), images: photos(building.images) });
        for (const room of building.rooms) entries.push({ path: `/rooms/${room.id}`, lastmod: toLastmod(room.updatedAt), images: photos(room.images) });
        for (const type of building.types) entries.push({ path: `/types/${type.id}`, lastmod: toLastmod(type.updatedAt), images: photos(type.images) });
      }
    } catch { /* The catalog source is down: still list the static pages. */ }
    try {
      // The journal is hidden until it has a published post. Each post is listed in the languages it is written in.
      const posts = await getPublishedJournal();
      if (posts.length) entries.push({ path: "/journal" });
      for (const row of posts) entries.push({ path: `/journal/${row.slug || row.id}`, lastmod: row.updated_at ? `${row.updated_at}T00:00:00Z` : undefined, langs: rowLanguages(row) });
    } catch { /* Journal is optional. */ }
  }
  return new Response(buildSitemap(origin, entries), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
