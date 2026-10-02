import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/session-cookie";

type RouteParams = { params: Promise<{ token: string }> };

/** Public emergency card behind a share link; no session needed. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    return NextResponse.json({ success: false, message: "Link not found" }, { status: 404 });
  }
  const res = await fetch(`${getBackendUrl()}/api/public/emergency/${encodeURIComponent(token)}`, { cache: "no-store" });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
