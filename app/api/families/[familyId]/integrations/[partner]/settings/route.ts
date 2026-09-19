import { NextRequest } from "next/server";
import { proxyAuthGet, proxyAuthPatch } from "@/lib/auth-proxy";

const ALLOWED = new Set(["swiggy", "instamart", "zepto"]);

type RouteParams = { params: Promise<{ familyId: string; partner: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, partner } = await params;
  if (!ALLOWED.has(partner)) {
    return new Response(JSON.stringify({ message: "Unknown partner" }), { status: 404 });
  }
  return proxyAuthGet(req, `/api/families/${familyId}/integrations/${partner}/settings`);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, partner } = await params;
  if (!ALLOWED.has(partner)) {
    return new Response(JSON.stringify({ message: "Unknown partner" }), { status: 404 });
  }
  return proxyAuthPatch(req, `/api/families/${familyId}/integrations/${partner}/settings`);
}
