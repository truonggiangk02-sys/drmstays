import { describe, expect, it } from "vitest";
import { originAllowed } from "@/lib/origin";

const req = (url: string, headers: Record<string, string>) => ({ url, headers: new Headers(headers) });

describe("originAllowed", () => {
  it("accepts a matching Origin", () => {
    expect(originAllowed(req("https://drmstays.vn/api/admin/content", { origin: "https://drmstays.vn" }))).toBe(true);
  });
  it("falls back to the Referer when Origin is missing", () => {
    expect(originAllowed(req("https://drmstays.vn/api/admin/content", { referer: "https://drmstays.vn/admin/content" }))).toBe(true);
  });
  it("accepts the configured SITE_URL host when the Worker sees another address", () => {
    expect(originAllowed(req("http://internal.local/api/admin/content", { origin: "https://drmstays.vn" }), "https://drmstays.vn")).toBe(true);
  });
  it("accepts the Host header when a proxy changes the scheme", () => {
    expect(originAllowed(req("http://drmstays.vn/api/admin/content", { origin: "https://drmstays.vn", host: "drmstays.vn" }))).toBe(true);
  });
  it("refuses another site, a null Origin and a request with neither header", () => {
    expect(originAllowed(req("https://drmstays.vn/x", { origin: "https://evil.example" }), "https://drmstays.vn")).toBe(false);
    expect(originAllowed(req("https://drmstays.vn/x", { origin: "null", referer: "https://drmstays.vn/admin" }))).toBe(false);
    expect(originAllowed(req("https://drmstays.vn/x", {}))).toBe(false);
    expect(originAllowed(req("https://drmstays.vn/x", { referer: "https://evil.example/page" }))).toBe(false);
  });
});
