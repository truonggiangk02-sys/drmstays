import { vi } from "vitest";
import type { Apartment } from "@/lib/apartments";

export const ORIGIN = "https://doraemon.test";
/** "Today" for tests that go through validStay (Vietnam time is UTC+7, so this is 2026-10-28 there). */
export const NOW = new Date("2026-10-28T10:00:00Z");

export function fakeApartment(overrides: Partial<Apartment> = {}): Apartment {
  return {
    id: 1, slug: "test-room", name: "Test Room", building: "Test Building", address: "1 Test St", area: "My Khe",
    view: "Sea", guests: 4, beds: "1 king", sqm: 40, price: 1000000, monthlyPrice: 20000000, usdNightly: 40, usdMonthly: 800,
    image: "/x.jpg", imageDescription: "x", description: "A room", amenities: [], wifi: "Fast", images: [],
    active: true, availableUnits: 1, ...overrides,
  };
}

/** Replaces global fetch with a Telegram stand-in. Pass ok=false to simulate Telegram rejecting the message. */
export function stubTelegram(ok = true) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok }), { status: ok ? 200 : 400 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export const telegramEnv = { TELEGRAM_BOT_TOKEN: "123456:ABC-def_ghi", TELEGRAM_CHAT_ID: "-1001" };
