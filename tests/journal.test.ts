import { describe, expect, it } from "vitest";
import { formatPostDate, plainText, postFor, readingMinutes, renderMarkdown, rowLanguages, slugify, type JournalRow } from "@/lib/journal";
import { buildSitemap } from "@/lib/sitemap";
import { articleData } from "@/lib/structured-data";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

resetEnvBeforeEach();

const row = (over: Partial<JournalRow> = {}): JournalRow => ({
  id: "6f1c2a1e-1111-4222-8333-944455556666", title_vi: "", title_en: "Monthly rent in Da Nang", body_vi: "", body_en: "## Prices\n\nFrom **11 million VND**.",
  published: 1, deleted: 0, position: 1, slug: "monthly-rent-da-nang", excerpt_vi: "", excerpt_en: "", published_at: "2027-01-15", updated_at: "2027-01-20",
  seo_title_en: "", primary_keyword: "", keyword_variations: "", search_intent: "", post_template: "", post_level: "", topic: "", author_id: "", status: "published", checks_json: "", checked_by: "", checked_at: "", cover_alt_en: "", ...over,
});

describe("journal posts", () => {
  it("make readable addresses from titles, Vietnamese marks included", () => {
    expect(slugify("Monthly apartment rental in Da Nang: real prices in 2027")).toBe("monthly-apartment-rental-in-da-nang-real-prices-in-2027");
    expect(slugify("Thuê nhà ở Đà Nẵng cho người Nhật")).toBe("thue-nha-o-da-nang-cho-nguoi-nhat");
  });

  it("may exist in English only", () => {
    const post = row();
    expect(rowLanguages(post)).toEqual(["en"]);
    expect(postFor(post, "vi")).toBeNull();
    expect(postFor(post, "en")).toMatchObject({ slug: "monthly-rent-da-nang", title: "Monthly rent in Da Nang", excerpt: "Prices From 11 million VND." });
  });

  it("use the written summary when there is one, and date and reading time", () => {
    expect(postFor(row({ excerpt_en: "Real prices." }), "en")!.excerpt).toBe("Real prices.");
    expect(formatPostDate("2027-01-15", "en")).toBe("15 January 2027");
    expect(readingMinutes("word ".repeat(660))).toBe(3);
    expect(plainText("## A [link](https://x.y) and **bold**")).toBe("A link and bold");
  });
});

describe("renderMarkdown", () => {
  it("renders headings, lists, tables, links and emphasis", () => {
    const html = renderMarkdown("# Top\n\n## Costs\n\nRent from **11 million** and *more*.\n\n- Wifi\n- Cleaning\n\n1. View\n2. Sign\n\n| Building | From |\n| --- | --- |\n| Do Ba | 11,000,000 |\n\n> Quiet lane\n\n---\n\n[See rooms](https://drmstays.vn/en/stays) or [Google](https://www.google.com)");
    expect(html).toContain('<h2 id="top">Top</h2>');
    expect(html).toContain('<h2 id="costs">Costs</h2>');
    expect(html).toContain("<p>Rent from <strong>11 million</strong> and <em>more</em>.</p>");
    expect(html).toContain("<ul><li>Wifi</li><li>Cleaning</li></ul>");
    expect(html).toContain("<ol><li>View</li><li>Sign</li></ol>");
    expect(html).toContain('<thead><tr><th scope="col">Building</th><th scope="col">From</th></tr></thead><tbody><tr><td>Do Ba</td><td>11,000,000</td></tr></tbody>');
    expect(html).toContain("<blockquote><p>Quiet lane</p></blockquote>");
    expect(html).toContain("<hr>");
    expect(html).toContain('<a href="https://drmstays.vn/en/stays">See rooms</a>');
    expect(html).toContain('<a href="https://www.google.com" target="_blank" rel="noopener noreferrer">Google</a>');
  });

  it("never lets HTML or script links through", () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1)) <img src=x onerror=alert(1)>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("journal in the sitemap and structured data", () => {
  it("lists an English-only post only under /en", () => {
    const xml = buildSitemap("https://drmstays.vn", [{ path: "/journal/monthly-rent-da-nang", langs: ["en"] }]);
    expect(xml).toContain("<loc>https://drmstays.vn/en/journal/monthly-rent-da-nang</loc>");
    expect(xml).not.toContain("/vi/journal/monthly-rent-da-nang");
    expect(xml).toContain('hreflang="x-default" href="https://drmstays.vn/en/journal/monthly-rent-da-nang"');
  });

  it("describes a post as a BlogPosting by DRM Stays", () => {
    setEnv({ SITE_URL: "https://drmstays.vn" });
    const data = articleData(postFor(row(), "en")!, ["/media/catalog/abc"]) as Record<string, unknown>;
    expect(data).toMatchObject({ "@type": "BlogPosting", headline: "Monthly rent in Da Nang", inLanguage: "en", url: "https://drmstays.vn/en/journal/monthly-rent-da-nang", datePublished: "2027-01-15", dateModified: "2027-01-20", image: ["https://drmstays.vn/media/catalog/abc"] });
  });
});
