import { NextRequest } from "next/server";
import { proxyAuthGet } from "@/lib/auth-proxy";

const ALLOWED = new Set(["swiggy", "instamart", "zepto"]);

type RouteParams = { params: Promise<{ familyId: string; partner: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, partner } = await params;
  if (!ALLOWED.has(partner)) {
    return new Response(JSON.stringify({ message: "Unknown partner" }), { status: 404 });
  }
  return proxyAuthGet(req, `/api/families/${familyId}/integrations/${partner}/detail`);
}
