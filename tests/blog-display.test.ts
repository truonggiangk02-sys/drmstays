import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JournalArticle } from "@/components/journal-views";
import { buildLlmsTxt } from "@/lib/llms-txt";
import { postFor, relatedPosts, type JournalPost, type JournalRow } from "@/lib/journal";
import { articleData, faqData } from "@/lib/structured-data";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

/** JSON-LD as the tests read it. */
type Ld = Record<string, unknown> & { author: Record<string, unknown>; image: unknown; mainEntity: unknown };

resetEnvBeforeEach();

const IMG = "6f1c2a1e-1111-4222-8333-944455556666";
const BODY = `Intro answer.\n\n## Key takeaways\n- a\n- b\n- c\n\n## Costs\n\n![Quiet lane in An Thuong with apartment buildings at dusk](/media/catalog/${IMG})\n\n## Areas\n\nText.\n\n## Frequently asked questions\n\n### Is wifi included?\n\nYes, wifi is included in the monthly rent.`;
const row = (over: Partial<JournalRow> = {}): JournalRow => ({
  id: "post-1", title_vi: "", title_en: "Where to Stay in Da Nang: Best Areas Compared by Local Hosts", body_vi: "", body_en: BODY, published: 1, deleted: 0, position: 1,
  slug: "where-to-stay-da-nang", excerpt_vi: "", excerpt_en: "A local host compares four Da Nang areas.", published_at: "2026-12-01", updated_at: "2026-12-10",
  seo_title_en: "Where to Stay in Da Nang: Best Areas", primary_keyword: "where to stay in da nang", keyword_variations: "best area to stay; which area to stay", search_intent: "informational",
  post_template: "A", post_level: "B", topic: "area", author_id: "a1", status: "published", checks_json: "", checked_by: "admin", checked_at: "2026-11-30", cover_alt_en: "", ...over,
});
const author = { id: "a1", name: "Nguyen Van A", role: "Head of Operations", bio: "Runs the buildings every day.", photo_id: "99999999-9999-4999-8999-999999999999", url: "https://example.com/a" };
const cover = { id: "cover-1", url: "/media/catalog/cover-1", alt: "Cover of the post", width: 1600, height: 900 };
const inBody = { id: IMG, url: `/media/catalog/${IMG}`, alt: "", width: 1200, height: 800 };
const unused = { id: "unused-1", url: "/media/catalog/unused-1", alt: "Not in the text", width: 800, height: 600 };

describe("the post page", () => {
  const post = postFor(row(), "en")!;
  const html = (extra: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(JournalArticle, { lang: "en", post, images: [cover, inBody, unused], author, ...extra }));

  it("shows the Google title apart from the H1", () => {
    expect(post.title).toBe("Where to Stay in Da Nang: Best Areas Compared by Local Hosts");
    expect(post.seoTitle).toBe("Where to Stay in Da Nang: Best Areas");
    expect(postFor(row({ seo_title_en: "" }), "en")!.seoTitle).toBe(post.title);
    expect(html().match(/<h1/g)).toHaveLength(1);
  });

  it("draws the contents list from the ## headings, and hides it for short posts", () => {
    expect(html()).toContain('<nav class="journal-toc"');
    expect(html()).toContain('href="#costs"');
    expect(renderToStaticMarkup(createElement(JournalArticle, { lang: "en", post: { ...post, body: "## One\n\ntext" }, images: [] }))).not.toContain("journal-toc");
  });

  it("draws the pictures of the post with sizes, and lists only the photos the text does not use below it", () => {
    const page = html();
    expect(page).toContain(`<img src="/media/catalog/${IMG}" alt="Quiet lane in An Thuong with apartment buildings at dusk" loading="lazy" decoding="async" width="1200" height="800">`);
    expect(page.match(new RegExp(`/media/catalog/${IMG}`, "g"))).toHaveLength(1);
    expect(page).toContain('class="journal-gallery"');
    expect(page).toContain("/media/catalog/unused-1");
    expect(page).toContain('class="journal-cover" src="/media/catalog/cover-1"');
  });

  it("shows the author block with name, title, bio and photo", () => {
    const page = html();
    expect(page).toContain("Written by <strong>Nguyen Van A</strong>, Head of Operations");
    expect(page).toContain("Runs the buildings every day.");
    expect(page).toContain('src="/media/catalog/99999999-9999-4999-8999-999999999999"');
    expect(page).toContain('<a href="https://example.com/a" rel="noopener noreferrer">Nguyen Van A</a>');
  });

  it("does not link an author page that is not https", () => {
    expect(html({ author: { ...author, url: "javascript:alert(1)" } })).not.toContain("javascript:");
  });

  it("lists related guides and the building", () => {
    const page = html({ related: [{ ...post, id: "p2", slug: "other-guide", title: "Another guide" }], building: { id: "b1", name: "Doraemon's Land Do Ba" } });
    expect(page).toContain('href="/en/journal/other-guide"');
    expect(page).toContain('href="/en/buildings/b1"');
  });

  it("shows no author or related block when there is none", () => {
    const page = renderToStaticMarkup(createElement(JournalArticle, { lang: "en", post, images: [] }));
    expect(page).not.toContain("journal-author");
    expect(page).not.toContain("journal-related");
  });
});

describe("related guides", () => {
  const make = (id: string, topic: string, publishedAt: string): Pick<JournalPost, "id" | "topic" | "publishedAt"> => ({ id, topic: topic as JournalPost["topic"], publishedAt });
  it("are three others of the same topic, newest first", () => {
    const posts = [make("a", "area", "2026-01-01"), make("b", "area", "2026-03-01"), make("c", "pricing", "2026-04-01"), make("d", "area", "2026-02-01"), make("e", "area", "2026-05-01"), make("f", "area", "2026-06-01")];
    expect(relatedPosts(posts, { id: "a", topic: "area" }).map(post => post.id)).toEqual(["f", "e", "b"]);
    expect(relatedPosts(posts, { id: "c", topic: "" })).toEqual([]);
  });
});

describe("data for Google and AI", () => {
  const post = postFor(row(), "en")!;
  it("BlogPosting names a Person as author and carries keywords, topic and word count", () => {
    setEnv({ SITE_URL: "https://drmstays.vn" });
    const data = articleData(post, ["/media/catalog/cover-1"], {
      author: { name: "Nguyen Van A", role: "Head of Operations", url: "https://example.com/a", imageUrl: "/media/catalog/p" },
      keywords: [post.keyword, ...post.variations], section: "Areas", wordCount: post.words,
    }) as Ld;
    expect(data["@type"]).toBe("BlogPosting");
    expect(data.author).toMatchObject({ "@type": "Person", name: "Nguyen Van A", jobTitle: "Head of Operations", url: "https://example.com/a", image: "https://drmstays.vn/media/catalog/p" });
    expect(data.keywords).toBe("where to stay in da nang, best area to stay, which area to stay");
    expect(data.articleSection).toBe("Areas");
    expect(data.wordCount).toBe(post.words);
    expect(data.dateModified).toBe("2026-12-10");
  });

  it("falls back to the organization as author and the default picture when there is none", () => {
    setEnv({ SITE_URL: "https://drmstays.vn" });
    const data = articleData(post, []) as Ld;
    expect(data.author["@type"]).toBe("Organization");
    expect(data.image).toEqual(["https://drmstays.vn/og-default.jpg"]);
  });

  it("FAQPage is built from the FAQ section of the post", async () => {
    setEnv({ SITE_URL: "https://drmstays.vn" });
    const { faqItems } = await import("@/lib/journal-markdown");
    const data = faqData(faqItems(post.body, "Frequently asked questions"), "en") as Ld;
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toEqual([{ "@type": "Question", name: "Is wifi included?", acceptedAnswer: { "@type": "Answer", text: "Yes, wifi is included in the monthly rent." } }]);
  });

  it("llms.txt lists each guide with its topic and last update", () => {
    const text = buildLlmsTxt("https://drmstays.vn", { vi: [], en: [] }, [], [{ slug: post.slug, title: post.title, excerpt: post.excerpt, updatedAt: post.updatedAt, topic: post.topic }]);
    expect(text).toContain(`(topic: Areas, updated 2026-12-10)`);
  });

  it("the Vietnamese page keeps its own title and no keywords", () => {
    const vi = postFor(row({ title_vi: "Nên ở đâu tại Đà Nẵng", body_vi: "Nội dung có các phòng và tòa." }), "vi")!;
    expect(vi.seoTitle).toBe("Nên ở đâu tại Đà Nẵng");
    expect(vi.keyword).toBe("");
  });
});
