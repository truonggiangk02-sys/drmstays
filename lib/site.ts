import { env } from "cloudflare:workers";

export const SITE_NAME = "DRM Stays";
export const SITE_TITLE = "DRM Stays | Apartments for Rent in An Thượng, Da Nang";
export const SITE_DESCRIPTION = "Furnished apartments near An Thượng, Mỹ An, Da Nang. Short and long stays, with support in Vietnamese, English, Japanese, Korean, Chinese and Russian.";
/** The business's public contact details: shown in the footer and contact page, and repeated in the structured data (they must match). */
export const CONTACT = {
  phone: "0869900000",
  phoneDisplay: "0869 900 000",
  phoneIntl: "+84869900000",
  email: "drmstayshome@gmail.com",
  street: "K234/29-31 Đỗ Bá",
  district: "Ngũ Hành Sơn",
  city: "Đà Nẵng",
  address: "K234/29-31 Đỗ Bá, Ngũ Hành Sơn, Đà Nẵng",
  facebook: "https://www.facebook.com/profile.php?id=61589018612745",
} as const;
/** Official spelling of the Doraemon's Land buildings, whatever the source calls them ("Doraemon Land", "doraemonland"...). */
export function propertyName(name: string): string {
  return name.replace(/doraemon['’]?s?\s*land/i, "Doraemon's Land");
}
export const LANGS = ["vi", "en"] as const;
export type SiteLang = (typeof LANGS)[number];

/** Canonical public origin from the SITE_URL variable (no trailing slash), or null when it isn't configured. */
export function siteUrl(): string | null {
  const raw = String(env.SITE_URL || "").trim().replace(/\/+$/, "");
  try { return raw ? new URL(raw).origin : null; } catch { return null; }
}

type IndexingVars = { SITE_URL?: string; STAGING?: string; PREVIEW_DEMO?: string; COMING_SOON?: string };

/**
 * Whether search engines may index responses served on `host`. Only the production address (the host of SITE_URL) is
 * indexable. Staging (STAGING=1), demo/coming-soon builds, *.workers.dev addresses, localhost and any other host that
 * reaches the Worker (a second domain, an old address) are all kept out, so one copy of the content is ever visible.
 */
export function indexingAllowed(host: string | null | undefined, vars: IndexingVars): boolean {
  if (vars.PREVIEW_DEMO === "1" || vars.COMING_SOON === "1" || vars.STAGING === "1") return false;
  const name = String(host || "").trim().toLowerCase().replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  if (!name || name === "localhost" || name === "127.0.0.1" || name === "::1") return false;
  if (name.endsWith(".workers.dev") || name.endsWith(".pages.dev")) return false;
  let canonical = "";
  try { canonical = vars.SITE_URL ? new URL(vars.SITE_URL).hostname.toLowerCase() : ""; } catch { /* an invalid SITE_URL counts as unset */ }
  return !canonical || name === canonical;
}

/** `indexingAllowed` with the Worker's own variables. */
export function isIndexable(host: string | null | undefined): boolean {
  return indexingAllowed(host, env as IndexingVars);
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
