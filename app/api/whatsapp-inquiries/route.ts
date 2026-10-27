import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getApartmentForInquiry } from "@/lib/data";
import { vietnamToday } from "@/lib/dates";

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

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(request: NextRequest) {
  if (!env.DB) return jsonError("Inquiries are temporarily unavailable.", 503);
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return jsonError("Invalid request origin.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return jsonError("Invalid request format.", 415);
  if (Number(request.headers.get("content-length") || 0) > 4096) return jsonError("Request too large.", 413);

  let payload: Payload;
  try {
    const reader = request.body?.getReader();
    if (!reader) return jsonError("Invalid request body.", 400);
    const decoder = new TextDecoder();
    let raw = "", bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) { await reader.cancel(); return jsonError("Request too large.", 413); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    payload = JSON.parse(raw) as Payload;
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
  const apartment = await getApartmentForInquiry(apartmentId);
  const phoneDigits = phone.replace(/\D/g, "");
  const today = vietnamToday();
  if (!apartment || !apartment.active || apartment.availableUnits === 0 || !name || name.length > 100 || !/^\+?[\d\s().-]{8,24}$/.test(phone) || phoneDigits.length < 8 || phoneDigits.length > 15 || !validDate(checkIn) || !validDate(checkOut) || checkIn < today || checkOut <= checkIn || (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000 > 365 || !Number.isInteger(guests) || guests < 1 || guests > apartment.guests || !/^[0-9a-f-]{36}$/i.test(requestId)) return jsonError("Please check your dates and contact details.", 400);

  const botToken = String(env.TELEGRAM_BOT_TOKEN || "");
  const chatId = String(env.TELEGRAM_CHAT_ID || "");
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(botToken) || !chatId) return jsonError("Direct inquiries are being configured. Please try again shortly.", 503);

  const guestPhoneCleaned = phone.startsWith("+") ? phoneDigits : phoneDigits.startsWith("0") ? `84${phoneDigits.slice(1)}` : phoneDigits;
  const message = `New Doraemon Land booking inquiry\n\nRoom: ${apartment.name}\nBuilding: ${apartment.building}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nGuests: ${guests}\nGuest: ${name}\nWhatsApp: ${phone}\n\nChat with guest: https://wa.me/${guestPhoneCleaned}\n👉 Click link above to chat with guest and send rate/deposit info.`;

  const existing = await env.DB.prepare("SELECT id, telegram_status, apartment_id, name, phone, check_in, check_out, guests FROM inquiries WHERE request_id = ?").bind(requestId).first<{ id: number; telegram_status: string; apartment_id: number; name: string; phone: string; check_in: string; check_out: string; guests: number }>();
  if (existing && (existing.apartment_id !== apartmentId || existing.name !== name || existing.phone !== phone || existing.check_in !== checkIn || existing.check_out !== checkOut || existing.guests !== guests)) return jsonError("Please start a new inquiry if you change your details.", 409);
  if (existing?.telegram_status === "sent") return NextResponse.json({ ok: true });

  const phoneHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(phoneDigits))), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const hour = new Date().toISOString().slice(0, 13);
  const key = `${hour}:${phoneHash}`;
  const limit = await env.DB.prepare("INSERT INTO inquiry_rate_limits (key, count) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count").bind(key).first<{ count: number }>();
  if (!limit || limit.count > 5) return jsonError("Too many inquiries. Please try again later.", 429);
  if (!existing) {
    await env.DB.prepare("INSERT INTO inquiries (apartment_id, name, email, phone, channel, request_id, telegram_status, check_in, check_out, guests, message, status, created_at) VALUES (?, ?, '', ?, 'whatsapp', ?, 'pending', ?, ?, ?, '', 'new', ?)").bind(apartmentId, name, phone, requestId, checkIn, checkOut, guests, new Date().toISOString()).run();
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json() as { ok?: boolean };
    if (!response.ok || !result.ok) throw new Error(`Telegram API returned ${response.status}`);
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

