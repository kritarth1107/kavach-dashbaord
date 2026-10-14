import { NextRequest } from "next/server";
import { proxyAuthGet } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string }> };

/** The Food & nutrition switch. The menu stays hidden when this call fails, so it has to reach the backend. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId } = await params;
  return proxyAuthGet(req, `/api/families/${encodeURIComponent(familyId)}/features`);
}
