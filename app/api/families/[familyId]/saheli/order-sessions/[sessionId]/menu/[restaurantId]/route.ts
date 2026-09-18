import { NextRequest } from "next/server";
import { proxyAuthGet } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; sessionId: string; restaurantId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, sessionId, restaurantId } = await params;
  return proxyAuthGet(
    req,
    `/api/families/${familyId}/saheli/order-sessions/${sessionId}/menu/${restaurantId}`,
  );
}
