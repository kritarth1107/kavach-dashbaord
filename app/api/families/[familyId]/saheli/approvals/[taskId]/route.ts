import { NextRequest } from "next/server";
import { proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; taskId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, taskId } = await params;
  return proxyAuthPost(req, `/api/families/${familyId}/saheli/approvals/${encodeURIComponent(taskId)}`);
}
