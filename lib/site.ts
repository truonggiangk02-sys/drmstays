import { env } from "cloudflare:workers";

export const SITE_NAME = "DRM Stays";
export const SITE_TITLE = "DRM Stays | Apartments and Monthly Stays in Da Nang";
export const SITE_DESCRIPTION = "Explore DRM Stays buildings and individual rooms in Da Nang, with photos, monthly rent, amenities and inquiry support.";
export const LANGS = ["vi", "en"] as const;
export type SiteLang = (typeof LANGS)[number];

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

/** Shortens text for meta descriptions without cutting mid-word. */
export function summarize(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}
