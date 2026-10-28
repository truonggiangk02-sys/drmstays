import type { Metadata } from "next";
import "./globals.css";
import "./cms.css";
import "./catalog.css";
import "./structure.css";
import "leaflet/dist/leaflet.css";
import "./map-explorer.css";
import "./map-explorer-polish.css";
import { env } from "cloudflare:workers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/site";
import "./quick-contact.css";
import "./quick-contact-fallback.css";
import "./contact-admin.css";
import "./editorial.css";

export function generateMetadata(): Metadata {
  const base = siteUrl();
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    // Preview builds show sample rooms and prices, so they must never be indexed.
    ...(env.PREVIEW_DEMO === "1" ? { robots: { index: false, follow: false } } : {}),
    openGraph: { siteName: SITE_NAME, type: "website", title: SITE_TITLE, description: SITE_DESCRIPTION },
    twitter: { card: "summary_large_image" },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}

