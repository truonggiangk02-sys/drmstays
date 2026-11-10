export type ImageSize = { width: number; height: number };

const be16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const be32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const le16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const le24 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));

/** EXIF orientation (1-8) from a JPEG APP1 segment starting at `start` (the "Exif\0\0" marker), or 1 when absent. */
function exifOrientation(b: Uint8Array, start: number, end: number): number {
  if (ascii(b, start, start + 4) !== "Exif") return 1;
  const tiff = start + 6;
  const little = b[tiff] === 0x49;
  const u16 = (i: number) => (little ? le16(b, i) : be16(b, i));
  const u32 = (i: number) => (little ? (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0 : be32(b, i));
  const ifd = tiff + u32(tiff + 4);
  if (ifd + 2 > end) return 1;
  const count = u16(ifd);
  for (let n = 0; n < count && ifd + 2 + n * 12 + 12 <= end; n++) {
    const entry = ifd + 2 + n * 12;
    if (u16(entry) === 0x0112) { const value = u16(entry + 8); return value >= 1 && value <= 8 ? value : 1; }
  }
  return 1;
}

function jpegSize(b: Uint8Array): ImageSize | null {
  let orientation = 1;
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    if (marker === 0xff) { i++; continue; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const length = be16(b, i + 2);
    if (marker === 0xe1 && orientation === 1) orientation = exifOrientation(b, i + 4, Math.min(b.length, i + 2 + length));
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (i + 9 > b.length) return null;
      const height = be16(b, i + 5), width = be16(b, i + 7);
      if (!width || !height) return null;
      // Browsers draw the photo the right way up, so a sideways-stored photo (orientation 5-8) shows with swapped sides.
      return orientation >= 5 ? { width: height, height: width } : { width, height };
    }
    i += 2 + length;
  }
  return null;
}

function pngSize(b: Uint8Array): ImageSize | null {
  if (b.length < 24 || ascii(b, 12, 16) !== "IHDR") return null;
  const width = be32(b, 16), height = be32(b, 20);
  return width && height ? { width, height } : null;
}

function webpSize(b: Uint8Array): ImageSize | null {
  const kind = ascii(b, 12, 16);
  let width = 0, height = 0;
  if (b.length < (kind === "VP8L" ? 25 : 30)) return null;
  if (kind === "VP8X") { width = 1 + le24(b, 24); height = 1 + le24(b, 27); }
  else if (kind === "VP8 ") { width = le16(b, 26) & 0x3fff; height = le16(b, 28) & 0x3fff; }
  else if (kind === "VP8L") {
    width = 1 + (((b[22] & 0x3f) << 8) | b[21]);
    height = 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6));
  }
  return width && height ? { width, height } : null;
}

/** Pixel size of a JPEG, PNG or WebP from its first bytes (no decoding). Returns null for anything it can't read. */
export function imageSize(bytes: Uint8Array): ImageSize | null {
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegSize(bytes);
    if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") return pngSize(bytes);
    if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return webpSize(bytes);
  } catch { /* truncated or malformed header */ }
  return null;
}
