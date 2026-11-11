import type { Metadata } from "next";
import { headers } from "next/headers";
import { FontLinks } from "@/components/font-links";
import "../globals.css";
import "../cms.css";
import "../catalog.css";
import "../structure.css";
import "leaflet/dist/leaflet.css";
import "../map-explorer.css";
import "../map-explorer-polish.css";
import { isIndexable, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/site";
import "../quick-contact.css";
import "../quick-contact-fallback.css";
import "../contact-admin.css";
import "../editorial.css";

export async function generateMetadata(): Promise<Metadata> {
  const base = siteUrl();
  const host = (await headers()).get("host");
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    // Staging, preview and any host other than the production address must never be indexed (the X-Robots-Tag header says the same).
    ...(isIndexable(host) ? {} : { robots: { index: false, follow: false } }),
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
      <head><FontLinks /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

