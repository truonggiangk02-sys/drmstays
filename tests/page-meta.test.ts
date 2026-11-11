import { describe, expect, it } from "vitest";
import { homeMeta, pageMeta } from "@/lib/page-meta";
import { propertyName } from "@/lib/site";
import { sampleContent } from "@/lib/site-content";

const langs = ["vi", "en"] as const;

describe("page titles and descriptions", () => {
  it("are all different, so no two pages tell Google the same thing", () => {
    for (const lang of langs) {
      const all = [homeMeta[lang], ...Object.values(pageMeta[lang])];
      expect(new Set(all.map(item => item.title)).size).toBe(all.length);
      expect(new Set(all.map(item => item.description)).size).toBe(all.length);
    }
  });
  it("fit what Google shows (title incl. brand suffix about 60 characters, description about 160)", () => {
    for (const lang of langs) {
      expect(homeMeta[lang].title.length).toBeLessThanOrEqual(62);
      expect(homeMeta[lang].description.length).toBeLessThanOrEqual(175);
      for (const [name, meta] of Object.entries(pageMeta[lang])) {
        expect(`${meta.title} | DRM Stays`.length, `${lang} ${name} title`).toBeLessThanOrEqual(65);
        expect(meta.description.length, `${lang} ${name} description`).toBeLessThanOrEqual(175);
        expect(meta.description.length, `${lang} ${name} description`).toBeGreaterThanOrEqual(60);
      }
    }
  });
});

describe("page headings (H1)", () => {
  it("describe the page, differ from each other and are not just the short menu name", () => {
    for (const lang of langs) {
      const all = Object.values(pageMeta[lang]).map(item => item.h1);
      expect(new Set(all).size).toBe(all.length);
      for (const h1 of all) { expect(h1.length).toBeGreaterThanOrEqual(20); expect(h1.length).toBeLessThanOrEqual(70); }
    }
  });
});

describe("default site content", () => {
  it("has Vietnamese and English text for every item", () => {
    for (const item of sampleContent) {
      for (const field of ["title_vi", "title_en", "body_vi", "body_en"] as const) expect(item[field].trim(), `${item.id} ${field}`).not.toBe("");
    }
  });
  it("has unique ids and no placeholder journal articles", () => {
    const ids = sampleContent.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(sampleContent.filter(item => item.section === "journal")).toEqual([]);
  });
  it("covers every public section that has default content", () => {
    for (const section of ["about", "services", "partners", "faq"]) expect(sampleContent.some(item => item.section === section), section).toBe(true);
  });
});

describe("propertyName", () => {
  it("uses the official spelling of Doraemon's Land", () => {
    for (const raw of ["Doraemon Land", "doraemonland", "Doraemon's Land", "Doraemon’s Land", "DORAEMON LAND"]) expect(propertyName(raw)).toBe("Doraemon's Land");
    expect(propertyName("Doraemon Land Đỗ Bá")).toBe("Doraemon's Land Đỗ Bá");
  });
  it("leaves other names alone", () => expect(propertyName("AnLiu Apartment")).toBe("AnLiu Apartment"));
});
