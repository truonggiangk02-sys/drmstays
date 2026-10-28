import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, validOrigin } from "@/lib/admin";

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  if (!env.DB || !env.ADMIN_PASSWORD) return new NextResponse("Admin login unavailable", { status: 503 });
  if (Number(request.headers.get("content-length") || 0) > 2048) return new NextResponse("Request too large", { status: 413 });
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip))), b => b.toString(16).padStart(2, "0")).join("");
  const bucket = Math.floor(Date.now() / 900000);
  const attempt = await env.DB.prepare("INSERT INTO inquiry_rate_limits (key, count) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count").bind(`${new Date().toISOString().slice(0, 13)}:admin-login:${bucket}:${hash}`).first<{ count: number }>();
  if (!attempt || attempt.count > 10) return NextResponse.redirect(new URL("/admin/login?error=limited", request.url), 303);
  const form = await request.formData();
  const candidate = String(form.get("password") || "");
  const expected = String(env.ADMIN_PASSWORD);
  const [candidateHash, expectedHash] = await Promise.all([crypto.subtle.digest("SHA-256", new TextEncoder().encode(candidate)), crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected))]);
  const a = new Uint8Array(candidateHash), b = new Uint8Array(expectedHash);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (difference !== 0) return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  const session = await createAdminSession();
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(session.name, session.value, session.options);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
