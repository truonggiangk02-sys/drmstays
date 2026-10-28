import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/whatsapp-inquiries/route";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { NOW, ORIGIN, fakeApartment, stubTelegram, telegramEnv } from "./helpers/fixtures";

vi.mock("@/lib/data", () => ({ getApartments: vi.fn(async () => [fakeApartment()]) }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: vi.fn(async () => true), maybePruneRateLimits: vi.fn(async () => {}) }));

resetEnvBeforeEach();

const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";
const validPayload = { apartmentId: 1, checkIn: "2026-11-01", checkOut: "2026-11-05", guests: 2, name: "Linh", phone: "+84 90 123 4567", requestId: REQUEST_ID };

function jsonRequest(payload: unknown = validPayload, headers: Record<string, string> = {}) {
  return new NextRequest(`${ORIGIN}/api/whatsapp-inquiries`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", "cf-connecting-ip": "9.9.9.9", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}
const errorOf = async (response: Response) => (await response.json() as { error: string }).error;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(consumeRateLimit).mockResolvedValue(true);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("POST /api/whatsapp-inquiries", () => {
  it("returns 503 without a database", async () => {
    expect((await POST(jsonRequest())).status).toBe(503);
  });

  describe("with a database", () => {
    let d1: ReturnType<typeof createD1>;
    const useDb = (existing?: Record<string, unknown>) => {
      d1 = createD1([[/SELECT id, telegram_status/, { first: existing ?? null }]]);
      setEnv({ DB: d1.db, ...telegramEnv });
    };
    beforeEach(() => useDb());

    it("rejects a foreign origin with 403", async () => {
      expect((await POST(jsonRequest(validPayload, { origin: "https://evil.test" }))).status).toBe(403);
    });

    it("rejects non-JSON requests with 415", async () => {
      expect((await POST(jsonRequest(validPayload, { "content-type": "text/plain" }))).status).toBe(415);
    });

    it("returns 429 when the IP limit is hit", async () => {
      vi.mocked(consumeRateLimit).mockResolvedValueOnce(false);
      const response = await POST(jsonRequest());
      expect(response.status).toBe(429);
      expect(consumeRateLimit).toHaveBeenCalledWith("wa-ip", "9.9.9.9", 10);
    });

    it("returns 413 for an oversized body", async () => {
      const response = await POST(jsonRequest({ ...validPayload, name: "x".repeat(5000) }));
      expect(response.status).toBe(413);
    });

    it("returns 400 for malformed or non-object JSON", async () => {
      expect((await POST(jsonRequest("{nope"))).status).toBe(400);
      expect((await POST(jsonRequest("null"))).status).toBe(400);
    });

    it("pretends success for honeypot submissions without saving or alerting", async () => {
      const fetchMock = stubTelegram();
      const response = await POST(jsonRequest({ ...validPayload, website: "spam" }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ["unknown apartment", { apartmentId: 999 }],
      ["empty name", { name: "" }],
      ["over-long name", { name: "n".repeat(101) }],
      ["short phone", { phone: "12345" }],
      ["letters in phone", { phone: "call me maybe" }],
      ["past dates", { checkIn: "2026-10-01", checkOut: "2026-10-03" }],
      ["too many guests", { guests: 9 }],
      ["bad requestId", { requestId: "abc" }],
    ])("returns 400 for %s", async (_label, patch) => {
      const response = await POST(jsonRequest({ ...validPayload, ...patch }));
      expect(response.status).toBe(400);
      expect(await errorOf(response)).toBe("Please check your dates and contact details.");
      expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
    });

    it("returns 503 when Telegram is not configured, without saving", async () => {
      setEnv({ TELEGRAM_BOT_TOKEN: undefined, TELEGRAM_CHAT_ID: undefined });
      expect((await POST(jsonRequest())).status).toBe(503);
      expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
    });

    it("saves the inquiry, alerts Telegram with a wa.me link, and marks it sent", async () => {
      const fetchMock = stubTelegram();
      const response = await POST(jsonRequest());
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(consumeRateLimit).toHaveBeenCalledWith("wa-phone", "84901234567", 5);
      const [insert] = d1.sqlCalls(/INSERT INTO inquiries/);
      expect(insert.args).toEqual([1, "Linh", "+84 90 123 4567", REQUEST_ID, "2026-11-01", "2026-11-05", 2, expect.any(String)]);
      const sent = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { text: string };
      expect(sent.text).toContain("https://wa.me/84901234567");
      expect(d1.sqlCalls(/UPDATE inquiries SET telegram_status = 'sent'/)).toHaveLength(1);
    });

    it("normalises a local 0-prefixed number to the 84 country code", async () => {
      const fetchMock = stubTelegram();
      await POST(jsonRequest({ ...validPayload, phone: "090 123 4567" }));
      const sent = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { text: string };
      expect(sent.text).toContain("https://wa.me/84901234567");
    });

    it("returns 502 and marks the inquiry failed when Telegram rejects the alert", async () => {
      stubTelegram(false);
      vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await POST(jsonRequest());
      expect(response.status).toBe(502);
      expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(1);
      expect(d1.sqlCalls(/UPDATE inquiries SET telegram_status = 'failed'/)).toHaveLength(1);
    });

    it("returns 429 when the same phone is used too often", async () => {
      vi.mocked(consumeRateLimit).mockImplementation(async (scope) => scope !== "wa-phone");
      const fetchMock = stubTelegram();
      expect((await POST(jsonRequest())).status).toBe(429);
      expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    describe("retries with the same requestId", () => {
      const saved = { id: 5, telegram_status: "failed", apartment_id: 1, name: "Linh", phone: "+84 90 123 4567", check_in: "2026-11-01", check_out: "2026-11-05", guests: 2 };

      it("is idempotent once the alert was already sent", async () => {
        useDb({ ...saved, telegram_status: "sent" });
        const fetchMock = stubTelegram();
        const response = await POST(jsonRequest());
        expect(response.status).toBe(200);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
      });

      it("re-sends the alert without inserting a duplicate row after a failure", async () => {
        useDb(saved);
        const fetchMock = stubTelegram();
        expect((await POST(jsonRequest())).status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
        expect(d1.sqlCalls(/UPDATE inquiries SET telegram_status = 'sent'/)).toHaveLength(1);
      });

      it("returns 409 when the details changed under the same requestId", async () => {
        useDb(saved);
        const response = await POST(jsonRequest({ ...validPayload, guests: 3 }));
        expect(response.status).toBe(409);
      });
    });
  });
});
