import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeRateLimit, hashKey, maybePruneRateLimits, pruneRateLimits } from "@/lib/rate-limit";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

resetEnvBeforeEach();

describe("hashKey", () => {
  it("is a stable SHA-256 hex digest", async () => {
    expect(await hashKey("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("consumeRateLimit", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-28T10:30:00Z")); });
  afterEach(() => vi.useRealTimers());

  it("allows everything when there is no database", async () => {
    expect(await consumeRateLimit("email-ip", "1.1.1.1", 1)).toBe(true);
  });
  it("allows hits up to the limit and rejects beyond it", async () => {
    let count = 0;
    const { db } = createD1([[/INSERT INTO inquiry_rate_limits/, () => ({ first: { count: ++count } })]]);
    setEnv({ DB: db });
    expect(await consumeRateLimit("s", "id", 2)).toBe(true);
    expect(await consumeRateLimit("s", "id", 2)).toBe(true);
    expect(await consumeRateLimit("s", "id", 2)).toBe(false);
  });
  it("keys by UTC hour, scope and hashed identity (never the raw identity)", async () => {
    const { db, calls } = createD1([[/INSERT INTO inquiry_rate_limits/, { first: { count: 1 } }]]);
    setEnv({ DB: db });
    await consumeRateLimit("email-addr", "guest@example.com", 3);
    const key = String(calls[0].args[0]);
    expect(key).toBe(`2026-10-28T10:email-addr:${await hashKey("guest@example.com")}`);
    expect(key).not.toContain("guest@example.com");
  });
  it("fails closed when the upsert returns no row", async () => {
    setEnv({ DB: createD1().db });
    expect(await consumeRateLimit("s", "id", 5)).toBe(false);
  });
});

describe("pruneRateLimits", () => {
  it("does nothing without a database", async () => {
    await expect(pruneRateLimits()).resolves.toBeUndefined();
  });
  it("deletes keys older than two hours before now", async () => {
    const { db, calls } = createD1();
    setEnv({ DB: db });
    await pruneRateLimits(new Date("2026-10-28T10:30:00Z"));
    expect(calls[0].sql).toMatch(/DELETE FROM inquiry_rate_limits WHERE key < \?/);
    expect(calls[0].args).toEqual(["2026-10-28T08"]);
  });
});

describe("maybePruneRateLimits", () => {
  it("usually skips the cleanup", async () => {
    const { db, calls } = createD1();
    setEnv({ DB: db });
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    await maybePruneRateLimits();
    expect(calls).toHaveLength(0);
  });
  it("runs the cleanup on a lucky roll", async () => {
    const { db, calls } = createD1();
    setEnv({ DB: db });
    vi.spyOn(Math, "random").mockReturnValue(0.001);
    await maybePruneRateLimits();
    expect(calls).toHaveLength(1);
  });
  it("swallows cleanup errors", async () => {
    setEnv({ DB: { prepare: () => { throw new Error("boom"); } } });
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(maybePruneRateLimits()).resolves.toBeUndefined();
  });
});
