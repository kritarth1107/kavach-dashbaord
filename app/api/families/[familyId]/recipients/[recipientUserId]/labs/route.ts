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

/** Pasted text is read by Saheli before it comes back (15 to 40 seconds). */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId } = await params;
  return proxyAuthPost(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/labs`,
    110_000,
  );
}
