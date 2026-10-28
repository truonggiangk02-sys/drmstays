import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/partner-inquiries/route";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { ORIGIN, stubTelegram, telegramEnv } from "./helpers/fixtures";

vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: vi.fn(async () => true), maybePruneRateLimits: vi.fn(async () => {}) }));

resetEnvBeforeEach();

const valid = { lang: "en", name: "Owner", phone: "0912345678", email: "o@example.com", property: "12 Do Ba", message: "Let's talk" };

function formRequest(fields: Record<string, string> = valid, headers: Record<string, string> = {}) {
  return new NextRequest(`${ORIGIN}/api/partner-inquiries`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "9.9.9.9", ...headers },
    body: new URLSearchParams(fields).toString(),
  });
}

beforeEach(() => { vi.mocked(consumeRateLimit).mockResolvedValue(true); });
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/partner-inquiries", () => {
  it("returns 503 without a database", async () => {
    expect((await POST(formRequest())).status).toBe(503);
  });

  describe("with a database", () => {
    let d1: ReturnType<typeof createD1>;
    beforeEach(() => { d1 = createD1(); setEnv({ DB: d1.db }); });

    it("rejects a foreign origin (403) and non-form content (415)", async () => {
      expect((await POST(formRequest(valid, { origin: "https://evil.test" }))).status).toBe(403);
      expect((await POST(formRequest(valid, { "content-type": "text/plain" }))).status).toBe(415);
    });

    it("returns 429 on the IP limit and 413 for an oversized body", async () => {
      vi.mocked(consumeRateLimit).mockResolvedValueOnce(false);
      expect((await POST(formRequest())).status).toBe(429);
      expect((await POST(formRequest({ ...valid, message: "x".repeat(11_000) }))).status).toBe(413);
    });

    it("redirects honeypot hits without saving", async () => {
      const response = await POST(formRequest({ ...valid, website: "spam" }));
      expect(response.status).toBe(303);
      expect(d1.sqlCalls(/INSERT INTO partner_inquiries/)).toHaveLength(0);
    });

    it.each([["missing name", { name: "" }], ["bad phone", { phone: "12" }], ["bad email", { email: "nope" }]])("returns 400 for %s", async (_label, patch) => {
      expect((await POST(formRequest({ ...valid, ...patch }))).status).toBe(400);
    });

    it("returns 429 when the phone limit is hit", async () => {
      vi.mocked(consumeRateLimit).mockImplementation(async (scope) => scope !== "partner-phone");
      expect((await POST(formRequest())).status).toBe(429);
    });

    it("saves, alerts Telegram and redirects to the partners page", async () => {
      setEnv({ DB: d1.db, ...telegramEnv });
      const fetchMock = stubTelegram();
      const response = await POST(formRequest());
      expect(response.status).toBe(303);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/en/partners");
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(d1.sqlCalls(/UPDATE partner_inquiries SET telegram_status/)[0].args[0]).toBe("sent");
    });

    it("records 'failed' but still redirects when Telegram rejects the alert", async () => {
      setEnv({ DB: d1.db, ...telegramEnv });
      stubTelegram(false);
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect((await POST(formRequest())).status).toBe(303);
      expect(d1.sqlCalls(/UPDATE partner_inquiries SET telegram_status/)[0].args[0]).toBe("failed");
    });

    it("saves with 'not_applicable' when Telegram is not configured", async () => {
      const response = await POST(formRequest());
      expect(response.status).toBe(303);
      expect(d1.sqlCalls(/INSERT INTO partner_inquiries/)[0].args).toContain("not_applicable");
    });
  });
});
