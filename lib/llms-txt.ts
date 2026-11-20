import { buildingFromPrice, buildingRoomCount, type MediaBuilding } from "./building-media";
import { pageMeta } from "./page-meta";
import { CONTACT, propertyName } from "./site";
import { ownLanguageText } from "./seo-copy";
import type { ContentItem } from "./site-content";

type LlmsType = { id: string; name: string; description?: string; areaSqm?: number; maxGuests?: number; beds?: number; priceFrom: number; rooms: unknown[] };
type LlmsRoom = { id: string; name: string; monthlyPrice: number; areaSqm?: number; maxGuests?: number };
export type LlmsBuilding = MediaBuilding & {
  id: string; name: string; address: string; description: string; propertyType?: string; floorCount?: number; status?: string; openMonth?: string;
  types: LlmsType[]; rooms: LlmsRoom[];
};

const vnd = (value: number) => `${new Intl.NumberFormat("en-US").format(value)} VND`;
const line = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * The /llms.txt document (https://llmstxt.org): who DRM Stays is, the facts an AI answer needs (place, prices, sizes,
 * languages, contact) and links to the page that holds each fact, in English with the Vietnamese pages linked too.
 */
export function buildLlmsTxt(origin: string, catalog: { vi: LlmsBuilding[]; en: LlmsBuilding[] }, faq: ContentItem[]): string {
  const out: string[] = [];
  const buildings = catalog.en.length ? catalog.en : catalog.vi;
  const viById = new Map(catalog.vi.map(building => [building.id, building]));
  const prices = buildings.map(building => buildingFromPrice(building)).filter(price => price > 0);

  out.push("# DRM Stays");
  out.push("");
  out.push(`> DRM Stays rents furnished apartments and studios in Da Nang, Vietnam, for short stays and monthly or yearly leases, and advises investors on developing, designing and operating rental property. Support in Vietnamese, English, Japanese, Korean, Chinese and Russian.`);
  out.push("");
  out.push("Key facts:");
  out.push(`- Location: Da Nang, Vietnam (office: ${CONTACT.address}).`);
  if (buildings.length) out.push(`- Buildings: ${buildings.map(building => propertyName(building.name)).join("; ")}.`);
  if (prices.length) out.push(`- Monthly rent from ${vnd(Math.min(...prices))}.`);
  out.push("- Stays: short stays and long stays (monthly, yearly). Rooms are furnished.");
  out.push("- Languages: Vietnamese, English, Japanese, Korean, Chinese, Russian. Office hours 8:00-17:00.");
  out.push(`- Contact: phone ${CONTACT.phoneIntl} (${CONTACT.phoneDisplay}), email ${CONTACT.email}, form ${origin}/en/contact`);
  out.push("- Website languages: Vietnamese (/vi) and English (/en). Prices are in Vietnamese dong (VND).");
  out.push("");

  out.push("## Main pages");
  const pages: Array<[keyof typeof pageMeta.en, string]> = [["stays", "/stays"], ["room-types", "/room-types"], ["services", "/services"], ["faq", "/faq"], ["about", "/about"], ["partners", "/partners"], ["contact", "/contact"]];
  out.push(`- [Home](${origin}/en) ([Tiếng Việt](${origin}/vi)): furnished apartments for rent in Da Nang.`);
  for (const [key, path] of pages) out.push(`- [${pageMeta.en[key].title}](${origin}/en${path}) ([Tiếng Việt](${origin}/vi${path})): ${line(pageMeta.en[key].description)}`);
  out.push("");

  if (buildings.length) {
    out.push("## Buildings and room types");
    for (const building of buildings) {
      const name = propertyName(building.name);
      const from = buildingFromPrice(building);
      const own = ownLanguageText(building.description, "en") || ownLanguageText(viById.get(building.id)?.description, "vi");
      out.push("");
      out.push(`### ${name}`);
      out.push(`- Page: ${origin}/en/buildings/${building.id} (Tiếng Việt: ${origin}/vi/buildings/${building.id})`);
      if (building.address) out.push(`- Address: ${building.address}, Da Nang`);
      if (building.propertyType) out.push(`- Type: ${building.propertyType}`);
      if (building.floorCount) out.push(`- Floors: ${building.floorCount}`);
      const count = buildingRoomCount(building);
      if (count) out.push(`- Rooms listed: ${count}`);
      if (building.status && building.status !== "open") out.push(`- Status: ${building.status === "soon" ? "opening soon" : "under construction"}${building.openMonth ? ` (expected ${building.openMonth})` : ""}`);
      if (from > 0) out.push(`- Monthly rent from ${vnd(from)}`);
      if (own) out.push(`- About: ${line(own)}`);
      for (const type of building.types) {
        const facts = [type.areaSqm ? `${type.areaSqm} m²` : "", type.maxGuests ? `up to ${type.maxGuests} guests` : "", type.beds ? `${type.beds} bed${type.beds > 1 ? "s" : ""}` : "", type.priceFrom > 0 ? `from ${vnd(type.priceFrom)}/month` : ""].filter(Boolean).join(", ");
        out.push(`- Room type [${type.name}](${origin}/en/types/${type.id})${facts ? `: ${facts}` : ""}`);
      }
      for (const room of building.rooms) {
        const facts = [room.areaSqm ? `${room.areaSqm} m²` : "", room.maxGuests ? `up to ${room.maxGuests} guests` : "", room.monthlyPrice > 0 ? `${vnd(room.monthlyPrice)}/month` : ""].filter(Boolean).join(", ");
        out.push(`- Room [${room.name}](${origin}/en/rooms/${room.id})${facts ? `: ${facts}` : ""}`);
      }
    }
    out.push("");
  }

  const questions = faq.filter(item => (item.title_en || item.title_vi).trim() && (item.body_en || item.body_vi).trim());
  if (questions.length) {
    out.push("## Frequently asked questions");
    out.push(`Source: ${origin}/en/faq (Tiếng Việt: ${origin}/vi/faq)`);
    for (const item of questions) {
      out.push("");
      out.push(`Q: ${line(item.title_en || item.title_vi)}`);
      out.push(`A: ${line(item.body_en || item.body_vi)}`);
    }
    out.push("");
  }

  out.push("## Policies");
  out.push(`- [Cancellation and change policy](${origin}/en/cancellation)`);
  out.push(`- [Privacy policy](${origin}/en/privacy)`);
  out.push(`- [Terms of use](${origin}/en/terms)`);
  out.push("");
  return out.join("\n");
}
