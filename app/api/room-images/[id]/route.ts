import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imageId = Number(id);
  if (!Number.isInteger(imageId) || imageId < 1 || !env.DB) return new NextResponse("Not found", { status: 404 });
  const row = await env.DB.prepare("SELECT mime, image_data FROM room_images WHERE id = ?").bind(imageId).first<{ mime: string; image_data: string }>();
  if (!row) return new NextResponse("Not found", { status: 404 });
  const bytes = Uint8Array.from(atob(row.image_data), char => char.charCodeAt(0));
  return new NextResponse(bytes, { headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
