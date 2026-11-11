import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { alertOutage } from "@/lib/alerts";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createAdminSession } from "@/lib/admin";
import { POST } from "@/app/api/admin/inquiry-alerts/route";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { ORIGIN, stubTelegram, telegramEnv } from "./helpers/fixtures";

vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: vi.fn(async () => true), maybePruneRateLimits: vi.fn(async () => {}) }));
let cookieValue = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name.endsWith("doraemon_admin") && cookieValue ? { value: cookieValue } : undefined) }),
}));

resetEnvBeforeEach();
beforeEach(() => { cookieValue = ""; vi.mocked(consumeRateLimit).mockResolvedValue(true); });
afterEach(() => vi.unstubAllGlobals());

describe("alertOutage", () => {
  it("does nothing without Telegram settings", async () => {
    const fetchMock = stubTelegram();
    expect(await alertOutage("catalog", "down")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends once, then stays quiet for the rest of the hour", async () => {
    setEnv(telegramEnv);
    const fetchMock = stubTelegram();
    expect(await alertOutage("catalog", "down")).toBe(true);
    vi.mocked(consumeRateLimit).mockResolvedValue(false);
    expect(await alertOutage("catalog", "down")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never throws when Telegram rejects the message", async () => {
    setEnv(telegramEnv);
    stubTelegram(false);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(alertOutage("catalog", "down")).resolves.toBe(false);
  });
});

describe("POST /api/admin/inquiry-alerts", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const call = (fields: Record<string, string>, headers: Record<string, string> = { origin: ORIGIN }) =>
    POST(new NextRequest(`${ORIGIN}/api/admin/inquiry-alerts`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", ...headers }, body: new URLSearchParams(fields).toString() }));
  let d1: ReturnType<typeof createD1>;
  beforeEach(async () => {
    d1 = createD1([[/FROM catalog_inquiries/, { first: { id, name: "Mai", phone: "0912345678", email: "", message: "Hi", check_in: "2026-11-01", check_out: "2026-11-05", telegram_status: "failed" } }]]);
    setEnv({ DB: d1.db, ADMIN_PASSWORD: "correct horse battery staple", ...telegramEnv });
    cookieValue = (await createAdminSession()).value;
  });

  it("refuses visitors", async () => {
    cookieValue = "";
    expect((await call({ kind: "catalog", id })).status).toBe(403);
  });

  it("re-sends the alert and records the result", async () => {
    const fetchMock = stubTelegram();
    const response = await call({ kind: "catalog", id });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("alert=sent");
    expect(String((fetchMock.mock.calls[0] as unknown[][])[1] && JSON.stringify((fetchMock.mock.calls[0] as unknown[][])[1]))).toContain("Mai");
    expect(d1.sqlCalls(/UPDATE catalog_inquiries SET telegram_status/)[0].args).toEqual(["sent", id]);
  });

  it("keeps the status failed when Telegram still rejects", async () => {
    stubTelegram(false);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await call({ kind: "catalog", id });
    expect(response.headers.get("location")).toContain("alert=failed");
    expect(d1.sqlCalls(/UPDATE catalog_inquiries SET telegram_status/)[0].args[0]).toBe("failed");
  });

  it("rejects an unknown kind and a bad id", async () => {
    expect((await call({ kind: "other", id })).status).toBe(400);
    expect((await call({ kind: "catalog", id: "x" })).status).toBe(400);
  });
});
