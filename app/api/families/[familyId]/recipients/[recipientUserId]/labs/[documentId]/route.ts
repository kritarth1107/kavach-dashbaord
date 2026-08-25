import { NextRequest } from "next/server";
import { proxyAuthDelete, proxyAuthGet } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string; documentId: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, documentId } = await params;
  return proxyAuthGet(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}`,
  );
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, documentId } = await params;
  return proxyAuthDelete(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/labs/${documentId}`,
  );
}
