import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFreshStaydeskCatalog, getStaydeskCatalog, resetStaydeskCache, usableStayDates } from "@/lib/staydesk-catalog";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { NOW } from "./helpers/fixtures";

resetEnvBeforeEach();

const catalog = { checkIn: null, checkOut: null, buildings: [{ id: "b1", name: "AnLiu", rooms: [] }] };
const MIN = 60_000;

function stubFetch(impl?: () => Promise<Response>) {
  const mock = vi.fn<(...args: unknown[]) => Promise<Response>>(impl ?? (async () => new Response(JSON.stringify(catalog), { status: 200 })));
  vi.stubGlobal("fetch", mock);
  return mock;
}
const calledUrl = (mock: ReturnType<typeof stubFetch>, n = 0) => new URL(String(mock.mock.calls[n][0]));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  resetStaydeskCache();
  setEnv({ STAYDESK_CATALOG_SECRET: "s".repeat(40), STAYDESK_CATALOG_URL: "https://staydesk.test" });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("catalog cache", () => {
  it("asks Staydesk once for many visits within a minute", async () => {
    const fetchMock = stubFetch();
    for (let i = 0; i < 25; i++) await getStaydeskCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks again after a minute", async () => {
    const fetchMock = stubFetch();
    await getStaydeskCatalog();
    vi.setSystemTime(NOW.getTime() + MIN + 1);
    await getStaydeskCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lets concurrent visitors share one request", async () => {
    const fetchMock = stubFetch();
    await Promise.all(Array.from({ length: 10 }, () => getStaydeskCatalog()));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a separate entry per date range", async () => {
    const fetchMock = stubFetch();
    await getStaydeskCatalog("2026-11-01", "2026-11-05");
    await getStaydeskCatalog("2026-11-02", "2026-11-05");
    await getStaydeskCatalog("2026-11-01", "2026-11-05");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(calledUrl(fetchMock).searchParams.get("checkIn")).toBe("2026-11-01");
  });

  it("keeps at most 100 entries, dropping the oldest", async () => {
    const fetchMock = stubFetch();
    const day = (n: number) => new Date(Date.parse("2026-11-01") + n * 86_400_000).toISOString().slice(0, 10);
    for (let i = 0; i < 101; i++) await getStaydeskCatalog(day(i), day(i + 1));
    expect(fetchMock).toHaveBeenCalledTimes(101);
    await getStaydeskCatalog(day(100), day(101));
    expect(fetchMock).toHaveBeenCalledTimes(101);
    await getStaydeskCatalog(day(0), day(1));
    expect(fetchMock).toHaveBeenCalledTimes(102);
  });
});

describe("when Staydesk is down", () => {
  it("serves the older copy for up to an hour", async () => {
    stubFetch();
    await getStaydeskCatalog();
    stubFetch(async () => new Response("no", { status: 500 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.setSystemTime(NOW.getTime() + 59 * MIN);
    expect(await getStaydeskCatalog()).toEqual(catalog);
    vi.setSystemTime(NOW.getTime() + 61 * MIN);
    await expect(getStaydeskCatalog()).rejects.toThrow();
  });

  it("does not cache errors or malformed answers", async () => {
    const bad = stubFetch(async () => new Response(JSON.stringify({ nope: true }), { status: 200 }));
    await expect(getStaydeskCatalog()).rejects.toThrow();
    expect(bad).toHaveBeenCalledTimes(1);
    const good = stubFetch();
    expect(await getStaydeskCatalog()).toEqual(catalog);
    expect(good).toHaveBeenCalledTimes(1);
  });
});

describe("fresh (admin)", () => {
  it("bypasses the cache, refreshes it and reports outages", async () => {
    const fetchMock = stubFetch();
    await getStaydeskCatalog();
    await getFreshStaydeskCatalog();
    await getFreshStaydeskCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    stubFetch(async () => new Response("no", { status: 500 }));
    await expect(getFreshStaydeskCatalog()).rejects.toThrow();
  });
});

describe("date window", () => {
  it.each([
    ["past", "2026-10-01", "2026-10-05"],
    ["reversed", "2026-11-05", "2026-11-01"],
    ["over 365 nights", "2026-11-01", "2027-12-01"],
    ["over 2 years ahead", "2029-01-01", "2029-01-03"],
    ["far future", "2999-01-01", "2999-01-03"],
    ["year 1900", "1900-01-01", "1900-01-03"],
    ["garbage", "abc", "def"],
  ])("does not forward %s dates", async (_name, a, b) => {
    const fetchMock = stubFetch();
    expect(usableStayDates(a, b)).toBeNull();
    await getStaydeskCatalog(a, b);
    expect(calledUrl(fetchMock).searchParams.has("checkIn")).toBe(false);
    await getStaydeskCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(1); // shares the dateless entry
  });

  it("forwards a normal stay", () => {
    expect(usableStayDates("2026-11-01", "2026-11-05")).toEqual({ checkIn: "2026-11-01", checkOut: "2026-11-05" });
  });
});

describe("setup", () => {
  it("is not hidden by the cache when the secret goes missing", async () => {
    stubFetch();
    await getStaydeskCatalog();
    setEnv({ STAYDESK_CATALOG_SECRET: "" });
    await expect(getStaydeskCatalog()).rejects.toThrow(/secret/);
  });

  it("refuses a non-HTTPS URL", async () => {
    const fetchMock = stubFetch();
    setEnv({ STAYDESK_CATALOG_URL: "http://staydesk.test" });
    await expect(getStaydeskCatalog()).rejects.toThrow(/HTTPS/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never fetches in demo mode", async () => {
    const fetchMock = stubFetch();
    setEnv({ PREVIEW_DEMO: "1" });
    expect((await getStaydeskCatalog()).buildings.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
