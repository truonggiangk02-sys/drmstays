import type { NextConfig } from "next";

// 'unsafe-inline' is required for the framework's inline hydration scripts and React style attributes; there is no nonce pipeline yet.
const directives: Record<string, string> = {
  "default-src": "'self'",
  // Cloudflare Web Analytics injects its beacon script from static.cloudflareinsights.com and reports to cloudflareinsights.com.
  "script-src": "'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com",
  "style-src": "'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src": "'self' https://fonts.gstatic.com",
  // OpenStreetMap tiles feed the Leaflet map; room and building photos are served from this origin.
  "img-src": "'self' data: blob: https://images.unsplash.com https://tile.openstreetmap.org https://*.tile.openstreetmap.fr https://server.arcgisonline.com https://www.google-analytics.com https://www.googletagmanager.com",
  // Google Analytics (GA4) sends its measurements to these hosts.
  "connect-src": "'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://cloudflareinsights.com",
  // The office location is a Google Maps embed.
  "frame-src": "https://www.google.com",
  "form-action": "'self'",
  "frame-ancestors": "'none'",
  "base-uri": "'self'",
  "object-src": "'none'",
};
const policy = (changes: Record<string, string> = {}) => Object.entries({ ...directives, ...changes }).map(([name, value]) => `${name} ${value}`).join("; ");
const csp = policy();

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];
/** Same headers with a different policy for one page. */
const withPolicy = (changes: Record<string, string>, frame = "DENY") => securityHeaders.map(header => header.key === "Content-Security-Policy" ? { ...header, value: policy(changes) } : header.key === "X-Frame-Options" ? { ...header, value: frame } : header);

const nextConfig: NextConfig = {
  // By default only a few crawlers get <title>, meta description, canonical and og:* in the first <head>; everyone else gets
  // them streamed into <body>. Match every client that sends a User-Agent so the tags are always in <head>.
  htmlLimitedBots: /./,
  async headers() {
    // Skip in dev: the Vite dev server needs eval and websockets that this CSP forbids.
    if (process.env.NODE_ENV !== "production") return [];
    return [
      { source: "/:path*", headers: securityHeaders },
      // The journal editor shows a live preview of the post in an iframe of the site's own preview page, and only that page may be framed (by the site itself).
      { source: "/admin/journal/edit", headers: withPolicy({ "frame-src": "'self' https://www.google.com" }) },
      { source: "/admin/journal/preview", headers: withPolicy({ "frame-ancestors": "'self'" }, "SAMEORIGIN") },
    ];
  },
};

export default nextConfig;
