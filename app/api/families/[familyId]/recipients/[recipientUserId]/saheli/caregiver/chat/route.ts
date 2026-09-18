import { NextRequest } from "next/server";
import { proxyAuthGet, proxyAuthPost, proxyAuthStream } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  return proxyAuthGet(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/saheli/caregiver/chat${req.nextUrl.search}`,
  );
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  const path = `/api/families/${familyId}/recipients/${recipientUserId}/saheli/caregiver/chat`;
  if (req.nextUrl.searchParams.get("stream") === "1") {
    return proxyAuthStream(req, `${path}?stream=1`);
  }
  return proxyAuthPost(req, path);
}
