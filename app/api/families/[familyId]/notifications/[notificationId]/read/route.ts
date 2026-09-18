import { NextRequest } from "next/server";
import { proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ familyId: string; notificationId: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, notificationId } = await params;
  return proxyAuthPatch(
    req,
    `/api/families/${familyId}/notifications/${notificationId}/read`,
  );
}
