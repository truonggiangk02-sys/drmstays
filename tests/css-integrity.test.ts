import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(__dirname, "..", "app");

/** Selectors (text before each "{") of a stylesheet, with comments removed, and the line they start on. */
function selectors(css: string): Array<{ selector: string; line: number }> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, " "));
  const found: Array<{ selector: string; line: number }> = [];
  let start = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === "{") {
      const text = clean.slice(start, i);
      const lead = text.length - text.trimStart().length;
      found.push({ selector: text.trim(), line: clean.slice(0, start + lead).split("\n").length });
      start = i + 1;
    } else if (ch === "}" || ch === ";") start = i + 1;
  }
  return found;
}

describe("stylesheets", () => {
  // A selector cut in half by a bad edit (for example ".a " alone on a line) silently merges with the next rule and kills it.
  it("has no selector broken across lines", () => {
    const broken: string[] = [];
    for (const file of readdirSync(dir).filter(name => name.endsWith(".css"))) {
      for (const { selector, line } of selectors(readFileSync(join(dir, file), "utf8"))) {
        if (selector.startsWith("@")) continue;
        for (const part of selector.split(",")) if (/\n/.test(part.trim())) broken.push(`${file}:${line} ${part.trim().replace(/\s+/g, " ").slice(0, 90)}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
