import type { Metadata } from "next";
import "./globals.css";
import "./cms.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/site";

export function generateMetadata(): Metadata {
  const base = siteUrl();
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US", title: SITE_TITLE, description: SITE_DESCRIPTION },
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

