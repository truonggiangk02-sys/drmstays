import type { Metadata } from "next";
import "./globals.css";
import "./cms.css";
import "./catalog.css";

export const metadata: Metadata = {
  title: "Doraemon Land | Serviced Apartments in Da Nang",
  description: "Boutique Living by My Khe Beach & An Thuong Quarter. Explore Doraemon Land serviced apartments in Da Nang.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

