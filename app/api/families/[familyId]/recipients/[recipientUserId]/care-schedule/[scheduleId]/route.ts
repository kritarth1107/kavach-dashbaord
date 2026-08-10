import { NextRequest } from "next/server";
import { proxyAuthDelete, proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string; scheduleId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, scheduleId } = await params;
  return proxyAuthPatch(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/care-schedule/${scheduleId}`,
  );
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, scheduleId } = await params;
  return proxyAuthDelete(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/care-schedule/${scheduleId}`,
  );
}
