import { NextRequest } from "next/server";
import { proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; memberUserId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, memberUserId } = await params;
  return proxyAuthPatch(
    req,
    `/api/families/${familyId}/members/${memberUserId}/status`,
  );
}
