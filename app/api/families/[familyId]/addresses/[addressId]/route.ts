import { NextRequest } from "next/server";
import { proxyAuthDelete, proxyAuthGet, proxyAuthPatch } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; addressId: string }> };

const path = (familyId: string, addressId: string) =>
  `/api/families/${encodeURIComponent(familyId)}/addresses/${encodeURIComponent(addressId)}`;

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, addressId } = await params;
  return proxyAuthGet(req, path(familyId, addressId));
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { familyId, addressId } = await params;
  return proxyAuthPatch(req, path(familyId, addressId));
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { familyId, addressId } = await params;
  return proxyAuthDelete(req, path(familyId, addressId));
}
