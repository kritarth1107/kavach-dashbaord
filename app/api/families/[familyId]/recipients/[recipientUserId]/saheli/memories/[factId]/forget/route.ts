import { NextRequest } from "next/server";
import { proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string; factId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, factId } = await params;
  return proxyAuthPost(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/memories/${factId}/forget`,
  );
}
