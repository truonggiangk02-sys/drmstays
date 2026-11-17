import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { HOME_KEYS, HOME_SECTIONS, HOME_SLOTS, HOME_TEXT, getHomeContent, isHomeSlot } from "@/lib/home-content";
import { POST } from "@/app/api/admin/home/route";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { ORIGIN } from "./helpers/fixtures";

vi.mock("@/lib/admin", () => ({ isAdmin: async () => true, validOrigin: () => true }));
resetEnvBeforeEach();

describe("home content definitions", () => {
  it("every editable key has a default in both languages", () => {
    for (const key of HOME_KEYS) { expect(HOME_TEXT.vi).toHaveProperty(key); expect(HOME_TEXT.en).toHaveProperty(key); }
    expect(HOME_SECTIONS.flatMap(section => section.fields).length).toBe(HOME_KEYS.size);
  });
  it("knows its photo areas", () => {
    expect(isHomeSlot("home-hero")).toBe(true);
    expect(isHomeSlot("home-nothing")).toBe(false);
    expect(HOME_SLOTS["home-gallery"].max).toBeGreaterThan(1);
  });
});

describe("getHomeContent", () => {
  it("lays the owner's edits over the defaults and ignores unknown keys", async () => {
    const d1 = createD1([[/FROM home_texts/, { all: [{ key: "hero", value: "Tiêu đề mới" }, { key: "evil", value: "x" }, { key: "heroLead", value: "   " }] }]]);
    setEnv({ DB: d1.db });
    const home = await getHomeContent("vi");
    expect(home.text.hero).toBe("Tiêu đề mới");
    expect(home.text.heroLead).toBe(HOME_TEXT.vi.heroLead);
    expect(home.overrides).toEqual({ hero: "Tiêu đề mới" });
  });
  it("groups the home photos by area", async () => {
    const d1 = createD1([[/FROM catalog_images/, { all: [{ id: "a", owner_id: "home-hero", alt: "", width: 800, height: 600 }, { id: "b", owner_id: "home-gallery", alt: "x", width: null, height: null }, { id: "c", owner_id: "unknown", alt: "" }] }]]);
    setEnv({ DB: d1.db });
    const home = await getHomeContent("en");
    expect(home.images["home-hero"]).toEqual([{ id: "a", url: "/media/catalog/a", alt: "", width: 800, height: 600 }]);
    expect(home.images["home-gallery"]).toHaveLength(1);
    expect(home.images["home-intro"]).toEqual([]);
  });
  it("falls back to the defaults when the database is not ready", async () => {
    setEnv({ DB: { prepare: () => { throw new Error("no such table: home_texts"); } } });
    expect((await getHomeContent("vi")).text.hero).toBe(HOME_TEXT.vi.hero);
  });
});

describe("POST /api/admin/home", () => {
  it("saves changed text and removes fields that are empty or equal to the default", async () => {
    const d1 = createD1();
    setEnv({ DB: d1.db });
    const body = new URLSearchParams({ "hero.vi": "Tiêu đề mới", "hero.en": HOME_TEXT.en.hero, "heroLead.vi": "" });
    const response = await POST(new NextRequest(`${ORIGIN}/api/admin/home`, { method: "POST", headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded" }, body: body.toString() }));
    expect(response.status).toBe(303);
    expect(d1.sqlCalls(/INSERT INTO home_texts/).map(call => call.args)).toEqual([["hero", "vi", "Tiêu đề mới"]]);
    expect(d1.sqlCalls(/DELETE FROM home_texts/).length).toBeGreaterThan(10);
  });
});
