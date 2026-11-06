import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "@/lib/canonical-host";

const vars = { SITE_URL: "https://drmstays.vn", REDIRECT_HOSTS: "www.drmstays.vn, drmstays.com ,www.drmstays.com" };

describe("canonicalRedirect", () => {
  it("sends other domains to the main address, keeping path and query", () => {
    const response = canonicalRedirect("https://www.drmstays.com/vi/stays?checkIn=2026-11-01", vars)!;
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://drmstays.vn/vi/stays?checkIn=2026-11-01");
  });
  it("matches hosts case-insensitively", () => {
    expect(canonicalRedirect("https://DRMStays.com/", vars)?.headers.get("location")).toBe("https://drmstays.vn/");
  });
  it("leaves the main domain, workers.dev and localhost alone", () => {
    for (const url of ["https://drmstays.vn/vi", "https://drmstays.xyz.workers.dev/vi", "http://localhost:8799/vi"]) expect(canonicalRedirect(url, vars)).toBeNull();
  });
  it("does nothing unless both SITE_URL and REDIRECT_HOSTS are set", () => {
    expect(canonicalRedirect("https://www.drmstays.vn/", { SITE_URL: "https://drmstays.vn" })).toBeNull();
    expect(canonicalRedirect("https://www.drmstays.vn/", { REDIRECT_HOSTS: "www.drmstays.vn" })).toBeNull();
    expect(canonicalRedirect("https://www.drmstays.vn/", { SITE_URL: "not a url", REDIRECT_HOSTS: "www.drmstays.vn" })).toBeNull();
  });
});
