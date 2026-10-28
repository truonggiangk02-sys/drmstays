import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/inquiries/route";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { NOW, ORIGIN, fakeApartment, stubTelegram, telegramEnv } from "./helpers/fixtures";

vi.mock("@/lib/data", () => ({ getApartmentForInquiry: vi.fn(async (id: number) => (id === 1 ? fakeApartment() : null)) }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: vi.fn(async () => true), maybePruneRateLimits: vi.fn(async () => {}) }));

resetEnvBeforeEach();

const validFields = { apartmentId: "1", guests: "2", name: "Linh", email: "Linh@Example.com", message: "Late arrival", checkIn: "2026-11-01", checkOut: "2026-11-05" };

function formRequest(fields: Record<string, string> = validFields, init: { headers?: Record<string, string> } = {}) {
  return new NextRequest(`${ORIGIN}/api/inquiries`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "9.9.9.9", ...init.headers },
    body: new URLSearchParams(fields).toString(),
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(consumeRateLimit).mockResolvedValue(true);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("POST /api/inquiries", () => {
  it("returns 503 without a database", async () => {
    expect((await POST(formRequest())).status).toBe(503);
  });

  describe("with a database", () => {
    let d1: ReturnType<typeof createD1>;
    beforeEach(() => {
      d1 = createD1([[/INSERT INTO inquiries/, { run: { meta: { last_row_id: 7 } } }]]);
      setEnv({ DB: d1.db });
    });

    it("rejects a missing or foreign origin with 403", async () => {
      expect((await POST(formRequest(validFields, { headers: { origin: "https://evil.test" } }))).status).toBe(403);
      const noOrigin = new NextRequest(`${ORIGIN}/api/inquiries`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "a=b" });
      expect((await POST(noOrigin)).status).toBe(403);
    });

    it("rejects non-form content types with 415", async () => {
      expect((await POST(formRequest(validFields, { headers: { "content-type": "application/json" } }))).status).toBe(415);
    });

    it("returns 429 when the IP limit is hit, before reading the body", async () => {
      vi.mocked(consumeRateLimit).mockResolvedValueOnce(false);
      const response = await POST(formRequest());
      expect(response.status).toBe(429);
      expect(consumeRateLimit).toHaveBeenCalledWith("email-ip", "9.9.9.9", 10);
      expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
    });

    it("skips the IP limit when there is no client IP (local dev)", async () => {
      const request = new NextRequest(`${ORIGIN}/api/inquiries`, {
        method: "POST", headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(validFields).toString(),
      });
      expect((await POST(request)).status).toBe(303);
      expect(consumeRateLimit).not.toHaveBeenCalledWith("email-ip", expect.anything(), expect.anything());
    });

    it("returns 413 when the body is too large", async () => {
      const response = await POST(formRequest({ ...validFields, message: "x".repeat(13000) }));
      expect(response.status).toBe(413);
    });

    it("returns 413 on an oversized content-length declaration", async () => {
      expect((await POST(formRequest(validFields, { headers: { "content-length": "999999" } }))).status).toBe(413);
    });

    it("silently redirects honeypot submissions without saving", async () => {
      const response = await POST(formRequest({ ...validFields, website: "http://spam.test" }));
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/thanks`);
      expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
    });

    it.each([
      ["unknown apartment", { apartmentId: "999" }],
      ["missing name", { name: "  " }],
      ["bad email", { email: "not-an-email" }],
      ["past check-in", { checkIn: "2026-10-01", checkOut: "2026-10-05" }],
      ["check-out before check-in", { checkIn: "2026-11-05", checkOut: "2026-11-01" }],
      ["too many guests", { guests: "9" }],
    ])("rejects %s with 400", async (_label, patch) => {
      const response = await POST(formRequest({ ...validFields, ...patch }));
      expect(response.status).toBe(400);
      expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
    });

    it("rejects inactive or sold-out rooms", async () => {
      const { getApartmentForInquiry } = await import("@/lib/data");
      vi.mocked(getApartmentForInquiry).mockResolvedValueOnce(fakeApartment({ availableUnits: 0 }));
      expect((await POST(formRequest())).status).toBe(400);
    });

    it("returns 429 when the same email is used too often", async () => {
      vi.mocked(consumeRateLimit).mockImplementation(async (scope) => scope !== "email-addr");
      const response = await POST(formRequest());
      expect(response.status).toBe(429);
      expect(consumeRateLimit).toHaveBeenCalledWith("email-addr", "linh@example.com", 3);
      expect(d1.sqlCalls(/INSERT INTO inquiries/)).toHaveLength(0);
    });

    it("saves the inquiry and redirects to /thanks without Telegram configured", async () => {
      const fetchMock = stubTelegram();
      const response = await POST(formRequest());
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/thanks`);
      const [insert] = d1.sqlCalls(/INSERT INTO inquiries/);
      expect(insert.args).toEqual([1, "Linh", "Linh@Example.com", "2026-11-01", "2026-11-05", 2, "Late arrival", "not_applicable", expect.any(String)]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("sends a Telegram alert and marks the inquiry as sent", async () => {
      setEnv({ DB: d1.db, ...telegramEnv });
      const fetchMock = stubTelegram();
      const response = await POST(formRequest());
      expect(response.status).toBe(303);
      expect(d1.sqlCalls(/INSERT INTO inquiries/)[0].args).toContain("pending");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe(`https://api.telegram.org/bot${telegramEnv.TELEGRAM_BOT_TOKEN}/sendMessage`);
      const sent = JSON.parse(String(init.body)) as { chat_id: string; text: string };
      expect(sent.chat_id).toBe(telegramEnv.TELEGRAM_CHAT_ID);
      expect(sent.text).toContain("Test Room");
      expect(sent.text).toContain("Linh@Example.com");
      const [update] = d1.sqlCalls(/UPDATE inquiries SET telegram_status/);
      expect(update.args).toEqual(["sent", 7]);
    });

    it("still redirects and records 'failed' when Telegram rejects the alert", async () => {
      setEnv({ DB: d1.db, ...telegramEnv });
      stubTelegram(false);
      vi.spyOn(console, "error").mockImplementation(() => {});
      const response = await POST(formRequest());
      expect(response.status).toBe(303);
      expect(d1.sqlCalls(/UPDATE inquiries SET telegram_status/)[0].args).toEqual(["failed", 7]);
    });
  });
});
