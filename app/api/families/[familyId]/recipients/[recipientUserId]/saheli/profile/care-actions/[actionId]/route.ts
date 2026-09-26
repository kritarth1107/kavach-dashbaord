import { NextRequest } from "next/server";
import { proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; recipientUserId: string; actionId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, actionId } = await params;
  return proxyAuthPatch(req, `/api/families/${familyId}/recipients/${recipientUserId}/saheli/profile/care-actions/${encodeURIComponent(actionId)}`);
}
