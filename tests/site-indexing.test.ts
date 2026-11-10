import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as robots } from "@/app/robots.txt/route";
import { indexingAllowed } from "@/lib/site";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

resetEnvBeforeEach();
const PROD = { SITE_URL: "https://drmstays.vn" };

describe("indexingAllowed", () => {
  it("allows only the production address", () => {
    expect(indexingAllowed("drmstays.vn", PROD)).toBe(true);
    expect(indexingAllowed("DRMSTAYS.VN:443", PROD)).toBe(true);
  });
  it("blocks staging however it is addressed", () => {
    expect(indexingAllowed("drmstays-staging.truonggiangk02.workers.dev", { SITE_URL: "https://drmstays-staging.truonggiangk02.workers.dev" })).toBe(false);
    expect(indexingAllowed("drmstays.vn", { ...PROD, STAGING: "1" })).toBe(false);
  });
  it("blocks the workers.dev address of the production Worker and any other host", () => {
    expect(indexingAllowed("drmstays.truonggiangk02.workers.dev", PROD)).toBe(false);
    expect(indexingAllowed("drmstays.com", PROD)).toBe(false);
    expect(indexingAllowed("www.drmstays.vn", PROD)).toBe(false);
  });
  it("blocks preview, coming-soon, local and unknown hosts", () => {
    expect(indexingAllowed("drmstays.vn", { ...PROD, PREVIEW_DEMO: "1" })).toBe(false);
    expect(indexingAllowed("drmstays.vn", { ...PROD, COMING_SOON: "1" })).toBe(false);
    for (const host of ["localhost:8787", "127.0.0.1:5173", "[::1]:8787", "", null, undefined]) expect(indexingAllowed(host, PROD), String(host)).toBe(false);
  });
  it("without SITE_URL any ordinary public host is allowed (the deploy check is what forces SITE_URL)", () => {
    expect(indexingAllowed("drmstays.vn", {})).toBe(true);
    expect(indexingAllowed("x.workers.dev", {})).toBe(false);
  });
  it("treats an invalid SITE_URL as unset", () => expect(indexingAllowed("drmstays.vn", { SITE_URL: "not a url" })).toBe(true));
});

const robotsFor = async (url: string) => (await robots(new NextRequest(url))).text();

describe("robots.txt in each mode", () => {
  it("open site: crawl everything except admin/api/thanks, and point at the sitemap", async () => {
    setEnv(PROD);
    const body = await robotsFor("https://drmstays.vn/robots.txt");
    expect(body).toBe("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /thanks\n\nSitemap: https://drmstays.vn/sitemap.xml\n");
    expect(body).not.toContain("Disallow: /media");
  });
  it("COMING_SOON=1: blocks everything", async () => {
    setEnv({ ...PROD, COMING_SOON: "1" });
    expect(await robotsFor("https://drmstays.vn/robots.txt")).toBe("User-agent: *\nDisallow: /\n");
  });
  it("staging: blocks everything", async () => {
    setEnv({ SITE_URL: "https://drmstays-staging.truonggiangk02.workers.dev", STAGING: "1" });
    expect(await robotsFor("https://drmstays-staging.truonggiangk02.workers.dev/robots.txt")).toBe("User-agent: *\nDisallow: /\n");
  });
  it("PREVIEW_DEMO=1: blocks everything", async () => {
    setEnv({ ...PROD, PREVIEW_DEMO: "1" });
    expect(await robotsFor("https://drmstays.vn/robots.txt")).toBe("User-agent: *\nDisallow: /\n");
  });
  it("the workers.dev address of production: blocks everything", async () => {
    setEnv(PROD);
    expect(await robotsFor("https://drmstays.truonggiangk02.workers.dev/robots.txt")).toBe("User-agent: *\nDisallow: /\n");
  });
});
