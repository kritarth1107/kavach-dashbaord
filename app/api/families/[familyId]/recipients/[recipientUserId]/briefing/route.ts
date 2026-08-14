import { NextRequest } from "next/server";
import { proxyAuthGet } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  return proxyAuthGet(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/briefing`,
  );
}
