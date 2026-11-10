import { NextRequest } from "next/server";
import { isIndexable, siteUrl } from "@/lib/site";

export function GET(request: NextRequest) {
  const origin = siteUrl() || request.nextUrl.origin;
  // Staging, preview, coming-soon builds and any host other than the production address tell crawlers to stay out entirely.
  const body = !isIndexable(request.nextUrl.hostname)
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /thanks\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
