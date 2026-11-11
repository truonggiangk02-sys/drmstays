import { describe, expect, it } from "vitest";
import { buildingFromPrice, buildingPhotos, buildingRoomCount } from "@/lib/building-media";

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
