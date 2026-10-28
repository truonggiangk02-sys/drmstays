import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";
import { getContentItems } from "@/lib/site-content";
import { getPublicCatalog } from "@/lib/public-catalog";
import { siteUrl } from "@/lib/site";

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const staticPaths = ["", "/stays", "/services", "/partners", "/about", "/journal", "/faq", "/contact"];

export async function GET(request: NextRequest) {
  const origin = siteUrl() || request.nextUrl.origin;
  const paths = env.PREVIEW_DEMO === "1" ? [] : [...staticPaths];
  if (env.PREVIEW_DEMO !== "1") {
    try {
      const catalog = await getPublicCatalog();
      for (const building of catalog.buildings) {
        paths.push(`/buildings/${building.id}`);
        for (const room of building.rooms) paths.push(`/rooms/${room.id}`);
      }
    } catch { /* The catalog source is down: still list the static pages. */ }
    try {
      for (const item of await getContentItems("journal")) paths.push(`/journal/${item.id}`);
    } catch { /* Journal is optional. */ }
  }
  // Each page is listed once per language with hreflang alternates pointing at both.
  const entries = paths.map((path) => {
    const links = [["vi", `${origin}/vi${path}`], ["en", `${origin}/en${path}`], ["x-default", `${origin}/vi${path}`]]
      .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(href)}"/>`).join("");
    return ["vi", "en"].map((lang) => `  <url><loc>${escapeXml(`${origin}/${lang}${path}`)}</loc>${links}</url>`).join("\n");
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
