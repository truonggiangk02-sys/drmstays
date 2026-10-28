import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";
import { siteUrl } from "@/lib/site";

export function GET(request: NextRequest) {
  const origin = siteUrl() || request.nextUrl.origin;
  // Preview builds carry sample content, so crawlers are told to stay out entirely.
  const body = env.PREVIEW_DEMO === "1"
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /thanks\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
