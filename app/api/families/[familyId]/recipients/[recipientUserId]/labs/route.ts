import { NextRequest } from "next/server";
import { proxyAuthGet, proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  return proxyAuthGet(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/labs`,
  );
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  return proxyAuthPost(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/labs`,
  );
}
