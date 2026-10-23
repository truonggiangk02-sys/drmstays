import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession, validOrigin } from "@/lib/admin";
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  clearAdminSession(response);
  return response;
}
