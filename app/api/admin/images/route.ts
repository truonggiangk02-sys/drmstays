import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, validOrigin } from "@/lib/admin";
import { apartments } from "@/lib/apartments";

export async function POST(request: NextRequest) {
  if (!await isAdmin() || !validOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  if (!env.DB) return new NextResponse("Database unavailable", { status: 503 });
  if (Number(request.headers.get("content-length") || 0) > 2_000_000) return new NextResponse("Image too large", { status: 413 });
  const form = await request.formData();
  const roomId = Number(form.get("roomId"));
  if (!Number.isSafeInteger(roomId) || roomId < 1) return new NextResponse("Invalid room", { status: 400 });
  if (!apartments.some(room => room.id === roomId)) {
    const custom = await env.DB.prepare("SELECT id FROM room_details WHERE id = ? AND is_custom = 1").bind(roomId).first();
    if (!custom) return new NextResponse("Invalid room", { status: 400 });
  }
  const action = String(form.get("action") || "upload");
  const imageId = Number(form.get("imageId"));
  if (action === "delete" || action === "up" || action === "down" || action === "cover") {
    const current = await env.DB.prepare("SELECT id, position, r2_key FROM room_images WHERE id = ? AND apartment_id = ?").bind(imageId, roomId).first<{ id: number; position: number; r2_key: string | null }>();
    if (!current) return new NextResponse("Image not found", { status: 404 });
    if (action === "delete") {
      await env.DB.prepare("DELETE FROM room_images WHERE id = ? AND apartment_id = ?").bind(imageId, roomId).run();
      if (current.r2_key) await env.BUCKET?.delete(current.r2_key);
    }
    else {
      const rows = await env.DB.prepare("SELECT id FROM room_images WHERE apartment_id = ? ORDER BY position, id").bind(roomId).all<{ id: number }>();
      const ids = (rows.results || []).map(row => row.id);
      const index = ids.indexOf(imageId);
      if (action === "cover") { ids.splice(index, 1); ids.unshift(imageId); }
      if (action === "up" && index > 0) [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
      if (action === "down" && index < ids.length - 1) [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
      await env.DB.batch(ids.map((id, position) => env.DB!.prepare("UPDATE room_images SET position = ? WHERE id = ? AND apartment_id = ?").bind(position, id, roomId)));
    }
  } else if (action === "upload") {
    const file = form.get("image");
    if (!(file instanceof File) || file.size < 1 || file.size > 900_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return new NextResponse("Use a JPG, PNG, or WebP image under 900 KB", { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid = file.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 : file.type === "image/png" ? bytes.slice(0, 4).join() === "137,80,78,71" : bytes.slice(0, 4).join() === "82,73,70,70" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!valid) return new NextResponse("Invalid image file", { status: 400 });
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM room_images WHERE apartment_id = ?").bind(roomId).first<{ total: number }>();
    if ((count?.total || 0) >= 12) return new NextResponse("Maximum 12 images per room", { status: 400 });
    const alt = String(form.get("alt") || "").trim().slice(0, 120);
    let imageData = "", r2Key: string | null = null;
    if (env.BUCKET) {
      r2Key = `rooms/${roomId}/${crypto.randomUUID()}`;
      await env.BUCKET.put(r2Key, bytes, { httpMetadata: { contentType: file.type } });
    } else {
      // No R2 binding: fall back to base64 in D1.
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.slice(i, i + 8192));
      imageData = btoa(binary);
    }
    try {
      await env.DB.prepare("INSERT INTO room_images (apartment_id, mime, image_data, alt, position, r2_key) VALUES (?, ?, ?, ?, ?, ?)").bind(roomId, file.type, imageData, alt, count?.total || 0, r2Key).run();
    } catch (error) {
      if (r2Key) await env.BUCKET?.delete(r2Key);
      throw error;
    }
  } else return new NextResponse("Invalid action", { status: 400 });
  return NextResponse.redirect(new URL(`/admin/rooms#room-${roomId}`, request.url), 303);
}

