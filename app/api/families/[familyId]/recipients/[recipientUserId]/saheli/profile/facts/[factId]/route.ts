import { NextRequest } from "next/server";
import { proxyAuthDelete, proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; recipientUserId: string; factId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, factId } = await params;
  return proxyAuthPatch(req, `/api/families/${familyId}/recipients/${recipientUserId}/saheli/profile/facts/${encodeURIComponent(factId)}`);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, factId } = await params;
  return proxyAuthDelete(req, `/api/families/${familyId}/recipients/${recipientUserId}/saheli/profile/facts/${encodeURIComponent(factId)}`);
}
