import { describe, expect, it } from "vitest";
import { readPage } from "../scripts/site-check.mjs";

const html = `<!doctype html><html lang="vi"><head><title>DRM Stays</title><meta name="description" content="Mô tả"><link rel="canonical" href="https://drmstays.vn/vi"></head>
<body><main><h1>Xin chào</h1><img src="/media/catalog/a" alt="Phòng" width="10" height="10"><img src="/b.png">
<a href="/vi/stays">Tòa</a><a href="https://drmstays.vn/vi/about#x">Về</a><a href="https://example.com">Ngoài</a><a href="/api/x">API</a></main></body></html>`;

describe("readPage", () => {
  it("reads title, description, canonical, language, headings and landmarks", () => {
    const page = readPage(html, "https://drmstays.vn");
    expect(page).toMatchObject({ title: "DRM Stays", description: "Mô tả", canonical: "https://drmstays.vn/vi", lang: "vi", h1: 1, main: true, noindex: false });
  });
  it("lists images with alt and size information", () => {
    expect(readPage(html, "https://drmstays.vn").imgs).toEqual([{ src: "/media/catalog/a", hasAlt: true, alt: "Phòng", sized: true }, { src: "/b.png", hasAlt: false, alt: undefined, sized: false }]);
  });
  it("keeps internal page links only", () => {
    expect(readPage(html, "https://drmstays.vn").internal).toEqual(["/vi/stays", "/vi/about"]);
  });
  it("spots a page that shows an error message to the visitor", () => {
    expect(readPage("<body>Danh sách hiện chưa sẵn sàng. Vui lòng thử lại sau.</body>", "https://x").soft).toEqual(["Danh sách hiện chưa sẵn sàng"]);
  });
});
