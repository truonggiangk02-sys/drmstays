import { notFound } from "next/navigation";
import { generateMetadata as rootMetadata } from "../(main)/layout";
import "../globals.css";
import "../cms.css";
import "../catalog.css";
import "../structure.css";
import "leaflet/dist/leaflet.css";
import "../map-explorer.css";
import "../map-explorer-polish.css";
import "../quick-contact.css";
import "../quick-contact-fallback.css";
import "../contact-admin.css";
import "../editorial.css";

// A second root layout so the page language is declared on <html> (the main layout is fixed to Vietnamese).
export const generateMetadata = rootMetadata;

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang !== "vi" && lang !== "en") notFound();
  return (
    <html lang={lang}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
