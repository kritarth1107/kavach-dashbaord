import { NextRequest } from "next/server";
import { proxyAuthPut } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; addressId: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { familyId, addressId } = await params;
  return proxyAuthPut(
    req,
    `/api/families/${encodeURIComponent(familyId)}/addresses/${encodeURIComponent(addressId)}/default`,
  );
}
