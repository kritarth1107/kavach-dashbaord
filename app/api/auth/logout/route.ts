import { NextRequest } from "next/server";
import {
  clearSessionCookie,
  SESSION_COOKIE,
} from "@/lib/auth-proxy";
import { getBackendUrl } from "@/lib/session-cookie";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    await fetch(`${getBackendUrl()}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-fingerprint": "N/A",
      },
    }).catch(() => undefined);
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  return clearSessionCookie(response);
}
