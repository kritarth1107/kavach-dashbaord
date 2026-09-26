import { NextRequest } from "next/server";
import { proxyAuthDelete } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; recipientUserId: string; id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, id } = await params;
  return proxyAuthDelete(req, `/api/families/${familyId}/recipients/${recipientUserId}/saheli/profile/deviations/${encodeURIComponent(id)}`);
}
