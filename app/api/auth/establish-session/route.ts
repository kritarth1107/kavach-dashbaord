import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session-cookie";

export async function POST(req: NextRequest) {
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing) {
    return NextResponse.json({ success: true, source: "existing" });
  }

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    return NextResponse.json(
      { success: false, message: "Auth is not configured" },
      { status: 500 },
    );
  }

  const token = await getToken({
    req,
    secret: authSecret,
    secureCookie: sessionCookieOptions.secure,
  });

  const backendToken =
    typeof token?.backendToken === "string" ? token.backendToken : null;

  if (!backendToken) {
    return NextResponse.json(
      { success: false, message: "No session available" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true, source: "google" });
  response.cookies.set(SESSION_COOKIE, backendToken, sessionCookieOptions);
  return response;
}
