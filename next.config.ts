import type { NextConfig } from "next";

// 'unsafe-inline' is required for the framework's inline hydration scripts and React style attributes; there is no nonce pipeline yet.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // OpenStreetMap tiles feed the Leaflet map; room and building photos are served from this origin.
  "img-src 'self' data: blob: https://images.unsplash.com https://tile.openstreetmap.org https://www.google-analytics.com https://www.googletagmanager.com",
  // Google Analytics (GA4) sends its measurements to these hosts.
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // By default only a few crawlers get <title>, meta description, canonical and og:* in the first <head>; everyone else gets
  // them streamed into <body>. Match every client that sends a User-Agent so the tags are always in <head>.
  htmlLimitedBots: /./,
  async headers() {
    // Skip in dev: the Vite dev server needs eval and websockets that this CSP forbids.
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
