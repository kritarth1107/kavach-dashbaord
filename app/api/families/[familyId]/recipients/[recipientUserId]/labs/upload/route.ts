import { NextRequest } from "next/server";
import { proxyAuthFormPost } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  return proxyAuthFormPost(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/upload`,
  );
}
