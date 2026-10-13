import { NextRequest } from "next/server";
import { proxyAuthGet } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId } = await params;
  const qs = req.nextUrl.searchParams.toString(); // ?subjectUserId=: one person's orders
  return proxyAuthGet(req, `/api/families/${familyId}/approvals/pending${qs ? `?${qs}` : ""}`);
}
