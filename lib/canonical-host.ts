/**
 * Other domains that point at this site (www, the .com twin...) answer with a permanent redirect to the
 * main address in SITE_URL, so search engines and visitors only ever see one. Only hosts listed in
 * REDIRECT_HOSTS are redirected; the workers.dev address and localhost keep working.
 * A plain-http visit to the main address itself also goes to https: the admin cookie is Secure (it is never
 * sent over http, so login would loop back to the login page) and forms would post without encryption.
 */
export function canonicalRedirect(requestUrl: string, vars: { SITE_URL?: string; REDIRECT_HOSTS?: string }): Response | null {
  if (!vars.SITE_URL) return null;
  let target: URL;
  try { target = new URL(vars.SITE_URL); } catch { return null; }
  const url = new URL(requestUrl);
  const host = url.hostname.toLowerCase();
  const location = () => new Response(null, { status: 301, headers: { Location: `${target.origin}${url.pathname}${url.search}`, "Cache-Control": "public, max-age=3600" } });
  if (host === target.hostname.toLowerCase()) return url.protocol === "http:" && target.protocol === "https:" ? location() : null;
  const hosts = String(vars.REDIRECT_HOSTS || "").split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
  return hosts.includes(host) ? location() : null;
}
