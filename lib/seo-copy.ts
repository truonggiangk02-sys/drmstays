type Lang = "vi" | "en";

/** Everyday Vietnamese words. Place names (Đỗ Bá, Ngũ Hành Sơn) never use them, so they tell a Vietnamese text apart. */
const VI_WORDS = new Set(["là", "và", "của", "có", "các", "với", "tại", "được", "gồm", "những", "một", "cho", "phòng", "tòa", "căn", "đầy", "đủ", "nội", "thất", "thuê", "gần", "trong", "khách", "tầng"]);

/** Whether `text` reads as Vietnamese: at least two everyday Vietnamese words, or one in a very short text. */
export function looksVietnamese(text: string): boolean {
  const words = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const hits = words.filter(word => VI_WORDS.has(word)).length;
  return hits >= 2 || (hits === 1 && words.length <= 4);
}

/**
 * A description written for this language, or "" when it is empty or (on the English page) still in Vietnamese:
 * the catalog falls back to the other language when one is missing, which Google would show on the English result.
 */
export function ownLanguageText(text: string | undefined, lang: Lang): string {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return lang === "en" && looksVietnamese(clean) ? "" : clean;
}
