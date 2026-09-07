import { NextRequest } from "next/server";
import { proxyAuthGet, proxyAuthPatch, proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  return proxyAuthGet(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/companion`,
  );
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  return proxyAuthPatch(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/companion`,
  );
}
