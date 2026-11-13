import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";
import { getContentItems } from "@/lib/site-content";
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
      // The journal is hidden until it has an article. Posts have no "last changed" date yet, so they are listed without <lastmod>.
      const posts = await getContentItems("journal");
      if (posts.length) entries.push({ path: "/journal" });
      for (const item of posts) entries.push({ path: `/journal/${item.id}` });
    } catch { /* Journal is optional. */ }
  }
  return new Response(buildSitemap(origin, entries), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
