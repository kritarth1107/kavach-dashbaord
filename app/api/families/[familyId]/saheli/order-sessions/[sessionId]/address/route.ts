import { NextRequest } from "next/server";
import { proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; sessionId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, sessionId } = await params;
  return proxyAuthPatch(req, `/api/families/${familyId}/saheli/order-sessions/${sessionId}/address`);
}
