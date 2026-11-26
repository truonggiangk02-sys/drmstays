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

import { HR_BLOCK, NOTE_BLOCK, clearFormatting, lineStyleAt, setLineStyle } from "@/lib/editor-text";
import { SPECIAL_GROUPS, searchChars } from "@/lib/special-chars";
import { findMatches, nextMatch, replaceAllText } from "@/lib/find-replace";

describe("the paragraph style", () => {
  it("says how the line is set", () => {
    expect(lineStyleAt("Plain text", 3)).toBe("p");
    expect(lineStyleAt("## Costs", 3)).toBe("h2");
    expect(lineStyleAt("a\n### Deposit\nb", 4)).toBe("h3");
    expect(lineStyleAt("- item", 2)).toBe("other");
    expect(lineStyleAt("# Title", 2)).toBe("other");
    expect(lineStyleAt("| a | b |", 2)).toBe("other");
  });
  it("sets a heading, a plain paragraph, or changes one into the other", () => {
    expect(apply("Costs", setLineStyle("Costs", 2, "h2")).out).toBe("## Costs");
    expect(apply("## Costs", setLineStyle("## Costs", 2, "h3")).out).toBe("### Costs");
    expect(apply("### Costs", setLineStyle("### Costs", 2, "p")).out).toBe("Costs");
    expect(apply("- item", setLineStyle("- item", 2, "h2")).out).toBe("## item");
    expect(apply("", setLineStyle("", 0, "h2")).out).toBe("## Heading");
    expect(apply("Costs", setLineStyle("Costs", 0, "h3")).selected).toBe("Costs");
  });
});

describe("clearing formatting", () => {
  it("takes off heading, list and quote marks, bold, italic and code on the selected lines", () => {
    const value = "## Big **title**\n- a *note* and `code`\n> quoted\nplain";
    expect(apply(value, clearFormatting(value, 0, value.length)).out).toBe("Big title\na note and code\nquoted\nplain");
  });
  it("works on the cursor's line when nothing is selected, and leaves other lines", () => {
    const value = "keep **this**\n## drop the mark\nkeep **that**";
    expect(apply(value, clearFormatting(value, 20, 20)).out).toBe("keep **this**\ndrop the mark\nkeep **that**");
  });
  it("leaves links, table rows and code blocks alone", () => {
    const value = "**x** [**link**](/en/stays)\n| **a** | b |\n```\n**raw**\n```";
    expect(apply(value, clearFormatting(value, 0, value.length)).out).toBe("x [link](/en/stays)\n| **a** | b |\n```\n**raw**\n```");
  });
});

describe("blocks that are always the same", () => {
  it("are a rule and a note the page can draw", () => {
    expect(HR_BLOCK).toBe("---");
    expect(NOTE_BLOCK.startsWith("> ")).toBe(true);
  });
});

describe("special characters", () => {
  it("offer the Vietnamese essentials first", () => {
    expect(SPECIAL_GROUPS[0].items.map(item => item.text)).toEqual(expect.arrayContaining(["₫", "m²", "°C", "–", "—"]));
  });
  it("find a character by its name in Vietnamese or English, accents or not", () => {
    expect(searchChars("dong").flatMap(group => group.items.map(item => item.text))).toContain("₫");
    expect(searchChars("đồng").flatMap(group => group.items.map(item => item.text))).toContain("₫");
    expect(searchChars("square").flatMap(group => group.items.map(item => item.text))).toContain("m²");
    expect(searchChars("mui ten").flatMap(group => group.items.map(item => item.text))).toEqual([]);
    expect(searchChars("arrow").map(group => group.name)).toEqual(["Mũi tên"]);
  });
  it("find a character by typing it, and return everything for an empty search", () => {
    expect(searchChars("€").flatMap(group => group.items.map(item => item.text))).toContain("€");
    expect(searchChars("  ")).toBe(SPECIAL_GROUPS);
    expect(searchChars("zzzz")).toEqual([]);
  });
  it("never offer a character that would change the Markdown", () => {
    const all = SPECIAL_GROUPS.flatMap(group => group.items.map(item => item.text)).join("");
    for (const bad of ["*", "_", "#", "|", "`", "<", ">", "[", "]", "\\"]) expect(all).not.toContain(bad);
  });
});

describe("find and replace", () => {
  const text = "Stay in An Thuong. an thuong is quiet. AN THUONG!";
  it("finds every match, ignoring case unless asked", () => {
    expect(findMatches(text, "an thuong")).toEqual([8, 19, 39]);
    expect(findMatches(text, "An Thuong", true)).toEqual([8]);
    expect(findMatches(text, "")).toEqual([]);
  });
  it("replaces all of them and counts", () => {
    expect(replaceAllText(text, "an thuong", "My Khe")).toEqual({ text: "Stay in My Khe. My Khe is quiet. My Khe!", count: 3 });
    expect(replaceAllText(text, "zzz", "x")).toEqual({ text, count: 0 });
  });
  it("takes the replacement as plain text, not as a pattern", () => {
    expect(replaceAllText("a.b a.b", "a.b", "$&$1\\n").text).toBe("$&$1\\n $&$1\\n");
    expect(findMatches("a.b axb", "a.b")).toEqual([0]);
  });
  it("goes to the next match after the cursor and comes back round to the first", () => {
    expect(nextMatch(text, "an thuong", 0)).toBe(8);
    expect(nextMatch(text, "an thuong", 9)).toBe(19);
    expect(nextMatch(text, "an thuong", 39)).toBe(39);
    expect(nextMatch(text, "an thuong", 40)).toBe(8);
    expect(nextMatch(text, "nothing", 0)).toBeNull();
  });
});

import { linkTo, validHref } from "@/lib/editor-text";
describe("links to pages", () => {
  it("accept paths on the site and https addresses only", () => {
    for (const ok of ["/en/stays", "/en/buildings/abc-123", "https://www.example.gov/page?x=1"]) expect(validHref(ok), ok).toBe(true);
    for (const bad of ["http://example.com", "javascript:alert(1)", "//evil.example", "en/stays", "/en/a b", "/en/a)b", "https://x.y/[z]", ""]) expect(validHref(bad), bad).toBe(false);
  });
  it("write [label](address), taking the label from the selection when none is given", () => {
    expect(apply("see our rooms", linkTo("see our rooms", 4, 13, "/en/stays")).out).toBe("see [our rooms](/en/stays)");
    expect(apply("see", linkTo("see", 3, 3, "/en/stays", "Buildings [and] rooms")).out).toBe("see[Buildings and rooms](/en/stays)");
    expect(apply("", linkTo("", 0, 0, "/en/stays")).out).toBe("[/en/stays](/en/stays)");
  });
});
