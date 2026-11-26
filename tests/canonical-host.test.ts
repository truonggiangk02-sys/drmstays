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
  it("moves plain http on the main address to https, keeping path and query", () => {
    const response = canonicalRedirect("http://drmstays.vn/admin/login?error=invalid", vars)!;
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://drmstays.vn/admin/login?error=invalid");
    expect(canonicalRedirect("http://drmstays.vn/vi", { SITE_URL: "https://drmstays.vn" })?.headers.get("location")).toBe("https://drmstays.vn/vi");
  });
  it("leaves http alone when SITE_URL itself is http (local preview)", () => {
    expect(canonicalRedirect("http://127.0.0.1:8787/vi", { SITE_URL: "http://127.0.0.1:8787" })).toBeNull();
  });
  it("does not redirect other hosts unless REDIRECT_HOSTS lists them", () => {
    expect(canonicalRedirect("https://www.drmstays.vn/", { SITE_URL: "https://drmstays.vn" })).toBeNull();
    expect(canonicalRedirect("https://www.drmstays.vn/", { REDIRECT_HOSTS: "www.drmstays.vn" })).toBeNull();
    expect(canonicalRedirect("https://www.drmstays.vn/", { SITE_URL: "not a url", REDIRECT_HOSTS: "www.drmstays.vn" })).toBeNull();
  });
});
