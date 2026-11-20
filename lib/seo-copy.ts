import { propertyName, summarize } from "./site";

type Lang = "vi" | "en";

/** Letters only Vietnamese uses. A text with several of them is Vietnamese, even if it sits on the English page. */
const VI_LETTERS = /[ăâđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi;

/**
 * Whether `text` reads as Vietnamese. Street names (Đỗ Bá, Mai Thúc Lân) add a few such letters to English text, so a
 * text counts as Vietnamese only when they are more than 3% of its letters.
 */
export function looksVietnamese(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "").length;
  if (!letters) return false;
  return (text.match(VI_LETTERS) || []).length / letters > 0.03;
}

/** A description written for this language, or "" when it is empty or (on the English page) still in Vietnamese. */
export function ownLanguageText(text: string | undefined, lang: Lang): string {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return lang === "en" && looksVietnamese(clean) ? "" : clean;
}

const million = (vnd: number, lang: Lang) => {
  const value = Math.round(vnd / 100_000) / 10;
  const text = new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 1 }).format(value);
  return lang === "vi" ? `${text} triệu đồng/tháng` : `${text} million VND/month`;
};

type TypeFacts = { name: string; areaSqm?: number; maxGuests?: number; beds?: number; priceFrom?: number; description?: string };
type BuildingFacts = { name: string; address?: string; description?: string; propertyType?: string; floorCount?: number; roomCount?: number; priceFrom?: number; status?: string };

/** Page title for a room type: names the building and the city, which "Studio 02" alone does not. */
export function typeTitle(type: { name: string }, buildingName: string, lang: Lang): string {
  return `${type.name} – ${propertyName(buildingName)}, ${lang === "vi" ? "Đà Nẵng" : "Da Nang"}`;
}

/** Meta description for a room type, from its own text when there is one, otherwise from its facts (size, guests, price). */
export function typeDescription(type: TypeFacts, buildingName: string, lang: Lang): string {
  const own = ownLanguageText(type.description, lang);
  if (own) return summarize(own);
  const where = propertyName(buildingName);
  const facts = [
    type.areaSqm ? `${type.areaSqm} m²` : "",
    type.maxGuests ? (lang === "vi" ? `tối đa ${type.maxGuests} khách` : `up to ${type.maxGuests} guests`) : "",
    type.priceFrom && type.priceFrom > 0 ? (lang === "vi" ? `giá từ ${million(type.priceFrom, lang)}` : `from ${million(type.priceFrom, lang)}`) : "",
  ].filter(Boolean).join(", ");
  const text = lang === "vi"
    ? `${type.name} tại ${where}, Đà Nẵng${facts ? `: ${facts}` : ""}. Phòng có sẵn nội thất, thuê ngắn ngày và dài ngày. Xem ảnh, giá và gửi yêu cầu xem phòng.`
    : `${type.name} at ${where}, Da Nang${facts ? `: ${facts}` : ""}. Furnished, for short and long stays. See photos and prices and ask for a viewing.`;
  return summarize(text);
}

/** Meta description for a building, from its own text when there is one in this language, otherwise from its facts. */
export function buildingDescription(building: BuildingFacts, lang: Lang): string {
  const own = ownLanguageText(building.description, lang);
  if (own) return summarize(own);
  const name = propertyName(building.name);
  const vi = lang === "vi";
  const kind = building.propertyType || (vi ? "Tòa căn hộ dịch vụ" : "Serviced apartment building");
  const bits = [
    building.floorCount ? (vi ? `${building.floorCount} tầng` : `${building.floorCount} floors`) : "",
    building.roomCount ? (vi ? `${building.roomCount} phòng có sẵn nội thất` : `${building.roomCount} furnished rooms`) : "",
    building.priceFrom && building.priceFrom > 0 ? (vi ? `giá từ ${million(building.priceFrom, lang)}` : `from ${million(building.priceFrom, lang)}`) : "",
  ].filter(Boolean).join(", ");
  const at = building.address ? (vi ? ` tại ${building.address}` : ` at ${building.address}`) : (vi ? " tại Đà Nẵng" : " in Da Nang");
  const text = vi
    ? `${name}: ${kind.toLowerCase()}${at}${bits ? `, ${bits}` : ""}. Thuê ngắn ngày và dài ngày, hỗ trợ nhiều ngôn ngữ.`
    : `${name}: ${kind.toLowerCase()}${at}${bits ? `, ${bits}` : ""}. Short and long stays, multilingual support.`;
  return summarize(text);
}
