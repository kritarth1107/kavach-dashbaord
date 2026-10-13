import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/auth-proxy";

/** Public: join the waitlist (Kavach is invite-only for now). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { status, json } = await fetchBackend("/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "" },
    body: JSON.stringify(body),
  });
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store" } });
}
