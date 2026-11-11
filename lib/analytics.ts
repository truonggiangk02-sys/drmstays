import { env } from "cloudflare:workers";
import { indexingAllowed } from "./site";

/** A GA4 measurement ID looks like G-ABC123XYZ0. Anything else is ignored, so a typo can never inject odd text into the page. */
const MEASUREMENT_ID = /^G-[A-Z0-9]{6,14}$/;

type Vars = { GA_MEASUREMENT_ID?: string; SITE_URL?: string; STAGING?: string; PREVIEW_DEMO?: string; COMING_SOON?: string };

/** The Google Analytics ID to use on `host`, or null. Only the real, indexable site is measured: never staging, preview, coming-soon, localhost or other hosts. */
export function analyticsIdFor(host: string | null | undefined, vars: Vars): string | null {
  const id = String(vars.GA_MEASUREMENT_ID || "").trim();
  if (!MEASUREMENT_ID.test(id)) return null;
  return indexingAllowed(host, vars) ? id : null;
}

export function analyticsId(host: string | null | undefined): string | null {
  return analyticsIdFor(host, env as Vars);
}
