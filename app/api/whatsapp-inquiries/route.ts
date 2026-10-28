import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getApartments } from "@/lib/data";
import { validStay } from "@/lib/dates";
import { clientIp, readLimitedBody } from "@/lib/request";
import { consumeRateLimit, maybePruneRateLimits } from "@/lib/rate-limit";
import { sendTelegram, telegramConfigured } from "@/lib/telegram";

type Payload = {
  apartmentId?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  guests?: unknown;
  name?: unknown;
  phone?: unknown;
  website?: unknown;
  requestId?: unknown;
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

const MAX_BODY_BYTES = 4096;
const IP_LIMIT_PER_HOUR = 10;
const PHONE_LIMIT_PER_HOUR = 5;

export async function POST(request: NextRequest) {
  if (!env.DB) return jsonError("Inquiries are temporarily unavailable.", 503);
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return jsonError("Invalid request origin.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return jsonError("Invalid request format.", 415);

  const ip = clientIp(request);
  if (ip && !(await consumeRateLimit("wa-ip", ip, IP_LIMIT_PER_HOUR))) return jsonError("Too many inquiries. Please try again later.", 429);
  void maybePruneRateLimits();

  let payload: Payload;
  try {
    const body = await readLimitedBody(request, MAX_BODY_BYTES);
    if (!body) return jsonError("Request too large.", 413);
    payload = JSON.parse(new TextDecoder().decode(body)) as Payload;
  }
  catch { return jsonError("Invalid request body.", 400); }
  if (typeof payload !== "object" || payload === null) return jsonError("Invalid request body.", 400);
  if (payload.website) return NextResponse.json({ ok: true });

  const apartmentId = Number(payload.apartmentId);
  const guests = Number(payload.guests);
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const checkIn = String(payload.checkIn || "");
  const checkOut = String(payload.checkOut || "");
  const requestId = String(payload.requestId || "");
  const apartment = (await getApartments()).find((item) => item.id === apartmentId && item.active && item.availableUnits !== 0);
  const phoneDigits = phone.replace(/\D/g, "");
  if (!apartment || !name || name.length > 100 || !/^\+?[\d\s().-]{8,24}$/.test(phone) || phoneDigits.length < 8 || phoneDigits.length > 15 || !validStay({ checkIn, checkOut, guests, maxGuests: apartment.guests }) || !/^[0-9a-f-]{36}$/i.test(requestId)) return jsonError("Please check your dates and contact details.", 400);

  if (!telegramConfigured()) return jsonError("Direct inquiries are being configured. Please try again shortly.", 503);

  const guestPhoneCleaned = phone.startsWith("+") ? phoneDigits : phoneDigits.startsWith("0") ? `84${phoneDigits.slice(1)}` : phoneDigits;
  const message = `New Doraemon Land booking inquiry\n\nRoom: ${apartment.name}\nBuilding: ${apartment.building}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nGuests: ${guests}\nGuest: ${name}\nWhatsApp: ${phone}\n\nChat with guest: https://wa.me/${guestPhoneCleaned}\n👉 Click link above to chat with guest and send rate/deposit info.`;

  const existing = await env.DB.prepare("SELECT id, telegram_status, apartment_id, name, phone, check_in, check_out, guests FROM inquiries WHERE request_id = ?").bind(requestId).first<{ id: number; telegram_status: string; apartment_id: number; name: string; phone: string; check_in: string; check_out: string; guests: number }>();
  if (existing && (existing.apartment_id !== apartmentId || existing.name !== name || existing.phone !== phone || existing.check_in !== checkIn || existing.check_out !== checkOut || existing.guests !== guests)) return jsonError("Please start a new inquiry if you change your details.", 409);
  if (existing?.telegram_status === "sent") return NextResponse.json({ ok: true });

  if (!(await consumeRateLimit("wa-phone", phoneDigits, PHONE_LIMIT_PER_HOUR))) return jsonError("Too many inquiries. Please try again later.", 429);
  if (!existing) {
    await env.DB.prepare("INSERT INTO inquiries (apartment_id, name, email, phone, channel, request_id, telegram_status, check_in, check_out, guests, message, status, created_at) VALUES (?, ?, '', ?, 'whatsapp', ?, 'pending', ?, ?, ?, '', 'new', ?)").bind(apartmentId, name, phone, requestId, checkIn, checkOut, guests, new Date().toISOString()).run();
  }

  try {
    await sendTelegram(message);
  } catch (error) {
    console.error("Telegram alert failed", error instanceof Error ? error.name : "unknown error");
    await env.DB.prepare("UPDATE inquiries SET telegram_status = 'failed' WHERE request_id = ?").bind(requestId).run();
    return jsonError("The alert could not be delivered. Your details were saved; please try again shortly.", 502);
  }

  try {
    await env.DB.prepare("UPDATE inquiries SET telegram_status = 'sent' WHERE request_id = ?").bind(requestId).run();
  } catch {
    console.error("Telegram alert delivered, but inquiry status update failed");
  }

  return NextResponse.json({ ok: true });
}

