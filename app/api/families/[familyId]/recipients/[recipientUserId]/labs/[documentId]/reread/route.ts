import { NextRequest } from "next/server";
import { proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string; documentId: string }>;
};

/** Reading a report again takes 15 to 40 seconds. */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, documentId } = await params;
  return proxyAuthPost(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}/reread`,
    110_000,
  );
}
