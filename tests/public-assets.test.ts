import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOGO_SIZE, OG_DEFAULT } from "@/lib/image-url";
import { imageSize } from "@/lib/image-size";

const file = (name: string) => join(__dirname, "..", "public", name);

// Every visitor downloads the logo, and the share picture is fetched by every chat app and social network, so both must stay small.
describe("public images", () => {
  it("keeps the logo small and matching LOGO_SIZE", () => {
    expect(statSync(file("drm-stay-logo.png")).size).toBeLessThan(100_000);
    expect(imageSize(new Uint8Array(readFileSync(file("drm-stay-logo.png"))))).toEqual({ width: LOGO_SIZE.width, height: LOGO_SIZE.height });
  });
  it("has a light 1200x630 share picture", () => {
    expect(statSync(file("og-default.jpg")).size).toBeLessThan(200_000);
    expect(imageSize(new Uint8Array(readFileSync(file("og-default.jpg"))))).toEqual({ width: OG_DEFAULT.width, height: OG_DEFAULT.height });
  });
});
