import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/catalog-inquiries/route";
import { getPublicCatalog } from "@/lib/public-catalog";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { NOW, ORIGIN, stubTelegram, telegramEnv } from "./helpers/fixtures";

const ROOM_ID = "33333333-3333-4333-8333-333333333333";
vi.mock("@/lib/public-catalog", () => ({
  getPublicCatalog: vi.fn(async () => ({ buildings: [{ id: "b1", name: "AnLiu", rooms: [{ id: "33333333-3333-4333-8333-333333333333", name: "Sea Suite" }] }] })),
}));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: vi.fn(async () => true), maybePruneRateLimits: vi.fn(async () => {}) }));

resetEnvBeforeEach();

const valid = { lang: "vi", sourceRoomId: ROOM_ID, name: "Linh", phone: "+84 912 345 678", email: "linh@example.com", checkIn: "2026-11-01", checkOut: "2026-11-05", message: "Hello" };

function formRequest(fields: Record<string, string> = valid, headers: Record<string, string> = {}) {
  return new NextRequest(`${ORIGIN}/api/catalog-inquiries`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "9.9.9.9", ...headers },
    body: new URLSearchParams(fields).toString(),
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(consumeRateLimit).mockResolvedValue(true);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("POST /api/catalog-inquiries", () => {
  it("returns 503 without a database", async () => {
    expect((await POST(formRequest())).status).toBe(503);
  });

  describe("with a database", () => {
    let d1: ReturnType<typeof createD1>;
    beforeEach(() => {
      d1 = createD1();
      setEnv({ DB: d1.db });
    });

    it("rejects a foreign origin with 403 and non-form content with 415", async () => {
      expect((await POST(formRequest(valid, { origin: "https://evil.test" }))).status).toBe(403);
      expect((await POST(formRequest(valid, { "content-type": "application/json" }))).status).toBe(415);
    });

    it("returns 429 on the IP limit before reading the body", async () => {
      vi.mocked(consumeRateLimit).mockResolvedValueOnce(false);
      expect((await POST(formRequest())).status).toBe(429);
      expect(consumeRateLimit).toHaveBeenCalledWith("catalog-ip", "9.9.9.9", 10);
      expect(d1.sqlCalls(/INSERT INTO catalog_inquiries/)).toHaveLength(0);
    });

    it("returns 413 when the body exceeds the limit", async () => {
      const response = await POST(formRequest({ ...valid, message: "x".repeat(11_000) }));
      expect(response.status).toBe(413);
    });

    it("silently redirects honeypot hits without saving", async () => {
      const response = await POST(formRequest({ ...valid, website: "spam.test" }));
      expect(response.status).toBe(303);
      expect(d1.sqlCalls(/INSERT INTO catalog_inquiries/)).toHaveLength(0);
    });

    it.each([
      ["missing name", { name: "" }],
      ["bad phone", { phone: "abc" }],
      ["bad email", { email: "nope" }],
      ["only one date", { checkOut: "" }],
      ["check-in in the past (Vietnam time)", { checkIn: "2026-10-27", checkOut: "2026-10-30" }],
      ["check-out before check-in", { checkIn: "2026-11-05", checkOut: "2026-11-01" }],
      ["more than 365 nights", { checkIn: "2026-11-01", checkOut: "2028-01-01" }],
      ["malformed room id", { sourceRoomId: "not a uuid" }],
    ])("returns 400 for %s", async (_label, patch) => {
      expect((await POST(formRequest({ ...valid, ...patch }))).status).toBe(400);
      expect(d1.sqlCalls(/INSERT INTO catalog_inquiries/)).toHaveLength(0);
    });

    it("returns 404 for a room that is not in the published catalog", async () => {
      const response = await POST(formRequest({ ...valid, sourceRoomId: "44444444-4444-4444-8444-444444444444" }));
      expect(response.status).toBe(404);
    });

    it("returns 503 when the catalog cannot be loaded", async () => {
      vi.mocked(getPublicCatalog).mockRejectedValueOnce(new Error("down"));
      expect((await POST(formRequest())).status).toBe(503);
    });

    it("returns 429 when the phone limit is hit", async () => {
      vi.mocked(consumeRateLimit).mockImplementation(async (scope) => scope !== "catalog-phone");
      expect((await POST(formRequest())).status).toBe(429);
      expect(consumeRateLimit).toHaveBeenCalledWith("catalog-phone", "84912345678", 5);
      expect(d1.sqlCalls(/INSERT INTO catalog_inquiries/)).toHaveLength(0);
    });

    it("saves, alerts Telegram, marks it sent and redirects to the room page", async () => {
      setEnv({ DB: d1.db, ...telegramEnv });
      const fetchMock = stubTelegram();
      const response = await POST(formRequest());
      expect(response.status).toBe(303);
      expect(new URL(response.headers.get("location")!).pathname).toBe(`/vi/rooms/${ROOM_ID}`);
      const insert = d1.sqlCalls(/INSERT INTO catalog_inquiries/)[0];
      expect(insert.args).toContain("pending");
      const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
      expect(body.text).toContain("Sea Suite");
      expect(body.text).toContain("+84 912 345 678");
      expect(d1.sqlCalls(/UPDATE catalog_inquiries SET telegram_status/)[0].args[0]).toBe("sent");
    });

    it("still redirects and records 'failed' when Telegram rejects the alert", async () => {
      setEnv({ DB: d1.db, ...telegramEnv });
      stubTelegram(false);
      vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await POST(formRequest());
      expect(response.status).toBe(303);
      expect(d1.sqlCalls(/UPDATE catalog_inquiries SET telegram_status/)[0].args[0]).toBe("failed");
    });

    it("saves without an alert when Telegram is not configured", async () => {
      const fetchMock = stubTelegram();
      const response = await POST(formRequest({ ...valid, sourceRoomId: "" }));
      expect(response.status).toBe(303);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/vi/contact");
      expect(d1.sqlCalls(/INSERT INTO catalog_inquiries/)[0].args).toContain("not_applicable");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("falls back to /thanks when no language is given", async () => {
      const { lang: _lang, ...withoutLang } = valid;
      void _lang;
      const response = await POST(formRequest(withoutLang));
      expect(new URL(response.headers.get("location")!).pathname).toBe("/thanks");
    });
  });
});
