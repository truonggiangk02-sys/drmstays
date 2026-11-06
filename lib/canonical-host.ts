/**
 * Other domains that point at this site (www, the .com twin...) answer with a permanent redirect to the
 * main address in SITE_URL, so search engines and visitors only ever see one. Only hosts listed in
 * REDIRECT_HOSTS are redirected; the workers.dev address and localhost keep working.
 */
export function canonicalRedirect(requestUrl: string, vars: { SITE_URL?: string; REDIRECT_HOSTS?: string }): Response | null {
  const hosts = String(vars.REDIRECT_HOSTS || "").split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
  if (!hosts.length || !vars.SITE_URL) return null;
  let target: URL;
  try { target = new URL(vars.SITE_URL); } catch { return null; }
  const url = new URL(requestUrl);
  if (!hosts.includes(url.hostname.toLowerCase()) || url.hostname.toLowerCase() === target.hostname.toLowerCase()) return null;
  return new Response(null, { status: 301, headers: { Location: `${target.origin}${url.pathname}${url.search}`, "Cache-Control": "public, max-age=3600" } });
}
