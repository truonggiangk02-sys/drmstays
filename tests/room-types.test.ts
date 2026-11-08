import { describe, expect, it } from "vitest";
import { availableCount, byRoomName, effectivePrice, priceFrom } from "@/lib/room-types";
import { typeProgress, typedRoomProgress } from "@/lib/catalog-progress";

describe("effectivePrice", () => {
  it("uses the room's own price, else the type's", () => {
    expect(effectivePrice(9_000_000, 8_000_000)).toBe(9_000_000);
    expect(effectivePrice(0, 8_000_000)).toBe(8_000_000);
  });
});

describe("priceFrom", () => {
  it("is the lowest positive room price, or 0", () => {
    expect(priceFrom([{ monthlyPrice: 9_000_000 }, { monthlyPrice: 8_000_000 }, { monthlyPrice: 0 }])).toBe(8_000_000);
    expect(priceFrom([{ monthlyPrice: 0 }])).toBe(0);
    expect(priceFrom([])).toBe(0);
  });
});

describe("availableCount", () => {
  it("counts free rooms, and is null when availability is unknown", () => {
    expect(availableCount([{ available: true }, { available: false }, { available: true }])).toBe(2);
    expect(availableCount([{ available: true }, { available: null }])).toBeNull();
    expect(availableCount([])).toBeNull();
  });
});

describe("byRoomName", () => {
  it("sorts room numbers naturally", () => {
    expect([{ name: "1205" }, { name: "301" }, { name: "302" }].sort(byRoomName).map(room => room.name)).toEqual(["301", "302", "1205"]);
  });
});

describe("progress for types and typed rooms", () => {
  it("lists what a type still needs", () => {
    const progress = typeProgress({ name_vi: "Studio", name_en: "", monthly_price: 0 }, {}, 0, 0);
    expect(progress.missing).toEqual(expect.arrayContaining(["Tên VI/EN", "Giá tháng", "Ảnh", "Có phòng"]));
  });
  it("a typed room only needs a floor and a price", () => {
    expect(typedRoomProgress("3", 8_000_000).missing).toEqual([]);
    expect(typedRoomProgress("", 0).missing).toEqual(["Tầng", "Giá"]);
  });
});
