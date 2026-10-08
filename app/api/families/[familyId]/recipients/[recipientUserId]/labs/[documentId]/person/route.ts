import { NextRequest } from "next/server";
import { proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string; documentId: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, documentId } = await params;
  return proxyAuthPost(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}/person`,
    45_000,
  );
}
