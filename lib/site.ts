import { env } from "cloudflare:workers";

export const SITE_NAME = "Doraemon Land";
export const SITE_TITLE = "Doraemon Land | Serviced Apartments in Da Nang";
export const SITE_DESCRIPTION = "Boutique Living by My Khe Beach & An Thuong Quarter. Explore Doraemon Land serviced apartments in Da Nang.";

/** Canonical public origin from the SITE_URL variable (no trailing slash), or null when it isn't configured. */
export function siteUrl(): string | null {
  const raw = String(env.SITE_URL || "").trim().replace(/\/+$/, "");
  try { return raw ? new URL(raw).origin : null; } catch { return null; }
}

/** Serialises JSON-LD for an inline script tag; "<" is escaped so data can never close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Absolute URL for a site path; external URLs pass through, and a relative path yields null when SITE_URL isn't set. */
export function absoluteUrl(url: string): string | null {
  if (!url.startsWith("/")) return url;
  const base = siteUrl();
  return base ? `${base}${url}` : null;
}
