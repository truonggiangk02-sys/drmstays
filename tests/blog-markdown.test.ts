import { describe, expect, it } from "vitest";
import { parsePastedPost } from "@/lib/blog-frontmatter";
import { bodyWords, faqItems, markdownLinks, mediaImageId, outline, renderMarkdown, renderMarkdownFull } from "@/lib/journal-markdown";

const ID = "6f1c2a1e-1111-4222-8333-944455556666";

describe("pictures in a post", () => {
  it("draws a picture of the library with its description and size", () => {
    const html = renderMarkdown(`![Quiet lane in An Thuong at dusk](/media/catalog/${ID})`, { images: { [ID]: { width: 1600, height: 900 } } });
    expect(html).toContain(`<figure class="journal-figure"><img src="/media/catalog/${ID}" alt="Quiet lane in An Thuong at dusk" loading="lazy" decoding="async" width="1600" height="900">`);
  });

  it("accepts the picture with the site's own address in front and falls back to the library's description", () => {
    const html = renderMarkdown(`![](https://drmstays.vn/media/catalog/${ID})`, { images: { [ID]: { alt: "From the library" } } });
    expect(html).toContain(`src="/media/catalog/${ID}"`);
    expect(html).toContain('alt="From the library"');
  });

  it("drops pictures from other websites and pictures inside a sentence", () => {
    expect(renderMarkdown("![x](https://example.com/a.jpg)")).toBe("");
    expect(renderMarkdown("![x](/media/catalog/not-an-id)")).toBe("");
    expect(renderMarkdown(`Look ![inline](/media/catalog/${ID}) here`)).toBe("<p>Look  here</p>");
    expect(renderMarkdown("![x](javascript:alert(1))")).not.toContain("javascript");
  });

  it("escapes the description", () => {
    expect(renderMarkdown(`![a "quoted" <b>bold</b> lane](/media/catalog/${ID})`)).toContain('alt="a &quot;quoted&quot; &lt;b&gt;bold&lt;/b&gt; lane"');
  });

  it("knows which addresses are library photos", () => {
    expect(mediaImageId(`/media/catalog/${ID}`)).toBe(ID);
    expect(mediaImageId(`https://www.drmstays.vn/media/catalog/${ID}`)).toBe(ID);
    expect(mediaImageId("/media/other/x")).toBeNull();
    expect(mediaImageId(`https://evil.example/media/catalog/${ID}`)).toBeNull();
  });

  it("a picture ends the paragraph before it", () => {
    expect(renderMarkdown(`Before\n![A description of a quiet lane at dusk here](/media/catalog/${ID})\nAfter`)).toMatch(/<p>Before<\/p>\n<figure[\s\S]*<\/figure>\n<p>After<\/p>/);
  });
});

describe("reading the structure of a post", () => {
  const body = "Intro\n\n## Key takeaways\n- a\n- b\n\n## Costs\n\n### Deposit\n\nText\n\n```\n## not a heading\n```\n\n## Frequently asked questions\n\n### What is the deposit?\n\nOne month of rent, paid on arrival.\n\n### Is wifi included?\n\nYes, **wifi** is included.\n\n## Next";

  it("lists the headings with their ids for the contents list", () => {
    const { headings } = renderMarkdownFull(body);
    expect(headings.filter(heading => heading.level === 2).map(heading => heading.text)).toEqual(["Key takeaways", "Costs", "Frequently asked questions", "Next"]);
    expect(headings.find(heading => heading.text === "Costs")!.id).toBe("costs");
  });

  it("draws a code block as plain text, never as HTML", () => {
    expect(renderMarkdown("```\n<script>alert(1)</script>\n## Not a heading\n```")).toBe("<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;\n## Not a heading</code></pre>");
  });

  it("outline skips headings inside code blocks", () => {
    expect(outline(body).map(item => item.text)).not.toContain("not a heading");
  });

  it("pulls the questions and plain answers of the FAQ section", () => {
    expect(faqItems(body, "Frequently asked questions")).toEqual([
      { question: "What is the deposit?", answer: "One month of rent, paid on arrival." },
      { question: "Is wifi included?", answer: "Yes, wifi is included." },
    ]);
    expect(faqItems("## Costs", "Frequently asked questions")).toEqual([]);
  });

  it("finds links and pictures with their position", () => {
    const links = markdownLinks("a [x](https://a.com) b ![alt text](/media/catalog/1)");
    expect(links).toEqual([{ text: "x", url: "https://a.com", image: false, offset: 2, length: 18 }, { text: "alt text", url: "/media/catalog/1", image: true, offset: 23, length: 29 }]);
  });

  it("counts words without tables, code and picture lines", () => {
    expect(bodyWords("One two three.\n\n| a | b |\n| - | - |\n| c | d |\n\n```\ncode words here\n```\n\n![x y z](/media/catalog/1)\n\nFour five.")).toBe(5);
  });
});

describe("pasting a whole post", () => {
  const pasted = `---
h1: Where to Stay in Da Nang: Best Areas Compared by Local Hosts
seo_title: Where to Stay in Da Nang: Best Areas
meta: An Thuong, My Khe, Hai Chau or Son Tra? A local host compares four Da Nang areas by price: with real times.
slug: where-to-stay-da-nang
keyword: where to stay in da nang
variations: best area to stay in da nang; which area to stay in da nang
intent: informational
template: a
level: A
topic: Area
author: Nguyen Van A
date: 2026-12-01
cover_alt: Quiet lane in An Thuong, Da Nang, with apartment buildings and motorbikes at dusk
colour: blue
---
Opening answer in the first 60 words…

## Key takeaways
- one

![A photo from elsewhere of a lane in An Thuong at dusk](https://cdn.example.com/a.jpg)
![Ours](/media/catalog/${ID})
`;

  it("fills the fields from the head block and keeps the rest as the body", () => {
    const result = parsePastedPost(pasted);
    expect(result.hadHead).toBe(true);
    expect(result.fields).toMatchObject({
      h1: "Where to Stay in Da Nang: Best Areas Compared by Local Hosts", seoTitle: "Where to Stay in Da Nang: Best Areas", slug: "where-to-stay-da-nang",
      keyword: "where to stay in da nang", intent: "informational", template: "A", level: "A", topic: "area", author: "Nguyen Van A", date: "2026-12-01",
    });
    expect(result.fields.meta).toContain("with real times");
    expect(result.fields.coverAlt).toContain("Quiet lane in An Thuong, Da Nang");
    expect(result.body.startsWith("Opening answer in the first 60 words")).toBe(true);
    expect(result.body).not.toContain("h1:");
  });

  it("ignores unknown keys but reports them", () => {
    expect(parsePastedPost(pasted).unknownKeys).toEqual(["colour"]);
  });

  it("lists pictures that live on other websites, not the library's own", () => {
    expect(parsePastedPost(pasted).externalImages).toEqual(["https://cdn.example.com/a.jpg"]);
  });

  it("leaves unknown or invalid values empty instead of failing", () => {
    const result = parsePastedPost("---\nh1: A title\ntemplate: Z\nintent: maybe\ndate: 2026-13-45\nauthor:\n---\nBody");
    expect(result.fields).toEqual({ h1: "A title" });
    expect(result.invalid.sort()).toEqual(["date", "intent", "template"]);
    expect(result.body).toBe("Body");
  });

  it("takes everything as the body when there is no head block", () => {
    const result = parsePastedPost("## Just a section\n\nSome text: with a colon");
    expect(result.hadHead).toBe(false);
    expect(result.fields).toEqual({});
    expect(result.body).toBe("## Just a section\n\nSome text: with a colon");
  });

  it("copes with Windows line ends and a missing closing line", () => {
    expect(parsePastedPost("---\r\nh1: Title\r\n---\r\nText\r\n").body).toBe("Text");
    const open = parsePastedPost("---\nh1: Title\nText");
    expect(open.hadHead).toBe(false);
    expect(open.body).toContain("Text");
  });

  it("keeps colons inside a value", () => {
    expect(parsePastedPost("---\nh1: Where to stay: a guide\n---\nx").fields.h1).toBe("Where to stay: a guide");
  });
});
