import { NextRequest } from "next/server";
import { proxyAuthPut } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; recipientUserId: string; scheduleId: string }>;
};

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { familyId, recipientUserId, scheduleId } = await params;
  return proxyAuthPut(
    req,
    `/api/families/${familyId}/recipients/${recipientUserId}/care-schedule/${scheduleId}/completion`,
  );
}
