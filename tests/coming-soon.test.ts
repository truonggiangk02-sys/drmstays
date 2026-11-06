import { describe, expect, it } from "vitest";
import { asComingSoonResponse, shouldShowComingSoon } from "@/lib/coming-soon";

const on = { COMING_SOON: "1" };
const show = (path: string, cookie: string | null = null, vars: { COMING_SOON?: string } = on) => shouldShowComingSoon(`https://drmstays.vn${path}`, cookie, vars);

describe("shouldShowComingSoon", () => {
  it("covers every public page while on", () => {
    for (const path of ["/", "/vi", "/en/stays", "/vi/rooms/abc", "/vi/privacy", "/stays", "/thanks"]) expect(show(path), path).toBe(true);
  });
  it("is off unless COMING_SOON is exactly 1", () => {
    for (const vars of [{}, { COMING_SOON: "0" }, { COMING_SOON: "true" }]) expect(show("/vi", null, vars)).toBe(false);
  });
  it("leaves admin, APIs, framework files and static files alone", () => {
    for (const path of ["/admin", "/admin/login", "/api/catalog-inquiries", "/_next/static/a.js", "/coming-soon", "/drm-stay-logo.png", "/robots.txt", "/sitemap.xml", "/favicon.svg"]) expect(show(path), path).toBe(false);
  });
  it("lets the signed-in owner preview the real site", () => {
    expect(show("/vi", "a=1; __Host-doraemon_admin=123.abc")).toBe(false);
    expect(show("/vi", "other=1")).toBe(true);
  });
});

describe("asComingSoonResponse", () => {
  it("answers 503 with Retry-After and noindex, keeping the body", async () => {
    const response = asComingSoonResponse(new Response("hello", { status: 200, headers: { "content-type": "text/html" } }));
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("86400");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("content-type")).toBe("text/html");
    expect(await response.text()).toBe("hello");
  });
});
