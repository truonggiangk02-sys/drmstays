import { describe, expect, it } from "vitest";
import { BLOG, REVIEW_ITEMS } from "@/lib/blog-standard";
import { blockers, chars, checkPost, findVndAmounts, summary, type BlogContext, type BlogDraft, type Check } from "@/lib/blog-check";

const IMG1 = "11111111-1111-4111-8111-111111111111";
const IMG2 = "22222222-2222-4222-8222-222222222222";
const ALT = "Quiet lane in An Thuong with apartment buildings and parked motorbikes at dusk";

/** A paragraph of exactly `count` English words in short sentences (no keyword, no numbers, no Vietnamese words). */
function filler(count: number): string {
  const sentence = "The quiet lane keeps the apartment calm at night while the market stays close by foot".split(" "); // 16 words
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(sentence[i % sentence.length] + (i % sentence.length === sentence.length - 1 || i === count - 1 ? "." : ""));
  return out.join(" ");
}

const KEYWORD = "where to stay in da nang";
const answer = (count: number) => filler(count);

/** A post that meets every rule. Tests change one thing and look at what the checker says. */
function goodBody(): string {
  return [
    `We think the quiet streets of An Thuong are the best answer to ${KEYWORD}, with the beach ten minutes away by bike. ${filler(40)}`,
    "## Key takeaways",
    "- An Thuong suits long stays.",
    "- My Khe is nearer the beach.",
    "- Son Tra is the quietest area.",
    `## ${KEYWORD[0].toUpperCase()}${KEYWORD.slice(1)} for a month`,
    filler(90),
    `![${ALT}](/media/catalog/${IMG1})`,
    `Read our [monthly rent guide](https://drmstays.vn/en/monthly-rent) before you decide. ${filler(80)}`,
    "## How the areas differ",
    filler(100), filler(100),
    `![${ALT}](/media/catalog/${IMG2})`,
    "## Who each area suits",
    filler(100), filler(100), filler(100), filler(100),
    "## Frequently asked questions",
    "### Is An Thuong good for a long stay?", answer(40),
    "### Is the beach close by?", answer(40),
    "### Can I rent for one month?", answer(40),
    "## Next step",
    "Ready to see rooms? [Contact us](/en/contact) today.",
  ].join("\n\n");
}

const draft = (over: Partial<BlogDraft> = {}): BlogDraft => ({
  h1: "Where to Stay in Da Nang: Best Areas Compared by Local Hosts",
  seoTitle: "Where to Stay in Da Nang: Best Areas",
  meta: "An Thuong, My Khe, Hai Chau or Son Tra? A local host compares four Da Nang areas by price, beach distance and noise, with real walking times.",
  slug: "where-to-stay-da-nang",
  keyword: KEYWORD, variations: "best area to stay in da nang; which area to stay in da nang",
  intent: "informational", template: "A", level: "B", topic: "area", authorId: "author-1",
  body: goodBody(), coverAlt: ALT, hasCover: true, ...over,
});

const context = (over: Partial<BlogContext> = {}): BlogContext => ({ selfId: "me", others: [], knownPrices: [], knownPaths: ["/en/monthly-rent", "/en/contact", "/en/stays"], ...over });

const run = (over: Partial<BlogDraft> = {}, ctx: Partial<BlogContext> = {}) => checkPost(draft(over), context(ctx));
const at = (checks: Check[], code: string) => checks.filter(check => check.code === code);
const levels = (checks: Check[], code: string) => at(checks, code).map(check => check.level);

describe("the sample post", () => {
  it("meets the standard: nothing blocked, nothing to warn about", () => {
    const checks = run();
    expect(checks.filter(check => check.level !== "ok").map(check => `${check.code} ${check.level} ${check.message}`)).toEqual([]);
  });
  it("is the right size for level B", () => {
    expect(summary(run())).toMatchObject({ block: 0, warn: 0 });
  });
  it("has six review boxes", () => expect(REVIEW_ITEMS).toHaveLength(6));
});

/** One row per rule: [code, what is wrong, expected level]. The sample post passes every one of these rules (see above). */
const violations: Array<[string, string, Partial<BlogDraft>, Partial<BlogContext>, "block" | "warn"]> = [
  ["R01", "H1 too short", { h1: "Where to stay in Da Nang" }, {}, "block"],
  ["R01", "H1 too long", { h1: "Where to stay in Da Nang: the complete and very detailed guide to every area and neighbourhood" }, {}, "block"],
  ["R02", "SEO title too long", { seoTitle: "Where to stay in Da Nang: the best areas compared by local hosts" }, {}, "block"],
  ["R02", "SEO title too short", { seoTitle: "Where to stay in Da Nang" }, {}, "block"],
  ["R03", "meta too short", { meta: "A short description." }, {}, "block"],
  ["R03", "meta starts like the H1", { meta: "Where to stay in Da Nang? An Thuong, My Khe, Hai Chau or Son Tra: a local host compares four areas by price, beach distance and noise, with real times." }, {}, "warn"],
  ["R04", "slug with capitals and spaces", { slug: "Where To Stay" }, {}, "block"],
  ["R04", "slug with one word", { slug: "stay" }, {}, "block"],
  ["R04", "slug with seven words", { slug: "where-to-stay-in-da-nang-guide" }, {}, "block"],
  ["R04", "slug with a date", { slug: "where-to-stay-2026-11-25" }, {}, "block"],
  ["R04", "slug used by another post", {}, { others: [{ id: "x", slug: "where-to-stay-da-nang", h1: "Other", keyword: "something else", status: "published" }] }, "block"],
  ["R05", "keyword missing", { keyword: "" }, {}, "block"],
  ["R05", "keyword not in the H1", { h1: "The Best Areas of Da Nang Compared by Your Local Hosts" }, {}, "block"],
  ["R05b", "keyword missing from the SEO title", { seoTitle: "Best Areas of Da Nang Compared by Hosts" }, {}, "warn"],
  ["R05b", "keyword stuffed", { body: goodBody() + `\n\n${(KEYWORD + ". ").repeat(12)}` }, {}, "warn"],
  ["R06", "under 700 words", { body: "Short post about where to stay in da nang." }, {}, "block"],
  ["R06", "over 3000 words", { body: goodBody() + "\n\n" + Array.from({ length: 30 }, () => filler(100)).join("\n\n") }, {}, "block"],
  ["R06", "outside the range of the level", { level: "A" }, {}, "warn"],
  ["R07", "written in Vietnamese", { body: "Căn hộ đầy đủ nội thất tại Đà Nẵng, có bếp và máy giặt, gần biển và trong khu yên tĩnh. " + goodBody() }, {}, "block"],
  ["R08", "HTML in the post", { body: goodBody() + "\n\n<div>hello</div>" }, {}, "block"],
  ["R08", "an H1 line in the post", { body: "# A big title\n\n" + goodBody() }, {}, "block"],
  ["R08", "a #### heading", { body: goodBody() + "\n\n#### Too deep" }, {}, "block"],
  ["R09", "ten ## headings", { body: goodBody() + "\n\n## One\n\n## Two\n\n## Three\n\n## Four" }, {}, "block"],
  ["R09", "no ## headings", { body: goodBody().replace(/^## /gm, "### ") }, {}, "block"],
  ["R10", "no key takeaways", { body: goodBody().replace("## Key takeaways", "## Quick notes") }, {}, "block"],
  ["R10", "two takeaway bullets", { body: goodBody().replace("- Son Tra is the quietest area.\n\n", "") }, {}, "block"],
  ["R11", "no FAQ", { body: goodBody().replace("## Frequently asked questions", "## Questions") }, {}, "block"],
  ["R11", "an answer that is too short", { body: goodBody().replace(`### Is the beach close by?\n\n${answer(40)}`, "### Is the beach close by?\n\nYes.") }, {}, "block"],
  ["R12", "one internal link only", { body: goodBody().replace("[monthly rent guide](https://drmstays.vn/en/monthly-rent)", "monthly rent guide") }, {}, "block"],
  ["R12", "no contact link at the end", { body: goodBody().replace("[Contact us](/en/contact)", "Contact us") + "\n\n" + filler(300) }, {}, "block"],
  ["R12b", "a link to a page that does not exist", { body: goodBody() + "\n\nSee [this](/en/nothing-here) page." }, {}, "warn"],
  ["R13", "a javascript: link", { body: goodBody() + "\n\n[bad](javascript:alert(1))" }, {}, "block"],
  ["R13", "an http: link", { body: goodBody() + "\n\n[bad](http://example.com/a)" }, {}, "block"],
  ["R13", "more than three outside links", { body: goodBody() + "\n\n[a](https://a.gov/x) [b](https://b.gov/x) [c](https://c.gov/x) [d](https://d.gov/x)" }, {}, "warn"],
  ["R14", "no cover photo", { hasCover: false }, {}, "block"],
  ["R14", "cover description too short", { coverAlt: "A lane" }, {}, "block"],
  ["R15", "only one picture in the post", { body: goodBody().replace(`![${ALT}](/media/catalog/${IMG2})`, "") }, {}, "block"],
  ["R15", "a picture without a description", { body: goodBody().replace(`![${ALT}](/media/catalog/${IMG2})`, `![](/media/catalog/${IMG2})`) }, {}, "block"],
  ["R15", "a picture from another website", { body: goodBody() + `\n\n![${ALT}](https://example.com/a.jpg)` }, {}, "block"],
  ["R16", "NEEDS INPUT left in", { body: goodBody() + "\n\n[NEEDS INPUT: price of a studio]" }, {}, "block"],
  ["R16", "TODO left in", { body: goodBody() + "\n\nTODO check" }, {}, "block"],
  ["R16", "lorem ipsum left in", { body: goodBody() + "\n\nLorem ipsum." }, {}, "block"],
  ["R16", "a {{ placeholder }}", { body: goodBody() + "\n\n{{price}}" }, {}, "block"],
  ["R17", "a banned word", { body: goodBody() + "\n\nThis is the cheapest in the area." }, {}, "warn"],
  ["R18", "an amount that is not a real price", { body: goodBody() + "\n\nRent is 12,500,000 VND a month.\n\nPrices and details checked: November 2026" }, { knownPrices: [11_000_000] }, "warn"],
  ["R19", "VND amounts without the checked line", { body: goodBody() + "\n\nRent is 11,000,000 VND a month." }, { knownPrices: [11_000_000] }, "block"],
  ["R20", "USD without a date", { body: goodBody() + "\n\nThat is about USD 440 a month." }, {}, "warn"],
  ["R21", "a paragraph over 120 words", { body: goodBody() + "\n\n" + filler(130) }, {}, "warn"],
  ["R22", "keyword already used by another post", {}, { others: [{ id: "x", slug: "other-post-here", h1: "Another post", keyword: "Where to stay in Da Nang", status: "draft" }] }, "block"],
  ["R22b", "H1 almost the same as another post", {}, { others: [{ id: "x", slug: "other-post-here", h1: "Where to Stay in Da Nang: Best Areas Compared by Local Host", keyword: "other", status: "published" }] }, "warn"],
  ["R23", "no author chosen", { authorId: "" }, {}, "block"],
  ["R23", "no template chosen", { template: "" }, {}, "block"],
  ["R24", "a table without a header row", { body: goodBody() + "\n\n| Area | Price |\n| An Thuong | 11 |" }, {}, "warn"],
];

describe("rules R01-R24: each is met by the sample post and caught when broken", () => {
  it.each(violations)("%s: %s", (code, _what, over, ctx, level) => {
    expect(levels(run(over, ctx), code)).toContain(level);
  });

  it("covers every rule of the spec", () => {
    const covered = new Set(violations.map(row => row[0]));
    for (const code of ["R01", "R02", "R03", "R04", "R05", "R05b", "R06", "R07", "R08", "R09", "R10", "R11", "R12", "R12b", "R13", "R14", "R15", "R16", "R17", "R18", "R19", "R20", "R21", "R22", "R22b", "R23", "R24"]) expect(covered, code).toContain(code);
  });

  it("the sample post gets an ok line for every rule that applies to it", () => {
    const checks = run({ body: goodBody() + "\n\nRent is 11,000,000 VND a month, about USD 440 in Nov 2026.\n\n| Area | Price |\n| --- | --- |\n| An Thuong | 11 |\n\nPrices and details checked: November 2026" }, { knownPrices: [11_000_000] });
    for (const code of ["R01", "R02", "R03", "R04", "R05", "R05b", "R06", "R07", "R08", "R09", "R10", "R11", "R12", "R12b", "R13", "R14", "R15", "R16", "R17", "R18", "R19", "R20", "R21", "R22", "R22b", "R23", "R24"]) expect(levels(checks, code), code).toContain("ok");
  });
});

describe("rule details", () => {
  it("R18 lists each strange amount on its own, with the text found", () => {
    const checks = run({ body: goodBody() + "\n\nStudios cost 12 million VND, flats 15,000,000 VND and a deposit of 11,000,000 VND.\n\nPrices and details checked: November 2026" }, { knownPrices: [11_000_000] });
    const messages = at(checks, "R18").map(check => check.message);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("12 million VND");
    expect(messages[1]).toContain("15,000,000 VND");
  });

  it("R19 is only required when the post states VND amounts", () => {
    expect(levels(run(), "R19")).toEqual([]);
  });

  it("reads amounts written in the usual ways", () => {
    const amounts = findVndAmounts("From 11,000,000 VND, or 11.5 million VND, VND 12.000.000, 800k VND, 3 triệu đồng and 9000000đ. Not 5 million guests.");
    expect(amounts.map(amount => amount.value)).toEqual([11_000_000, 11_500_000, 12_000_000, 800_000, 3_000_000, 9_000_000]);
  });

  it("an archived post does not count as a duplicate", () => {
    const others = [{ id: "x", slug: "where-to-stay-da-nang", h1: "Old", keyword: KEYWORD, status: "archived" }];
    expect(levels(run({}, { others }), "R22")).toEqual(["ok"]);
    expect(levels(run({}, { others: [{ ...others[0], status: "published" }] }), "R22")).toEqual(["block"]);
  });

  it("a post is not a duplicate of itself", () => {
    expect(levels(run({}, { others: [{ id: "me", slug: "where-to-stay-da-nang", h1: "Mine", keyword: KEYWORD, status: "draft" }] }), "R22")).toEqual(["ok"]);
  });

  it("points to where the problem is", () => {
    const body = goodBody() + "\n\n[NEEDS INPUT: x]";
    const check = at(run({ body }), "R16")[0];
    expect(check.offset).toBe(body.indexOf("[NEEDS INPUT"));
    expect(at(run({ h1: "short" }), "R01")[0].field).toBe("h1");
  });

  it("HTML inside a code block is not counted as HTML", () => {
    expect(levels(run({ body: goodBody() + "\n\n```\n<div>x</div>\n```" }), "R08")).toEqual(["ok"]);
  });

  it("counts characters the way a reader does", () => {
    expect(chars("Fish &amp; chips")).toBe(12);
    expect(chars("  Đà Nẵng  ")).toBe(7);
  });

  it("blockers() and summary() agree", () => {
    const checks = run({ h1: "short", seoTitle: "x" });
    expect(blockers(checks).map(check => check.code)).toEqual(expect.arrayContaining(["R01", "R02"]));
    expect(summary(checks).block).toBe(blockers(checks).length);
  });

  it("keeps every limit in BLOG, one place", () => {
    expect(BLOG.h1).toEqual({ min: 45, max: 70 });
    expect(BLOG.seoTitle.max).toBe(48);
  });
});
