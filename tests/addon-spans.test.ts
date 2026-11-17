import { describe, expect, it } from "vitest";
import { addonSpans } from "@/lib/addon-spans";

describe("addonSpans", () => {
  it("alternates wide and medium tiles for six services", () => {
    expect(addonSpans(6)).toEqual([6, 3, 3, 3, 3, 6]);
  });
  it("always fills each row to 12 columns, whatever the count", () => {
    for (let count = 1; count <= 13; count++) {
      const spans = addonSpans(count);
      let row = 0;
      const rows: number[] = [];
      spans.forEach(span => { row += span; if (row >= 12) { rows.push(row); row = 0; } });
      expect(row, `count ${count}`).toBe(0);
      expect(rows.every(total => total === 12), `count ${count}`).toBe(true);
    }
  });
});
