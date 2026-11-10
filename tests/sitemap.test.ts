import { describe, expect, it } from "vitest";
import { absoluteImage, buildSitemap, toLastmod } from "@/lib/sitemap";

const O = "https://drmstays.vn";

describe("toLastmod", () => {
  it("turns a D1 timestamp into a W3C datetime", () => expect(toLastmod("2026-11-10 02:44:17")).toBe("2026-11-10T02:44:17Z"));
  it("is undefined for missing or odd values", () => {
    expect(toLastmod(null)).toBeUndefined();
    expect(toLastmod("")).toBeUndefined();
    expect(toLastmod("yesterday")).toBeUndefined();
  });
});

describe("buildSitemap", () => {
  it("lists every page in both languages with hreflang alternates, and no <lastmod> when unknown", () => {
    const xml = buildSitemap(O, [{ path: "/about" }]);
    expect(xml).toContain("<loc>https://drmstays.vn/vi/about</loc>");
    expect(xml).toContain("<loc>https://drmstays.vn/en/about</loc>");
    expect(xml.match(/hreflang="x-default" href="https:\/\/drmstays.vn\/vi\/about"/g)).toHaveLength(2);
    expect(xml).not.toContain("<lastmod>");
    expect(xml).not.toContain("<image:image>");
  });
  it("adds <lastmod> and the page's photos when known, once per language", () => {
    const xml = buildSitemap(O, [{ path: "/rooms/r1", lastmod: "2026-11-10T02:44:17Z", images: ["https://drmstays.vn/media/catalog/a", "https://drmstays.vn/media/catalog/a", "https://drmstays.vn/media/catalog/b"] }]);
    expect(xml.match(/<lastmod>2026-11-10T02:44:17Z<\/lastmod>/g)).toHaveLength(2);
    expect(xml.match(/<image:loc>https:\/\/drmstays.vn\/media\/catalog\/a<\/image:loc>/g)).toHaveLength(2);
    expect(xml.match(/<image:image>/g)).toHaveLength(4);
  });
  it("caps photos per page at 10 and escapes addresses", () => {
    const many = Array.from({ length: 15 }, (_, i) => `https://x.test/i?a=${i}&b=1`);
    const xml = buildSitemap(O, [{ path: "/types/t1", images: many }]);
    expect(xml.match(/<image:image>/g)).toHaveLength(20);
    expect(xml).toContain("a=0&amp;b=1");
  });
  it("is a valid, empty urlset for no pages", () => expect(buildSitemap(O, [])).toContain("<urlset"));
});

describe("absoluteImage", () => {
  it("prefixes site paths and leaves external addresses alone", () => {
    expect(absoluteImage(O, "/media/catalog/a")).toBe("https://drmstays.vn/media/catalog/a");
    expect(absoluteImage(O, "https://images.unsplash.com/x.jpg")).toBe("https://images.unsplash.com/x.jpg");
  });
});
