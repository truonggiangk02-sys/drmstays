import type { Metadata } from "next";
import "./globals.css";
import "./cms.css";
import "./catalog.css";
import "./structure.css";
import "leaflet/dist/leaflet.css";
import "./map-explorer.css";
import "./map-explorer-polish.css";
import "./mobile-polish.css";

export const metadata: Metadata = {
  title: "DRM Stays | Apartments and Monthly Stays in Da Nang",
  description: "Explore DRM Stays buildings and individual rooms in Da Nang, with photos, monthly rent, amenities and inquiry support.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

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

