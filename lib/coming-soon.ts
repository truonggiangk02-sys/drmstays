/** Name of the admin session cookie. Its presence (not its validity) lets the owner preview the real site. */
const ADMIN_COOKIE = "__Host-doraemon_admin";

/**
 * While COMING_SOON=1 every public page shows the placeholder. The admin, the APIs, framework files and
 * anything with a file extension (images, fonts, robots.txt...) are left alone so the owner can keep working.
 */
export function shouldShowComingSoon(requestUrl: string, cookieHeader: string | null, vars: { COMING_SOON?: string }): boolean {
  if (vars.COMING_SOON !== "1") return false;
  const { pathname } = new URL(requestUrl);
  if (/^\/(admin|api|_next|coming-soon)(\/|$)/.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) return false;
  if ((cookieHeader || "").split(";").some(part => part.trim().startsWith(`${ADMIN_COOKIE}=`))) return false;
  return true;
}

/** The placeholder answers 503 + Retry-After and noindex, so search engines keep what they knew and come back later. */
export function asComingSoonResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Retry-After", "86400");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: 503, headers });
}
