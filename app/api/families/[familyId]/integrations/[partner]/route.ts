import { NextRequest } from "next/server";
import { proxyAuthDelete } from "@/lib/auth-proxy";

const ALLOWED = new Set(["swiggy", "instamart"]);

type RouteParams = { params: Promise<{ familyId: string; partner: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, partner } = await params;
  if (!ALLOWED.has(partner)) {
    return new Response(JSON.stringify({ message: "Unknown partner" }), { status: 404 });
  }
  return proxyAuthDelete(req, `/api/families/${familyId}/integrations/${partner}`);
}
