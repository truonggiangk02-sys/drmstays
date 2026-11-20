import { describe, expect, it } from "vitest";
import { looksVietnamese, ownLanguageText } from "@/lib/seo-copy";
import { faqData, structuredData } from "@/lib/structured-data";
import { buildLlmsTxt, type LlmsBuilding } from "@/lib/llms-txt";
import type { ContentItem } from "@/lib/site-content";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

resetEnvBeforeEach();

describe("seo copy", () => {
  it("tells Vietnamese text from English text that names Vietnamese streets", () => {
    expect(looksVietnamese("Doraemon Land Đỗ Bá là tòa căn hộ dịch vụ gồm 15 căn studio đầy đủ nội thất")).toBe(true);
    expect(looksVietnamese("AnLiu Apartment is an 8-floor serviced apartment building at 70 Mai Thúc Lân, Ngũ Hành Sơn, Da Nang.")).toBe(false);
    expect(ownLanguageText("Tòa nhà có thang máy và chỗ để xe máy", "en")).toBe("");
    expect(ownLanguageText("Tòa nhà có thang máy và chỗ để xe máy", "vi")).toBe("Tòa nhà có thang máy và chỗ để xe máy");
  });

  it("keeps an English description on the English page", () => {
    expect(ownLanguageText("  Doraemon's Land Đỗ Bá has   15 studios.  ", "en")).toBe("Doraemon's Land Đỗ Bá has 15 studios.");
    expect(ownLanguageText(undefined, "en")).toBe("");
  });
});

describe("faqData", () => {
  it("is null without SITE_URL or questions", () => {
    expect(faqData([{ question: "Q?", answer: "A." }], "vi")).toBeNull();
    setEnv({ SITE_URL: "https://drmstays.test" });
    expect(faqData([{ question: " ", answer: "A." }], "vi")).toBeNull();
  });

  it("lists each question with its answer", () => {
    setEnv({ SITE_URL: "https://drmstays.test" });
    expect(faqData([{ question: "Tiền cọc là bao nhiêu?", answer: "1 tháng tiền nhà." }], "vi")).toEqual({
      "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "vi",
      mainEntity: [{ "@type": "Question", name: "Tiền cọc là bao nhiêu?", acceptedAnswer: { "@type": "Answer", text: "1 tháng tiền nhà." } }],
    });
  });
});

describe("home structured data", () => {
  it("names the buildings and the lowest rent", () => {
    setEnv({ SITE_URL: "https://drmstays.test" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = (structuredData("home", "en", undefined, undefined, { buildings: [{ id: "b1", name: "AnLiu" }], priceFrom: 11_000_000 }) as any)["@graph"][0];
    expect(org.owns).toEqual([{ "@type": "ApartmentComplex", name: "AnLiu", url: "https://drmstays.test/en/buildings/b1" }]);
    expect(org.priceRange).toBe("From 11,000,000 VND/month");
  });
});

describe("llms.txt", () => {
  const building: LlmsBuilding = {
    id: "b1", name: "AnLiu Apartment", address: "70 Mai Thúc Lân", description: "", floorCount: 8, status: "open", images: [],
    types: [{ id: "t1", name: "Studio", areaSqm: 30, maxGuests: 2, beds: 1, priceFrom: 13_000_000, rooms: [{}, {}] }], rooms: [],
  } as unknown as LlmsBuilding;
  const faq = [{ id: "f1", section: "faq", title_vi: "Cọc?", title_en: "Deposit?", body_vi: "1 tháng", body_en: "One month's rent.", published: 1, deleted: 0, position: 1 }] as ContentItem[];

  it("summarises the business with links, prices and the FAQ", () => {
    const text = buildLlmsTxt("https://drmstays.test", { vi: [building], en: [building] }, faq);
    expect(text.startsWith("# DRM Stays\n\n> ")).toBe(true);
    expect(text).toContain("- Monthly rent from 13,000,000 VND.");
    expect(text).toContain("### AnLiu Apartment");
    expect(text).toContain("- Room type [Studio](https://drmstays.test/en/types/t1): 30 m², up to 2 guests, 1 bed, from 13,000,000 VND/month");
    expect(text).toContain("Q: Deposit?\nA: One month's rent.");
    expect(text).toContain("https://drmstays.test/vi/faq");
  });
});
