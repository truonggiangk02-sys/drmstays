import { describe, expect, it } from "vitest";
import { SITE_AREAS, adminTargetFor } from "@/lib/admin-map";

describe("admin map", () => {
  it("only points at admin pages and content sections that exist", () => {
    const sections = ["about", "services", "partners", "journal", "faq", "reviews", "metrics"];
    for (const area of SITE_AREAS) for (const link of area.links) {
      expect(link.href).toMatch(/^\/admin\//);
      const hash = link.href.split("#")[1];
      if (hash) expect(sections).toContain(hash);
    }
  });

  it("finds the editor for a public page", () => {
    expect(adminTargetFor("/vi")?.href).toBe("/admin/home");
    expect(adminTargetFor("/en/about")?.href).toBe("/admin/content#about");
    expect(adminTargetFor("/vi/faq")?.href).toBe("/admin/content#faq");
    expect(adminTargetFor("/vi/contact")?.href).toBe("/admin/contact-channels");
    expect(adminTargetFor("/vi/stays")?.href).toBe("/admin/catalog");
    expect(adminTargetFor("/vi/buildings/11111111-1111-4111-8111-111111111111")?.href).toBe("/admin/catalog?b=11111111-1111-4111-8111-111111111111");
    expect(adminTargetFor("/vi/rooms/33333333-3333-4333-8333-333333333333")?.href).toBe("/admin/catalog");
  });

  it("offers nothing where the admin cannot edit, or outside the site", () => {
    expect(adminTargetFor("/vi/privacy")).toBeNull();
    expect(adminTargetFor("/admin/home")).toBeNull();
    expect(adminTargetFor("/")).toBeNull();
  });
});
