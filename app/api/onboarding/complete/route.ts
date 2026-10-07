import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/auth-proxy";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export const maxDuration = 180;

/** Setting everything up talks to the engine for every fact: allow up to 3 minutes. */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const { ok, status, json } = await fetchBackend(
    "/api/onboarding/complete",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-fingerprint": "N/A", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(await req.json()),
    },
    170_000,
  );
  return NextResponse.json(json, { status: ok ? status : status });
}
