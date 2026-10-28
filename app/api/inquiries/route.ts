import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getApartments } from "@/lib/data";
import { validStay } from "@/lib/dates";
import { clientIp, readLimitedBody } from "@/lib/request";
import { consumeRateLimit, maybePruneRateLimits } from "@/lib/rate-limit";
import { sendTelegram, telegramConfigured } from "@/lib/telegram";

const MAX_BODY_BYTES = 12000;
const IP_LIMIT_PER_HOUR = 10;
const EMAIL_LIMIT_PER_HOUR = 3;

export async function POST(request: NextRequest) {
  if (!env.DB) return new NextResponse("Booking requests are temporarily unavailable", { status: 503 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return new NextResponse("Invalid origin", { status: 403 });
  const contentType = request.headers.get("content-type") || "";
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(contentType)) return new NextResponse("Invalid request format", { status: 415 });

  const ip = clientIp(request);
  if (ip && !(await consumeRateLimit("email-ip", ip, IP_LIMIT_PER_HOUR))) return new NextResponse("Too many inquiries. Please try again later.", { status: 429 });
  void maybePruneRateLimits();

  const body = await readLimitedBody(request, MAX_BODY_BYTES);
  if (!body) return new NextResponse("Request too large", { status: 413 });
  let form: FormData;
  try { form = await new Response(new Blob([body]), { headers: { "content-type": contentType } }).formData(); }
  catch { return new NextResponse("Invalid request body", { status: 400 }); }

  if (form.get("website")) return NextResponse.redirect(new URL("/thanks", request.url), 303);
  const text = (key: string, max: number) => String(form.get(key) || "").trim().slice(0, max);
  const apartmentId = Number(form.get("apartmentId"));
  const guests = Number(form.get("guests"));
  const name = text("name", 100), email = text("email", 254), message = text("message", 1000);
  const checkIn = text("checkIn", 10), checkOut = text("checkOut", 10);
  const apartment = (await getApartments()).find(a => a.id === apartmentId && a.active && a.availableUnits !== 0);
  if (!apartment || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validStay({ checkIn, checkOut, guests, maxGuests: apartment.guests })) return new NextResponse("Please check your details and dates, then try again.", { status: 400 });

  if (!(await consumeRateLimit("email-addr", email.toLowerCase(), EMAIL_LIMIT_PER_HOUR))) return new NextResponse("Too many inquiries. Please try again later.", { status: 429 });

  const alert = telegramConfigured();
  const inserted = await env.DB.prepare("INSERT INTO inquiries (apartment_id, name, email, check_in, check_out, guests, message, status, telegram_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)").bind(apartmentId, name, email, checkIn, checkOut, guests, message, alert ? "pending" : "not_applicable", new Date().toISOString()).run();

  // The inquiry is already saved (and visible in the CMS), so an alert failure must not fail the guest's request.
  if (alert) {
    const id = inserted.meta.last_row_id;
    let status = "sent";
    try {
      await sendTelegram(`New Doraemon Land booking inquiry (email)\n\nRoom: ${apartment.name}\nBuilding: ${apartment.building}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nGuests: ${guests}\nGuest: ${name}\nEmail: ${email}${message ? `\nMessage: ${message}` : ""}\n\n👉 Reply to the guest by email to confirm availability and rates.`);
    } catch (error) {
      console.error("Telegram alert failed", error instanceof Error ? error.name : "unknown error");
      status = "failed";
    }
    try { await env.DB.prepare("UPDATE inquiries SET telegram_status = ? WHERE id = ?").bind(status, id).run(); }
    catch { console.error("Inquiry telegram status update failed"); }
  }
  return NextResponse.redirect(new URL("/thanks", request.url), 303);
}
