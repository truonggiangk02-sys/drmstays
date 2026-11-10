import { describe, expect, it } from "vitest";
import { imageSize } from "@/lib/image-size";

const bytes = (...parts: (number | number[])[]) => new Uint8Array(parts.flat());
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n: number) => [(n >>> 8) & 255, n & 255];
const ascii = (s: string) => [...s].map(c => c.charCodeAt(0));

const png = (w: number, h: number) => bytes([137, 80, 78, 71, 13, 10, 26, 10], be32(13), ascii("IHDR"), be32(w), be32(h), [8, 2, 0, 0, 0]);
const sof = (w: number, h: number) => [0xff, 0xc0, ...be16(17), 8, ...be16(h), ...be16(w), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
const exif = (orientation: number) => [0xff, 0xe1, ...be16(2 + 6 + 8 + 2 + 12 + 4), ...ascii("Exif"), 0, 0, ...ascii("MM"), 0, 42, ...be32(8), ...be16(1), ...be16(0x0112), ...be16(3), ...be32(1), ...be16(orientation), 0, 0, ...be32(0)];
const jpeg = (w: number, h: number, ...before: number[][]) => bytes([0xff, 0xd8], before.flat(), sof(w, h));
const le = (n: number, size: number) => Array.from({ length: size }, (_, i) => (n >>> (8 * i)) & 255);
const riff = (chunk: string, body: number[]) => bytes(ascii("RIFF"), le(4 + 8 + body.length, 4), ascii("WEBP"), ascii(chunk), le(body.length, 4), body);

describe("imageSize", () => {
  it("reads PNG", () => expect(imageSize(png(1254, 836))).toEqual({ width: 1254, height: 836 }));
  it("reads JPEG, skipping other segments", () => {
    expect(imageSize(jpeg(4032, 3024, [0xff, 0xe0, ...be16(4), 0, 0]))).toEqual({ width: 4032, height: 3024 });
  });
  it("swaps the sides of a JPEG stored sideways (EXIF orientation 6)", () => {
    expect(imageSize(jpeg(4032, 3024, exif(6)))).toEqual({ width: 3024, height: 4032 });
    expect(imageSize(jpeg(4032, 3024, exif(1)))).toEqual({ width: 4032, height: 3024 });
  });
  it("reads WebP lossy, lossless and extended", () => {
    const lossy = [0, 0, 0, 0x9d, 0x01, 0x2a, ...le(800, 2), ...le(600, 2)];
    expect(imageSize(riff("VP8 ", lossy))).toEqual({ width: 800, height: 600 });
    const w = 1023, h = 767;
    const packed = (w - 1) | ((h - 1) << 14);
    expect(imageSize(riff("VP8L", [0x2f, ...le(packed >>> 0, 4)]))).toEqual({ width: w, height: h });
    expect(imageSize(riff("VP8X", [0, 0, 0, 0, ...le(1919, 3), ...le(1079, 3)]))).toEqual({ width: 1920, height: 1080 });
  });
  it("returns null for junk and truncated data", () => {
    expect(imageSize(bytes(1, 2, 3))).toBeNull();
    expect(imageSize(bytes(0xff, 0xd8, 0xff))).toBeNull();
    expect(imageSize(bytes([137, 80, 78, 71]))).toBeNull();
  });
});
