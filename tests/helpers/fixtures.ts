import { vi } from "vitest";

export const ORIGIN = "https://doraemon.test";
/** "Today" for tests that go through validDateRange (Vietnam time is UTC+7, so this is 2026-10-28 there). */
export const NOW = new Date("2026-10-28T10:00:00Z");

/** Replaces global fetch with a Telegram stand-in. Pass ok=false to simulate Telegram rejecting the message. */
export function stubTelegram(ok = true) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok }), { status: ok ? 200 : 400 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export const telegramEnv = { TELEGRAM_BOT_TOKEN: "123456:ABC-def_ghi", TELEGRAM_CHAT_ID: "-1001" };
