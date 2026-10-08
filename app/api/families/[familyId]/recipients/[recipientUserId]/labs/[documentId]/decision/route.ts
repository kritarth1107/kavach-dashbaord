import { NextRequest } from "next/server";
import { proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string; documentId: string }>;
};

/** Saving can add medicines and memories through Saheli, so it may take longer than a normal write. */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, documentId } = await params;
  return proxyAuthPost(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}/decision`,
    110_000,
  );
}
