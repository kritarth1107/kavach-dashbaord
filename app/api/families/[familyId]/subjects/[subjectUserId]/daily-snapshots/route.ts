import { NextRequest } from "next/server";
import { proxyAuthGet } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; subjectUserId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, subjectUserId } = await params;
  const qs = req.nextUrl.searchParams.toString();
  const suffix = qs ? `?${qs}` : "";
  return proxyAuthGet(
    req,
    `/api/families/${familyId}/subjects/${subjectUserId}/daily-snapshots${suffix}`,
  );
}
