import { describe, expect, it } from "vitest";
import { balancedRows } from "@/lib/justified";

describe("balancedRows", () => {
  it("returns nothing for no photos", () => {
    expect(balancedRows([], 1000, 250)).toEqual([]);
  });

  it("keeps every photo exactly once, in order, with no empty row", () => {
    const ratios = [1.5, 0.75, 1.5, 1.33, 1.78, 0.8, 1.5, 1.5, 1.2, 1.5];
    const rows = balancedRows(ratios, 1300, 260);
    expect(rows.flat()).toEqual(ratios.map((_, index) => index));
    expect(rows.every(row => row.length > 0)).toBe(true);
  });

  it("makes rows of about the same total ratio, so the last row is not a single photo left over", () => {
    const ratios = Array.from({ length: 11 }, () => 1.5);
    const rows = balancedRows(ratios, 1300, 260);
    const sums = rows.map(row => row.reduce((sum, index) => sum + ratios[index], 0));
    expect(Math.max(...sums) - Math.min(...sums)).toBeLessThanOrEqual(1.5);
    expect(rows[rows.length - 1].length).toBeGreaterThan(1);
  });

  it("puts a single photo on one row", () => {
    expect(balancedRows([1.5], 1300, 260)).toEqual([[0]]);
  });
});
