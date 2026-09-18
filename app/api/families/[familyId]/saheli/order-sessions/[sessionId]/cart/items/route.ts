import { NextRequest } from "next/server";
import { proxyAuthPatch, proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; sessionId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, sessionId } = await params;
  return proxyAuthPost(
    req,
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}/cart/items`,
  );
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, sessionId } = await params;
  return proxyAuthPatch(
    req,
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}/cart/items`,
  );
}
