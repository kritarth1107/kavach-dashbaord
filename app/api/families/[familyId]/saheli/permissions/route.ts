import { NextRequest } from "next/server";
import { proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId } = await params;
  const rid = req.nextUrl.searchParams.get("recipientUserId");
  return proxyAuthPatch(req, `/api/families/${familyId}/saheli/permissions${rid ? `?recipientUserId=${encodeURIComponent(rid)}` : ""}`);
}
