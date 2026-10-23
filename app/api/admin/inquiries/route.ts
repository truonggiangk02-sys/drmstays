import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, validOrigin } from "@/lib/admin";
export async function POST(request: NextRequest) {
  if (!await isAdmin() || !validOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  if (!env.DB) return new NextResponse("Database unavailable", { status: 503 });
  const form = await request.formData();
  const id = Number(form.get("id")), status = String(form.get("status") || "");
  if (!Number.isInteger(id) || id < 1 || !["new", "contacted", "confirmed", "closed"].includes(status)) return new NextResponse("Invalid inquiry", { status: 400 });
  await env.DB.prepare("UPDATE inquiries SET status = ? WHERE id = ?").bind(status, id).run();
  return NextResponse.redirect(new URL("/admin/inquiries", request.url), 303);
}

