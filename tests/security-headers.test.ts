import { afterEach, describe, expect, it, vi } from "vitest";
import config from "@/next.config";

afterEach(() => vi.unstubAllEnvs());

const OLD_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com https://tile.openstreetmap.org https://*.tile.openstreetmap.fr https://server.arcgisonline.com https://www.google-analytics.com https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://cloudflareinsights.com; frame-src https://www.google.com; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'";

async function rules() {
  vi.stubEnv("NODE_ENV", "production");
  return config.headers!();
}
const value = (headers: Array<{ key: string; value: string }>, key: string) => headers.find(header => header.key === key)?.value;

describe("security headers", () => {
  it("keep the site-wide policy exactly as it was", async () => {
    const [all] = await rules();
    expect(all.source).toBe("/:path*");
    expect(value(all.headers, "Content-Security-Policy")).toBe(OLD_CSP);
    expect(value(all.headers, "X-Frame-Options")).toBe("DENY");
  });

  it("let only two admin pages frame anything: the editor frames the preview, the preview may be framed by the site itself", async () => {
    const found = await rules();
    expect(found.map(rule => rule.source)).toEqual(["/:path*", "/admin/journal/edit", "/admin/journal/preview"]);
    const [, edit, preview] = found;
    expect(value(edit.headers, "Content-Security-Policy")).toBe(OLD_CSP.replace("frame-src https://www.google.com", "frame-src 'self' https://www.google.com"));
    expect(value(edit.headers, "X-Frame-Options")).toBe("DENY");
    expect(value(preview.headers, "Content-Security-Policy")).toBe(OLD_CSP.replace("frame-ancestors 'none'", "frame-ancestors 'self'"));
    expect(value(preview.headers, "X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("send nothing in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await config.headers!()).toEqual([]);
  });
});
