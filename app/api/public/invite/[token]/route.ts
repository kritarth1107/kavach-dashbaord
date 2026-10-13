import { NextRequest, NextResponse } from "next/server";
import { fetchBackend } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ token: string }> };

/** Public: what the join page shows for an invite link (who invited, still usable?). No session needed. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { token } = await params;
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (!/^[0-9A-Za-z]{20,40}$/.test(token)) {
    return NextResponse.json({ success: true, data: { state: "invalid", kind: null, inviterName: null, expiresAt: null, saheliNumber: "", whatsappLink: null } }, { headers });
  }
  const { status, json } = await fetchBackend(`/api/invites/lookup/${encodeURIComponent(token)}`, {
    cache: "no-store",
    headers: { "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "" },
  });
  return NextResponse.json(json, { status, headers });
}
