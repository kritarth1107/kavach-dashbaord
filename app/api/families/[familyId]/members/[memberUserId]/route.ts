import { NextRequest } from "next/server";
import { proxyAuthDelete, proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; memberUserId: string }>;
};

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, memberUserId } = await params;
  return proxyAuthDelete(req, `/api/families/${familyId}/members/${memberUserId}`);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, memberUserId } = await params;
  return proxyAuthPatch(req, `/api/families/${familyId}/members/${memberUserId}`);
}
