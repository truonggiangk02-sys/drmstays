import { describe, expect, it } from "vitest";
import { analyticsIdFor } from "@/lib/analytics";

const live = { SITE_URL: "https://drmstays.vn", GA_MEASUREMENT_ID: "G-ABC123XYZ0" };

describe("analyticsIdFor", () => {
  it("returns the ID on the real site", () => expect(analyticsIdFor("drmstays.vn", live)).toBe("G-ABC123XYZ0"));
  it("returns nothing without an ID or with a malformed one", () => {
    expect(analyticsIdFor("drmstays.vn", { SITE_URL: live.SITE_URL })).toBeNull();
    for (const bad of ["", "UA-123456-1", "G-", "G-abc123xyz0", "G-ABC123'); alert(1);//", "<script>"])
      expect(analyticsIdFor("drmstays.vn", { ...live, GA_MEASUREMENT_ID: bad }), bad).toBeNull();
  });
  it("never measures staging, preview, coming-soon, workers.dev or localhost", () => {
    expect(analyticsIdFor("drmstays.vn", { ...live, STAGING: "1" })).toBeNull();
    expect(analyticsIdFor("drmstays.vn", { ...live, PREVIEW_DEMO: "1" })).toBeNull();
    expect(analyticsIdFor("drmstays.vn", { ...live, COMING_SOON: "1" })).toBeNull();
    expect(analyticsIdFor("drmstays.truonggiangk02.workers.dev", live)).toBeNull();
    expect(analyticsIdFor("127.0.0.1:8787", live)).toBeNull();
    expect(analyticsIdFor("www.drmstays.vn", live)).toBeNull();
  });
});
