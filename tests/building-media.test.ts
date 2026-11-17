import { describe, expect, it } from "vitest";
import { buildingCover, buildingFromPrice, buildingPhotos, buildingRoomCount } from "@/lib/building-media";

const photo = (url: string) => ({ url, alt: "" });

describe("building media", () => {
  const building = {
    images: [],
    types: [{ images: [photo("/t1"), photo("/t2")], priceFrom: 8_000_000, rooms: [{}, {}, {}] }],
    rooms: [{ monthlyPrice: 7_000_000, images: [photo("/r1"), photo("/t1")] }],
  };
  it("uses room type photos when the building has none of its own, without repeats", () => {
    expect(buildingPhotos(building).map(item => item.url)).toEqual(["/t1", "/t2", "/r1"]);
    expect(buildingPhotos({ ...building, images: [photo("/b")] })[0].url).toBe("/b");
  });
  it("takes the lowest price from types and rooms", () => {
    expect(buildingFromPrice(building)).toBe(7_000_000);
    expect(buildingFromPrice({ images: [], rooms: [] })).toBe(0);
  });
  it("counts rooms under types and on their own", () => { expect(buildingRoomCount(building)).toBe(4); });
});

describe("buildingPhotos and buildingCover for a building still being completed", () => {
  const p = (name: string) => ({ url: `/media/${name}`, alt: name });

  it("never lists 3D renders or progress photos among the building's photos", () => {
    expect(buildingPhotos({ images: [], types: [], rooms: [], renders: [p("render")], progressPhotos: [p("progress")] })).toEqual([]);
    expect(buildingPhotos({ images: [p("a")], types: [], rooms: [], renders: [p("render")], progressPhotos: [p("progress")] }).map(item => item.alt)).toEqual(["a"]);
  });

  it("uses a finished photo as the cover, else a 3D render, else a progress photo", () => {
    expect(buildingCover({ images: [p("a")], types: [], rooms: [], renders: [p("render")] })?.alt).toBe("a");
    expect(buildingCover({ images: [], types: [], rooms: [], renders: [p("render")], progressPhotos: [p("progress")] })?.alt).toBe("render");
    expect(buildingCover({ images: [], types: [], rooms: [], progressPhotos: [p("progress")] })?.alt).toBe("progress");
    expect(buildingCover({ images: [], types: [], rooms: [] })).toBeUndefined();
  });
});
