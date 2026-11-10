// Checks the SITE_URL given to scripts/deploy-config.mjs. Without it the site loses canonical and hreflang tags,
// og:image and all JSON-LD, so a deploy without it is refused unless ALLOW_MISSING_SITE_URL=1.

/** @returns {{ origin: string | null, errors: string[], notes: string[] }} */
export function checkSiteUrl(value, vars = {}) {
  const errors = [];
  const notes = [];
  const raw = String(value || "").trim();
  if (!raw) {
    if (vars.ALLOW_MISSING_SITE_URL !== "1") {
      errors.push(
        "SITE_URL is not set. Without it the site has no canonical or hreflang tags, no og:image and no structured data (JSON-LD), " +
        "which costs search visibility. Set it to the public address, e.g. SITE_URL=https://drmstays.vn " +
        "(staging: its own https://....workers.dev address). To deploy without it on purpose, set ALLOW_MISSING_SITE_URL=1.",
      );
    }
    return { origin: null, errors, notes };
  }
  let url;
  try { url = new URL(raw); } catch { errors.push(`SITE_URL "${raw}" is not a valid address. Use the form https://drmstays.vn (no path).`); return { origin: null, errors, notes }; }
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) errors.push(`SITE_URL must start with https:// (got "${raw}").`);
  if (url.pathname !== "/" || url.search || url.hash) errors.push(`SITE_URL must be only the address, without a path or query (got "${raw}"). Use ${url.origin}.`);
  if (raw.endsWith("/")) notes.push(`SITE_URL has a trailing "/" ; it is ignored.`);
  return { origin: url.origin, errors, notes };
}

/** Whether search engines will be allowed to index the site at `origin` with these variables (same rules as lib/site.ts indexingAllowed). */
export function willBeIndexable(origin, vars = {}) {
  if (vars.PREVIEW_DEMO === "1" || vars.COMING_SOON === "1" || vars.STAGING === "1") return false;
  if (!origin) return true;
  const host = new URL(origin).hostname;
  return !(host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev") || host.endsWith(".pages.dev"));
}
