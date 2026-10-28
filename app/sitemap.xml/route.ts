import { NextRequest } from "next/server";
import { getApartments } from "@/lib/data";
import { siteUrl } from "@/lib/site";

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export async function GET(request: NextRequest) {
  const origin = siteUrl() || request.nextUrl.origin;
  const rooms = (await getApartments()).filter((apartment) => apartment.active);
  const urls = [`${origin}/`, ...rooms.map((room) => `${origin}/apartments/${room.slug}`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
