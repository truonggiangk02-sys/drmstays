import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, validOrigin } from "@/lib/admin";
import { parseRoomInput } from "@/lib/room-input";

export async function POST(request: NextRequest) {
  if (!await isAdmin() || !validOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  if (!env.DB) return new NextResponse("Database unavailable", { status: 503 });
  if (Number(request.headers.get("content-length") || 0) > 1_400_000) return new NextResponse("Request too large", { status: 413 });
  const form = await request.formData();
  const room = parseRoomInput(form);
  if (!room) return new NextResponse("Invalid room details", { status: 400 });

  const file = form.get("image");
  let image: { mime: string; data: string; alt: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 900_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return new NextResponse("Use a JPG, PNG, or WebP image under 900 KB", { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid = file.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 : file.type === "image/png" ? bytes.slice(0, 4).join() === "137,80,78,71" : bytes.slice(0, 4).join() === "82,73,70,70" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!valid) return new NextResponse("Invalid image file", { status: 400 });
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.slice(i, i + 8192));
    image = { mime: file.type, data: btoa(binary), alt: String(form.get("imageAlt") || room.name).trim().slice(0, 120) || room.name };
  }

  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const existing = await env.DB.prepare("SELECT id FROM listing_overrides WHERE id = ?").bind(id).first();
  if (existing) return new NextResponse("Please retry creating the room", { status: 409 });
  const statements = [
    env.DB.prepare("INSERT INTO listing_overrides (id, name, building, price, monthly_price, usd_nightly, usd_monthly, description, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, room.name, room.building, room.price, room.monthlyPrice, room.usdNightly, room.usdMonthly, room.description, room.active),
    env.DB.prepare("INSERT INTO room_details (id, amenities, sqm, beds, wifi, address, area, view, guests, available_units, is_custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(id, JSON.stringify(room.amenities), room.sqm, room.beds, room.wifi, room.address, room.area, room.view, room.guests, room.availableUnits),
  ];
  if (image) statements.push(env.DB.prepare("INSERT INTO room_images (apartment_id, mime, image_data, alt, position) VALUES (?, ?, ?, ?, 0)").bind(id, image.mime, image.data, image.alt));
  await env.DB.batch(statements);
  return NextResponse.redirect(new URL(`/admin/rooms?created=${id}#room-${id}`, request.url), 303);
}
