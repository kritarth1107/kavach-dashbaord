import { NextRequest } from "next/server";
import { proxyAuthFormPost } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; memberUserId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, memberUserId } = await params;
  return proxyAuthFormPost(req, `/api/families/${encodeURIComponent(familyId)}/members/${encodeURIComponent(memberUserId)}/avatar`);
}
