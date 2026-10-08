import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { getBackendUrl } from "@/lib/session-cookie";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string; documentId: string }>;
};

/** `?inline=1` opens the file in the page (previews) instead of downloading it. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, documentId } = await params;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const inline = req.nextUrl.searchParams.get("inline") === "1" ? "?inline=1" : "";

  const res = await fetch(
    `${getBackendUrl()}/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}/download${inline}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-fingerprint": "N/A",
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    let message = "Download failed";
    try {
      const json = JSON.parse(text) as { message?: string };
      message = json.message || message;
    } catch {
      message = text || message;
    }
    return NextResponse.json({ success: false, message }, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const disposition = res.headers.get("content-disposition");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      ...(disposition ? { "Content-Disposition": disposition } : {}),
      // A health file: the browser may keep it briefly for this person, never in a shared cache.
      "Cache-Control": "private, max-age=300",
    },
  });
}
