/**
 * Decides whether a state-changing request comes from this site (a basic CSRF guard).
 * The browser's Origin header is checked first; if it is missing (some browsers omit it on same-site form posts) the Referer is used.
 * The origin may match the address the Worker sees, the Host header, or the configured SITE_URL, so a proxy that rewrites
 * the scheme or hostname does not lock the owner out. Anything else, including "null", is refused.
 */
export function originAllowed(request: { url: string; headers: Pick<Headers, "get"> }, siteUrl?: string): boolean {
  const own = new URL(request.url);
  const hosts = new Set<string>([own.host]);
  for (const name of ["host", "x-forwarded-host"]) {
    const value = request.headers.get(name);
    if (value) hosts.add(value.split(",")[0].trim().toLowerCase());
  }
  if (siteUrl) { try { hosts.add(new URL(siteUrl).host.toLowerCase()); } catch { /* ignore a malformed SITE_URL */ } }
  let candidate = request.headers.get("origin");
  if (!candidate || candidate === "null") {
    const referer = request.headers.get("referer");
    candidate = referer && !candidate ? referer : null;
  }
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    return (url.protocol === "https:" || url.protocol === "http:") && hosts.has(url.host.toLowerCase());
  } catch {
    return false;
  }
}
