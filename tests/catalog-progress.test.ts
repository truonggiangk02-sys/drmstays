import { describe, expect, it } from "vitest";
import { buildingProgress, groupByFloor, roomProgress } from "@/lib/catalog-progress";

describe("roomProgress", () => {
  it("counts what is filled and names what is missing", () => {
    const empty = roomProgress(undefined, {}, 0);
    expect(empty.done).toBe(0);
    expect(empty.missing).toContain("Giá tháng");
    const full = roomProgress({ monthly_price: 9_000_000 }, { typeVi: "a", typeEn: "a", floor: "3", areaSqm: 25, beds: 1, bathrooms: 1, maxGuests: 2, descriptionVi: "x", descriptionEn: "x", furnitureVi: ["bed"], furnitureEn: ["bed"] }, 3);
    expect(full.done).toBe(full.total);
    expect(full.missing).toEqual([]);
  });
  it("needs both languages for bilingual items", () => {
    const progress = roomProgress({ monthly_price: 1 }, { descriptionVi: "chỉ có tiếng Việt" }, 1);
    expect(progress.missing).toContain("Mô tả VI/EN");
  });
});

describe("buildingProgress", () => {
  it("asks for coordinates and photos", () => {
    const progress = buildingProgress({ address: "12 A" }, { latitude: null, longitude: null }, 0);
    expect(progress.missing).toEqual(expect.arrayContaining(["Toạ độ", "Ảnh"]));
    expect(progress.missing).not.toContain("Địa chỉ");
  });
});

describe("groupByFloor", () => {
  it("orders floors naturally and puts rooms without a floor last", () => {
    const groups = groupByFloor([{ floor: "10", n: 1 }, { floor: "2", n: 2 }, { floor: "", n: 3 }, { floor: "2", n: 4 }]);
    expect(groups.map(group => group.floor)).toEqual(["2", "10", ""]);
    expect(groups[0].rooms.map(room => room.n)).toEqual([2, 4]);
  });
});
