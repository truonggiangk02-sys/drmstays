import { describe, expect, it } from "vitest";
import { NOT_COPIED, buildCopySource, copyableValues } from "@/lib/room-copy";

const saved = (price: number, details: object) => ({ monthly_price: price, details_json: JSON.stringify(details) });

describe("copyableValues", () => {
  it("maps saved details to the admin form's field names, joining lists with newlines", () => {
    const values = copyableValues(saved(9000000, {
      descriptionVi: "Mô tả", descriptionEn: "Desc", typeVi: "Studio", typeEn: "Studio",
      areaSqm: 28, beds: 1, bathrooms: 1, maxGuests: 2, depositVnd: 9000000, minStayMonths: 3,
      amenitiesVi: ["Máy lạnh", "Wi-Fi"], furnitureEn: ["Bed", "Desk"], rulesVi: "Không hút thuốc", serviceFeesEn: "Cleaning 200k",
    }));
    expect(values).toMatchObject({
      monthlyPrice: "9000000", descriptionVi: "Mô tả", typeEn: "Studio", areaSqm: "28", maxGuests: "2",
      depositVnd: "9000000", minStayMonths: "3", amenitiesVi: "Máy lạnh\nWi-Fi", furnitureEn: "Bed\nDesk",
      rulesVi: "Không hút thuốc", serviceFeesEn: "Cleaning 200k",
    });
  });

  it("uses empty strings for zero or missing values so a copy never writes 0", () => {
    const values = copyableValues(saved(0, { areaSqm: 0 }));
    expect(values.monthlyPrice).toBe("");
    expect(values.areaSqm).toBe("");
    expect(values.beds).toBe("");
    expect(values.amenitiesVi).toBe("");
  });

  it("survives broken JSON", () => {
    expect(copyableValues({ monthly_price: 5, details_json: "{nope" }).monthlyPrice).toBe("5");
  });

  it("never offers the floor or visibility", () => {
    const values = copyableValues(saved(1, { floor: "7", descriptionVi: "x" }));
    for (const field of NOT_COPIED) expect(Object.keys(values)).not.toContain(field);
  });
});

describe("buildCopySource", () => {
  const buildings = [
    { name: "AnLiu", rooms: [{ id: "r1", name: "P101" }, { id: "r2", name: "P102" }] },
    { name: "Do Ba", rooms: [{ id: "r3", name: "P201" }] },
  ];

  it("lists only rooms that have something saved, labelled with their building", () => {
    const rows = new Map([["r1", saved(8000000, { descriptionVi: "A" })], ["r3", saved(0, {})]]);
    const { options, data } = buildCopySource(buildings, rows);
    expect(options).toEqual([{ id: "r1", label: "AnLiu · P101" }]);
    expect(Object.keys(data)).toEqual(["r1"]);
  });

  it("returns nothing when no room is saved yet", () => {
    expect(buildCopySource(buildings, new Map())).toEqual({ options: [], data: {} });
  });
});
