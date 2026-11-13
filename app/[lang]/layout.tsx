import { notFound } from "next/navigation";
import { Analytics } from "@/components/analytics";
import { generateMetadata as rootMetadata } from "../(main)/layout";
import { FontLinks } from "@/components/font-links";
import { SmoothMotion } from "@/components/smooth-motion";
import { BackToTop } from "@/components/back-to-top";
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
import "../detail.css";
import "../home-story.css";
import "../polish.css";

// A second root layout so the page language is declared on <html> (the main layout is fixed to Vietnamese).
export const generateMetadata = rootMetadata;

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang !== "vi" && lang !== "en") notFound();
  return (
    <html lang={lang}>
      <head><FontLinks /></head>
      <body className="antialiased">{children}<SmoothMotion /><BackToTop lang={lang} /><Analytics /></body>
    </html>
  );
}
