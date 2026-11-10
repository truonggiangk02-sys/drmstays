import { permanentRedirect } from "next/navigation";

// The language never depends on the browser (no Accept-Language logic), so this is a permanent move (308).
export default function Home() {
  permanentRedirect("/vi");
}
