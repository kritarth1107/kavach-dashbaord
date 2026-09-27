import { NextRequest } from "next/server";
import { proxyAuthDelete } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; recipientUserId: string; whyId: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, whyId } = await params;
  return proxyAuthDelete(req, `/api/families/${familyId}/recipients/${recipientUserId}/saheli/why/${encodeURIComponent(whyId)}`);
}
