import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, validOrigin } from "@/lib/admin";
import { apartments } from "@/lib/apartments";
import { parseRoomInput } from "@/lib/room-input";
export async function POST(request: NextRequest) {
  if (!await isAdmin() || !validOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  if (!env.DB) return new NextResponse("Database unavailable", { status: 503 });
  const form = await request.formData();
  const id = Number(form.get("id"));
  const room = parseRoomInput(form);
  if (!room || !Number.isSafeInteger(id) || id < 1) return new NextResponse("Invalid listing", { status: 400 });
  if (!apartments.some(item => item.id === id)) {
    const custom = await env.DB.prepare("SELECT id FROM room_details WHERE id = ? AND is_custom = 1").bind(id).first();
    if (!custom) return new NextResponse("Room not found", { status: 404 });
  }
  await env.DB.batch([
    env.DB.prepare("INSERT INTO listing_overrides (id, name, building, price, monthly_price, usd_nightly, usd_monthly, description, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, building=excluded.building, price=excluded.price, monthly_price=excluded.monthly_price, usd_nightly=excluded.usd_nightly, usd_monthly=excluded.usd_monthly, description=excluded.description, active=excluded.active").bind(id, room.name, room.building, room.price, room.monthlyPrice, room.usdNightly, room.usdMonthly, room.description, room.active),
    env.DB.prepare("INSERT INTO room_details (id, amenities, sqm, beds, wifi, address, area, view, guests, available_units, is_custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET amenities=excluded.amenities, sqm=excluded.sqm, beds=excluded.beds, wifi=excluded.wifi, address=excluded.address, area=excluded.area, view=excluded.view, guests=excluded.guests, available_units=excluded.available_units").bind(id, JSON.stringify(room.amenities), room.sqm, room.beds, room.wifi, room.address, room.area, room.view, room.guests, room.availableUnits, id > 3 ? 1 : 0),
  ]);
  return NextResponse.redirect(new URL(`/admin/rooms?updated=${id}`, request.url), 303);
}
