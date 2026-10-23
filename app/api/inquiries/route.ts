import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { getApartments } from "@/lib/data";

export async function POST(request: NextRequest) {
  if (!env.DB) return new NextResponse("Booking requests are temporarily unavailable", { status: 503 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return new NextResponse("Invalid origin", { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 12000) return new NextResponse("Request too large", { status: 413 });
  const form = await request.formData();
  if (form.get("website")) return NextResponse.redirect(new URL("/thanks", request.url), 303);
  const text = (key: string, max: number) => String(form.get(key) || "").trim().slice(0, max);
  const apartmentId = Number(form.get("apartmentId"));
  const guests = Number(form.get("guests"));
  const name = text("name", 100), email = text("email", 254), message = text("message", 1000);
  const checkIn = text("checkIn", 10), checkOut = text("checkOut", 10);
  const apartment = (await getApartments()).find(a => a.id === apartmentId && a.active && a.availableUnits !== 0);
  const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
  if (!apartment || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validDate(checkIn) || !validDate(checkOut) || checkIn < new Date().toISOString().slice(0,10) || checkOut <= checkIn || !Number.isInteger(guests) || guests < 1 || guests > apartment.guests) return new NextResponse("Please check your details and dates, then try again.", { status: 400 });
  await env.DB.prepare("INSERT INTO inquiries (apartment_id, name, email, check_in, check_out, guests, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)").bind(apartmentId, name, email, checkIn, checkOut, guests, message, new Date().toISOString()).run();
  return NextResponse.redirect(new URL("/thanks", request.url), 303);
}
