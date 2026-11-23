import { describe, expect, it } from "vitest";
import { kindOf, lastChanged, metaDescription, opening, parseRate, priceRows, priceSummary, usd, vnd, type LongStayBuilding } from "@/lib/long-stay";

const buildings: LongStayBuilding[] = [
  { id: "b-anliu", name: "AnLiu Apartment", status: "open", updatedAt: "2026-11-10 02:00:00", types: [
    { id: "t-s2", name: "Studio 02", areaSqm: 28, maxGuests: 2, beds: 1, priceFrom: 13_000_000, depositVnd: 13_000_000, minStayMonths: 1, updatedAt: "2026-11-22 08:30:00", rooms: [{}] },
    { id: "t-1pn", name: "1-bedroom apartment", areaSqm: 35, maxGuests: 2, priceFrom: 15_000_000, minStayMonths: 1, rooms: [{}] },
  ], rooms: [] },
  { id: "b-doba", name: "Doraemon's Land - Do Ba", status: "open", types: [
    { id: "t-desk", name: "Studio with desk", areaSqm: 30, priceFrom: 11_000_000, depositVnd: 11_000_000, rooms: [{}] },
  ], rooms: [] },
  { id: "b-villa", name: "Fusion Villa 3BR and Pool", status: "open", types: [], rooms: [{ id: "r-v", name: "Fusion Villa 3BR", monthlyPrice: 130_000_000 }] },
  { id: "b-soon", name: "Doraemon's Land Le Thanh Nghi", status: "soon", types: [{ id: "t-x", name: "Studio", priceFrom: 9_000_000, rooms: [] }], rooms: [] },
];

describe("long-stay data", () => {
  it("names what a room is", () => {
    expect(kindOf("Studio 02")).toBe("studio");
    expect(kindOf("1-bedroom apartment")).toBe("one-bedroom");
    expect(kindOf("Căn hộ 1 PN")).toBe("one-bedroom");
    expect(kindOf("Fusion Villa 3BR")).toBe("other");
  });

  it("lists open buildings only, cheapest first, with links", () => {
    const rows = priceRows(buildings);
    expect(rows.map(row => row.name)).toEqual(["Studio with desk", "Studio 02", "1-bedroom apartment", "Fusion Villa 3BR"]);
    expect(rows[1]).toMatchObject({ href: "/en/types/t-s2", depositVnd: 13_000_000, areaSqm: 28 });
    expect(rows[3].href).toBe("/en/rooms/r-v");
  });

  it("summarises the lowest price of each kind", () => {
    expect(priceSummary(priceRows(buildings))).toMatchObject({ studio: 11_000_000, oneBedroom: 15_000_000, overall: 11_000_000, highest: 130_000_000, buildings: 3 });
  });

  it("writes the answer with the real numbers, and dollars only when a rate is set", () => {
    const rows = priceRows(buildings);
    expect(opening(rows, 0)).toBe("At DRM Stays in Da Nang, furnished studios from 11,000,000 VND and one-bedroom apartments from 15,000,000 VND per month, furnished, with a one-month minimum stay.");
    expect(opening(rows, 25_000)).toContain("11,000,000 VND (about USD 440)");
    expect(metaDescription(rows, 0)).toBe("Furnished apartments in Da Nang: studios from 11,000,000 VND, 1-bedroom from 15,000,000 VND per month. Deposit, electricity and what is included.");
    expect(metaDescription([], 0)).toBe("");
  });

  it("converts and formats money", () => {
    expect(vnd(11_000_000)).toBe("11,000,000 VND");
    expect(usd(11_000_000, 25_400)).toBe("about USD 430");
    expect(usd(11_000_000, 0)).toBe("");
    expect(parseRate("25,400")).toBe(25_400);
    expect(parseRate("abc")).toBe(0);
    expect(parseRate("12")).toBe(0);
  });

  it("finds the latest price change", () => {
    expect(lastChanged(buildings)).toBe("2026-11-22");
    expect(lastChanged([{ id: "x", name: "x", types: [], rooms: [] }])).toBe("");
  });
});
