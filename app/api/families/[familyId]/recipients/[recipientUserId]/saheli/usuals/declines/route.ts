import { NextRequest } from "next/server";
import { proxyAuthDelete } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; recipientUserId: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  const qs = req.nextUrl.searchParams.toString();
  return proxyAuthDelete(req, `/api/families/${familyId}/recipients/${recipientUserId}/saheli/usuals/declines${qs ? `?${qs}` : ""}`);
}
