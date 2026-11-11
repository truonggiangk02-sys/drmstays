/**
 * Loads the site fonts with <link> tags instead of a CSS @import, so the font stylesheet is discovered
 * with the page (and its connections are opened early) rather than only after globals.css has downloaded.
 */
const FONTS_URL = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;1,400&family=Poppins:wght@400;500;600;700&display=swap";

export function FontLinks() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={FONTS_URL} />
    </>
  );
}
