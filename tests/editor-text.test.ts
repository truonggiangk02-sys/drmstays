import { describe, expect, it } from "vitest";
import { asBlock, CTA_BLOCK, FAQ_BLOCK, KEY_TAKEAWAYS_BLOCK, lineRange, makeLink, outlineWithWords, toggleHeading, toggleLinePrefix, wrapSelection, type TextEdit } from "@/lib/editor-text";
import { checkPost } from "@/lib/blog-check";
import { countTextWords, outline } from "@/lib/journal-markdown";

/** What the text looks like after the edit, and what is selected. */
const apply = (value: string, edit: TextEdit) => { const out = value.slice(0, edit.from) + edit.text + value.slice(edit.to); return { out, selected: out.slice(edit.selectFrom, edit.selectTo) }; };

describe("bold and italic", () => {
  it("wrap the selection and keep it selected", () => {
    expect(apply("a word here", wrapSelection("a word here", 2, 6, "**", "text"))).toEqual({ out: "a **word** here", selected: "word" });
  });
  it("put a placeholder when nothing is selected", () => {
    expect(apply("ab", wrapSelection("ab", 1, 1, "*", "text"))).toEqual({ out: "a*text*b", selected: "text" });
  });
  it("take the marks off when pressed again", () => {
    expect(apply("a **word** here", wrapSelection("a **word** here", 4, 8, "**", "text"))).toEqual({ out: "a word here", selected: "word" });
  });
});

describe("lists and quotes", () => {
  const text = "intro\nfirst\nsecond\n\nlast";
  it("make every line of the selection a bullet and skip blank lines", () => {
    const start = text.indexOf("first"), end = text.indexOf("last") + 4;
    expect(apply(text, toggleLinePrefix(text, start, end, "bullet")).out).toBe("intro\n- first\n- second\n\n- last");
  });
  it("number the lines one, two, three", () => {
    expect(apply("a\nb\nc", toggleLinePrefix("a\nb\nc", 0, 5, "number")).out).toBe("1. a\n2. b\n3. c");
  });
  it("turn back into plain lines when pressed again", () => {
    const once = apply("a\nb", toggleLinePrefix("a\nb", 0, 3, "bullet")).out;
    expect(apply(once, toggleLinePrefix(once, 0, once.length, "bullet")).out).toBe("a\nb");
  });
  it("change a bullet list into a numbered one", () => {
    expect(apply("- a\n- b", toggleLinePrefix("- a\n- b", 0, 7, "number")).out).toBe("1. a\n2. b");
  });
  it("quote the line the cursor is on", () => {
    expect(apply("one\ntwo", toggleLinePrefix("one\ntwo", 5, 5, "quote")).out).toBe("one\n> two");
  });
});

describe("headings", () => {
  it("make the line a ## heading and select its words", () => {
    expect(apply("Costs", toggleHeading("Costs", 2, 2, 2))).toEqual({ out: "## Costs", selected: "Costs" });
  });
  it("change a ### into a ## and back off", () => {
    expect(apply("### Costs", toggleHeading("### Costs", 0, 0, 2)).out).toBe("## Costs");
    expect(apply("## Costs", toggleHeading("## Costs", 3, 3, 2)).out).toBe("Costs");
  });
  it("write a placeholder heading on an empty line", () => {
    expect(apply("", toggleHeading("", 0, 0, 3)).out).toBe("### Heading");
  });
});

describe("links and blocks", () => {
  it("turn the selection into a link label and select the address", () => {
    expect(apply("see our rooms", makeLink("see our rooms", 4, 13))).toEqual({ out: "see [our rooms](https://drmstays.vn/en/)", selected: "https://drmstays.vn/en/" });
  });
  it("stand a block on its own lines whatever surrounds it", () => {
    expect(apply("one\n\ntwo", asBlock("one\n\ntwo", 5, 5, "## H")).out).toBe("one\n\n## H\n\ntwo");
    expect(apply("one two", asBlock("one two", 3, 3, "## H")).out).toBe("one\n\n## H\n\n two");
    expect(apply("", asBlock("", 0, 0, "## H")).out).toBe("## H\n");
    expect(apply("one\n", asBlock("one\n", 4, 4, "## H")).out).toBe("one\n\n## H\n");
  });
  it("knows where a line starts and ends", () => {
    expect(lineRange("aa\nbbb\ncc", 4, 4)).toEqual({ from: 3, to: 6 });
    expect(lineRange("aa", 0, 2)).toEqual({ from: 0, to: 2 });
  });
});

describe("sections the standard asks for", () => {
  it("are marked so the post stays blocked until they are filled (rule R16)", () => {
    const base = { h1: "", seoTitle: "", meta: "", slug: "", keyword: "", variations: "", intent: "", template: "", level: "", topic: "", authorId: "", coverAlt: "", hasCover: false };
    for (const block of [KEY_TAKEAWAYS_BLOCK, FAQ_BLOCK]) {
      const checks = checkPost({ ...base, body: block }, { selfId: "x", others: [], knownPrices: [] });
      expect(checks.some(check => check.code === "R16" && check.level === "block")).toBe(true);
    }
  });
  it("use the exact headings the rules look for", () => {
    expect(outline(KEY_TAKEAWAYS_BLOCK)[0].text).toBe("Key takeaways");
    expect(outline(FAQ_BLOCK).filter(item => item.level === 3)).toHaveLength(3);
    expect(CTA_BLOCK).toContain("](/en/contact)");
  });
});

describe("the outline", () => {
  it("lists the headings with the words under each", () => {
    const value = "Intro words here.\n\n## One\n\nthree words here\n\n### Sub\n\ntwo words\n\n## Two\n\nsolo";
    const entries = outlineWithWords(outline(value), value, countTextWords);
    expect(entries.map(entry => [entry.level, entry.text, entry.words])).toEqual([[2, "One", 3], [3, "Sub", 2], [2, "Two", 1]]);
    expect(entries[0].offset).toBe(value.indexOf("## One"));
  });
});
