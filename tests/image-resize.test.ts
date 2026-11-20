import { afterEach, describe, expect, it } from "vitest";
import { imgSize, photoSrcSet, resizedUrl } from "@/lib/image-url";

const g = globalThis as { __IMAGE_RESIZE__?: string };
afterEach(() => { delete g.__IMAGE_RESIZE__; });
const photo = { url: "/media/catalog/f3cd253e-a15e-4e8b-8cbe-f3397781a398", width: 1837, height: 2400 };

describe("resized catalog photos", () => {
  it("keeps the original file when resizing is off (staging, local builds)", () => {
    expect(photoSrcSet(photo)).toBeUndefined();
    expect(imgSize(photo)).toEqual({ width: 1837, height: 2400 });
  });

  it("offers Cloudflare-resized widths below the photo's own, plus the original", () => {
    g.__IMAGE_RESIZE__ = "1";
    expect(resizedUrl(photo.url, 800)).toBe("/cdn-cgi/image/width=800,quality=80,format=auto,fit=scale-down/media/catalog/f3cd253e-a15e-4e8b-8cbe-f3397781a398");
    const set = photoSrcSet(photo)!.split(", ");
    expect(set.map(entry => entry.split(" ")[1])).toEqual(["400w", "800w", "1200w", "1600w", "1837w"]);
    expect(imgSize(photo, "50vw")).toMatchObject({ width: 1837, height: 2400, sizes: "50vw" });
  });

  it("leaves other images (logo, outside photos) alone", () => {
    g.__IMAGE_RESIZE__ = "1";
    expect(photoSrcSet({ url: "/drm-stay-logo.png", width: 800 })).toBeUndefined();
    expect(photoSrcSet({ url: "https://images.unsplash.com/x.jpg", width: 3000 })).toBeUndefined();
    expect(photoSrcSet({ url: "/media/catalog/abc", width: 300 })).toBeUndefined();
  });
});
