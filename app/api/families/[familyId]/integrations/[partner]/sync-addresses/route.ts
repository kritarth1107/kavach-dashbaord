import { NextRequest } from "next/server";
import { proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; partner: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, partner } = await params;
  if (!["swiggy", "instamart", "zepto"].includes(partner)) {
    return new Response(JSON.stringify({ success: false, message: "Invalid partner" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return proxyAuthPost(req, `/api/families/${familyId}/integrations/${partner}/sync-addresses`);
}
