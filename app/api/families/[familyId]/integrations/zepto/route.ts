import { NextRequest } from "next/server";
import { proxyAuthDelete } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId } = await params;
  return proxyAuthDelete(req, `/api/families/${familyId}/integrations/zepto`);
}
