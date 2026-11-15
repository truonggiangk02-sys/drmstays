import { describe, expect, it } from "vitest";
import { detailMonth, detailStatus, formatOpenMonth } from "@/lib/catalog-details";

describe("building status helpers", () => {
  it("defaults to open for anything unknown", () => {
    expect(detailStatus(undefined)).toBe("open");
    expect(detailStatus("closed")).toBe("open");
    expect(detailStatus("soon")).toBe("soon");
    expect(detailStatus("building")).toBe("building");
  });
  it("accepts only YYYY-MM months", () => {
    expect(detailMonth("2027-03")).toBe("2027-03");
    expect(detailMonth("2027-13")).toBe("");
    expect(detailMonth("03/2027")).toBe("");
    expect(detailMonth(5)).toBe("");
  });
  it("writes the month in each language", () => {
    expect(formatOpenMonth("2027-03", "vi")).toBe("tháng 3/2027");
    expect(formatOpenMonth("2027-03", "en")).toBe("March 2027");
    expect(formatOpenMonth("", "vi")).toBe("");
  });
});

import { buildingStatusLabel } from "@/lib/building-status";
describe("buildingStatusLabel", () => {
  it("is empty for an open building", () => {
    expect(buildingStatusLabel("open", "2027-03", "vi")).toBe("");
    expect(buildingStatusLabel(undefined, "", "en")).toBe("");
  });
  it("names the stage and the month", () => {
    expect(buildingStatusLabel("soon", "2027-03", "vi")).toBe("Sắp mở · tháng 3/2027");
    expect(buildingStatusLabel("building", "", "vi")).toBe("Đang hoàn thiện");
    expect(buildingStatusLabel("soon", "2027-03", "en")).toBe("Coming soon · March 2027");
  });
});
