import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Admin behaviour that was silently overwritten twice by merges from older branches. If one of these fails,
// a merge dropped it again: restore it, do not delete the test.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("admin behaviour that must survive merges", () => {
  it("saves admin forms in place", () => {
    expect(read("components/save-in-place.tsx")).toContain("getAttribute('action')");
    expect(read("app/(main)/admin/layout.tsx")).toContain("<SaveInPlace />");
    for (const page of ["catalog", "content", "home", "contact-channels", "locations"]) expect(read(`app/(main)/admin/${page}/page.tsx`)).toContain("data-save-in-place");
  });

  it("keys the catalog admin by the selected building, room and type", () => {
    expect(read("app/(main)/admin/catalog/page.tsx")).toMatch(/className="cx-main" key=\{/);
  });

  it("keeps each home editor section saving on its own", () => {
    expect(read("app/api/admin/home/route.ts")).toContain("form.has(");
    expect(read("app/(main)/admin/home/page.tsx")).toContain("hm-photos");
  });

  it("keeps the page-to-editor map (start page and the edit button on public pages)", () => {
    expect(read("app/[lang]/layout.tsx")).toContain("<AdminEditLink />");
    expect(read("app/(main)/admin/page.tsx")).toContain("SITE_AREAS");
  });

  it("keeps the confirmed wording", () => {
    expect(read("lib/home-content.ts")).toContain("Căn hộ đủ nội thất tại Đà Nẵng, kèm dịch vụ trọn gói.");
    expect(read("lib/site-content.ts")).toContain("800+");
  });
});
