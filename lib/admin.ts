import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
const cookieName = "__Host-doraemon_admin";
const lifetime = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();
async function signingKey() {
  const password = String(env.ADMIN_PASSWORD || "");
  if (!password) return null;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`Doraemon Land admin session:${password}`));
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
function hex(bytes: ArrayBuffer) { return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join(""); }
export async function createAdminSession() {
  const key = await signingKey();
  if (!key) throw new Error("Admin password is not configured");
  const payload = `${Math.floor(Date.now() / 1000) + lifetime}.${crypto.randomUUID()}`;
  const signature = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return { name: cookieName, value: `${payload}.${signature}`, options: { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", maxAge: lifetime } };
}
export async function isAdmin() {
  const value = (await cookies()).get(cookieName)?.value || "";
  const match = /^(\d{10})\.([0-9a-f-]{36})\.([0-9a-f]{64})$/.exec(value);
  const now = Math.floor(Date.now() / 1000);
  if (!match || Number(match[1]) < now || Number(match[1]) > now + lifetime) return false;
  const key = await signingKey();
  if (!key) return false;
  const payload = `${match[1]}.${match[2]}`;
  const signature = Uint8Array.from(match[3].match(/.{2}/g)!, byte => parseInt(byte, 16));
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(payload));
}
export function clearAdminSession(response: { cookies: { set: (name: string, value: string, options: { httpOnly: boolean; secure: boolean; sameSite: "strict"; path: string; maxAge: number }) => void } }) {
  response.cookies.set(cookieName, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
}
export function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
