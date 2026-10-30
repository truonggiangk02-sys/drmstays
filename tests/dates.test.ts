import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_STAY_NIGHTS, validDate, validDateRange, vietnamToday } from "@/lib/dates";

describe("validDate", () => {
  it("accepts real calendar dates", () => {
    expect(validDate("2026-10-28")).toBe(true);
    expect(validDate("2028-02-29")).toBe(true);
  });
  it.each(["2026-02-31", "2027-02-29", "2026-13-01", "2026-00-10", "2026-1-5", "26-10-28", "2026/10/28", "", "not a date"])("rejects %s", (value) => {
    expect(validDate(value)).toBe(false);
  });
});

describe("vietnamToday", () => {
  afterEach(() => vi.useRealTimers());
  it("uses Vietnam time (UTC+7), not UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T20:00:00Z"));
    expect(vietnamToday()).toBe("2026-10-29");
    vi.setSystemTime(new Date("2026-10-28T10:00:00Z"));
    expect(vietnamToday()).toBe("2026-10-28");
  });
});

describe("validDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T10:00:00Z")); // 2026-10-28 in Vietnam
  });
  afterEach(() => vi.useRealTimers());

  const range = (checkIn = "2026-11-01", checkOut = "2026-11-05") => validDateRange(checkIn, checkOut);

  it("accepts a normal stay", () => expect(range()).toBe(true));
  it("accepts check-in today (Vietnam time)", () => expect(range("2026-10-28", "2026-10-29")).toBe(true));
  it("rejects check-in in the past", () => expect(range("2026-10-27", "2026-10-30")).toBe(false));
  it("rejects zero or negative nights", () => {
    expect(range("2026-11-01", "2026-11-01")).toBe(false);
    expect(range("2026-11-01", "2026-10-31")).toBe(false);
  });
  it("rejects malformed or rolled-over dates", () => {
    expect(range("2026-02-31", "2026-03-05")).toBe(false);
    expect(range("2026-11-01", "soon")).toBe(false);
  });
  it("caps the stay length at MAX_STAY_NIGHTS", () => {
    expect(MAX_STAY_NIGHTS).toBe(365);
    expect(range("2026-11-01", "2027-11-01")).toBe(true);
    expect(range("2026-11-01", "2027-11-02")).toBe(false);
  });
});
