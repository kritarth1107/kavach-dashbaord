import { NextRequest } from "next/server";
import { proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId } = await params;
  return proxyAuthPost(req, `/api/families/${familyId}/notifications/read-all`);
}
