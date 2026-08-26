import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { getBackendUrl } from "@/lib/session-cookie";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string; documentId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, documentId } = await params;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  const res = await fetch(
    `${getBackendUrl()}/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}/download`,
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
    },
  });
}
