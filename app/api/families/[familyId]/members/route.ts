import { NextRequest } from "next/server";
import { proxyAuthGet, proxyAuthPost, proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId } = await params;
  return proxyAuthGet(req, `/api/families/${familyId}/members`);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId } = await params;
  return proxyAuthPost(req, `/api/families/${familyId}/members/invite`);
}
