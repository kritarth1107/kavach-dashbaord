import { NextRequest } from "next/server";
import { proxyAuthDelete, proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; inviteId: string }>;
};

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, inviteId } = await params;
  return proxyAuthDelete(req, `/api/families/${familyId}/invitations/${inviteId}`);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, inviteId } = await params;
  return proxyAuthPatch(req, `/api/families/${familyId}/invitations/${inviteId}`);
}
