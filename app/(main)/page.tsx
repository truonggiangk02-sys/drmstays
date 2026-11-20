import { permanentRedirect } from "next/navigation";

// Guests are almost all international, so the site opens in English. The language never depends on the browser
// (no Accept-Language logic), so this is a permanent move (308); Vietnamese stays one click away (VI in the header).
export default function Home() {
  permanentRedirect("/en");
}
