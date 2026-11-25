import { env } from "cloudflare:workers";
import { NextRequest } from "next/server";
import { getPublicCatalog } from "@/lib/public-catalog";
import { getContentItems } from "@/lib/site-content";
import { buildLlmsTxt } from "@/lib/llms-txt";
import { getJournalPosts } from "@/lib/journal";
import { isIndexable, siteUrl } from "@/lib/site";

/**
 * /llms.txt: a plain-text summary of the business, its buildings, room types, prices and FAQ, with links, for AI
 * assistants (ChatGPT, Gemini / Google AI Overviews, Perplexity, Claude) that read it to answer questions about the site.
 * Only the production address serves it; staging, demo and coming-soon builds answer 404 like they hide the sitemap.
 */
export async function GET(request: NextRequest) {
  const hidden = env.PREVIEW_DEMO === "1" || env.COMING_SOON === "1" || !isIndexable(request.nextUrl.hostname);
  if (hidden) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const origin = siteUrl() || request.nextUrl.origin;
  const [vi, en, faqItems, posts] = await Promise.all([
    getPublicCatalog(undefined, undefined, "vi").catch(() => null),
    getPublicCatalog(undefined, undefined, "en").catch(() => null),
    getContentItems("faq").catch(() => []),
    getJournalPosts("en").catch(() => []),
  ]);
  const body = buildLlmsTxt(origin, { vi: vi?.buildings || [], en: en?.buildings || [] }, faqItems, posts);
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
