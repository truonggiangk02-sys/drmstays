import { describe, expect, it } from "vitest";
import { checkSiteUrl, willBeIndexable } from "../scripts/site-url-check.mjs";

describe("checkSiteUrl", () => {
  it("refuses a missing SITE_URL and says what is lost", () => {
    const { errors } = checkSiteUrl("", {});
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/canonical/);
    expect(errors[0]).toMatch(/ALLOW_MISSING_SITE_URL=1/);
  });
  it("lets you skip the check on purpose", () => expect(checkSiteUrl(undefined, { ALLOW_MISSING_SITE_URL: "1" }).errors).toEqual([]));
  it("accepts an https origin, with or without a trailing slash", () => {
    expect(checkSiteUrl("https://drmstays.vn", {})).toMatchObject({ origin: "https://drmstays.vn", errors: [] });
    expect(checkSiteUrl("https://drmstays.vn/", {}).origin).toBe("https://drmstays.vn");
  });
  it("rejects http (except local), paths and junk", () => {
    expect(checkSiteUrl("http://drmstays.vn", {}).errors[0]).toMatch(/https/);
    expect(checkSiteUrl("http://localhost:8787", {}).errors).toEqual([]);
    expect(checkSiteUrl("https://drmstays.vn/vi", {}).errors[0]).toMatch(/without a path/);
    expect(checkSiteUrl("drmstays.vn", {}).errors[0]).toMatch(/not a valid/);
  });
});

describe("willBeIndexable", () => {
  it("is true only for a production address", () => {
    expect(willBeIndexable("https://drmstays.vn", {})).toBe(true);
    expect(willBeIndexable("https://drmstays.vn", { STAGING: "1" })).toBe(false);
    expect(willBeIndexable("https://drmstays.vn", { COMING_SOON: "1" })).toBe(false);
    expect(willBeIndexable("https://drmstays-staging.x.workers.dev", {})).toBe(false);
  });
});
