import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildPlan, normalise, scanFolder } from "../scripts/upload-photos.mjs";

let root = "";
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "photos-")); });
afterEach(() => rmSync(root, { recursive: true, force: true }));
const touch = (...parts: string[]) => { const path = join(root, ...parts); mkdirSync(join(path, ".."), { recursive: true }); writeFileSync(path, "x"); };

const index = {
  buildings: [
    { id: "b1", name: "AnLiu Apartment", photos: 0, floorplans: 0, rooms: [{ id: "r1", name: "301", photos: 0, floorplans: 0 }, { id: "r2", name: "Phòng Đẹp", photos: 2, floorplans: 0 }] },
    { id: "b2", name: "Sea View", photos: 0, floorplans: 0, rooms: [{ id: "r3", name: "301", photos: 0, floorplans: 0 }] },
  ],
};

describe("normalise", () => {
  it("ignores case, accents, spaces and punctuation", () => {
    expect(normalise("Phòng  Đẹp!")).toBe(normalise("phong-dep"));
    expect(normalise("An Liu")).toBe(normalise("anliu"));
  });
});

describe("scanFolder", () => {
  it("reads building photos, room photos and floor plans in natural name order, ignoring other files", () => {
    touch("AnLiu", "10.jpg"); touch("AnLiu", "2.jpg"); touch("AnLiu", "notes.txt");
    touch("AnLiu", "mat-bang", "plan.png");
    touch("AnLiu", "301", "a.webp"); touch("AnLiu", "301", "layout", "p.jpg");
    const groups = scanFolder(root).map((g: { room: string | null; category: string; files: string[] }) => ({ room: g.room, category: g.category, names: g.files.map((f) => f.split(/[\\/]/).at(-1)) }));
    expect(groups).toEqual([
      { room: null, category: "photo", names: ["2.jpg", "10.jpg"] },
      { room: null, category: "floorplan", names: ["plan.png"] },
      { room: "301", category: "photo", names: ["a.webp"] },
      { room: "301", category: "floorplan", names: ["p.jpg"] },
    ]);
  });
});

describe("buildPlan", () => {
  const plan = (files: [string, string, string?][], options = {}) => {
    for (const [building, name, room] of files) room ? touch(building, room, name) : touch(building, name);
    return buildPlan(scanFolder(root), index, options);
  };

  it("matches the same room name inside the right building", () => {
    const { plan: steps } = plan([["Sea View", "1.jpg", "301"], ["AnLiu Apartment", "1.jpg", "301"]]);
    expect(steps.map((s: { id: string }) => s.id).sort()).toEqual(["r1", "r3"]);
  });

  it("reports unknown buildings and rooms instead of guessing", () => {
    const { plan: steps, problems } = plan([["Nowhere", "1.jpg"], ["AnLiu Apartment", "1.jpg", "999"]]);
    expect(steps).toEqual([]);
    expect(problems).toHaveLength(2);
  });

  it("skips items that already have photos unless forced", () => {
    expect(plan([["AnLiu Apartment", "1.jpg", "phong dep"]]).plan[0].upload).toEqual([]);
    rmSync(root, { recursive: true, force: true }); root = mkdtempSync(join(tmpdir(), "photos-"));
    expect(plan([["AnLiu Apartment", "1.jpg", "phong dep"]], { force: true }).plan[0].upload).toHaveLength(1);
  });

  it("never plans more than 20 images per item", () => {
    const files = Array.from({ length: 25 }, (_, i) => ["AnLiu Apartment", `${i}.jpg`, "301"] as [string, string, string]);
    expect(plan(files).plan[0].upload).toHaveLength(20);
  });

  it("warns when two folders point at the same item", () => {
    const { plan: steps, problems } = plan([["AnLiu Apartment", "1.jpg"], ["An Liu apartment", "2.jpg"]]);
    expect(steps).toHaveLength(1);
    expect(problems).toHaveLength(1);
  });
});
