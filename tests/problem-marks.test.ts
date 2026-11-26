import { describe, expect, it } from "vitest";
import type { Check } from "@/lib/blog-check";
import { problemMarks, segments } from "@/lib/problem-marks";

const check = (code: string, level: Check["level"], offset: number, length: number, message = `${code} problem`): Check => ({ code, level, message, field: "body", offset, length });

describe("problem marks", () => {
  it("turn the located checks into stretches, in order", () => {
    const marks = problemMarks([check("R16", "block", 10, 5), check("R17", "warn", 2, 3)], 100);
    expect(marks.map(mark => [mark.from, mark.to, mark.level, mark.code])).toEqual([[2, 5, "warn", "R17"], [10, 15, "block", "R16"]]);
  });

  it("ignore passes, checks without a place, and other fields", () => {
    const checks: Check[] = [check("R01", "ok", 0, 5), { code: "R02", level: "block", message: "x", field: "seoTitle" }, { code: "R03", level: "block", message: "x", field: "body", offset: 4 }, check("R04", "block", 4, 0)];
    expect(problemMarks(checks, 50)).toEqual([]);
  });

  it("cut overlapping problems and let a blocking one win", () => {
    const marks = problemMarks([check("R21", "warn", 0, 20), check("R16", "block", 8, 4)], 50);
    expect(marks.map(mark => [mark.from, mark.to, mark.level, mark.code])).toEqual([[0, 8, "warn", "R21"], [8, 12, "block", "R16"], [12, 20, "warn", "R21"]]);
  });

  it("keep the stretches inside the text", () => {
    expect(problemMarks([check("R16", "block", 40, 30)], 50).map(mark => [mark.from, mark.to])).toEqual([[40, 50]]);
    expect(problemMarks([check("R16", "block", 60, 5)], 50)).toEqual([]);
  });

  it("draw the text back in pieces that add up to the whole", () => {
    const text = "0123456789abcdefghij";
    const marks = problemMarks([check("R16", "block", 3, 4), check("R17", "warn", 12, 3)], text.length);
    const pieces = segments(text, marks);
    expect(pieces.map(piece => piece.text).join("")).toBe(text);
    expect(pieces.filter(piece => piece.mark).map(piece => piece.text)).toEqual(["3456", "cde"]);
  });

  it("give no pieces for an empty text and one plain piece when nothing is marked", () => {
    expect(segments("", [])).toEqual([]);
    expect(segments("abc", [])).toEqual([{ text: "abc" }]);
  });
});
