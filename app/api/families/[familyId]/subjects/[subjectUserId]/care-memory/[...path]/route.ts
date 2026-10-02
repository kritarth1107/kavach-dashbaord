import { NextRequest } from "next/server";
import { proxyAuthDelete, proxyAuthGet, proxyAuthPost, proxyAuthPut } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; subjectUserId: string; path: string[] }> };

async function backendPath(req: NextRequest, { params }: RouteParams) {
  const { familyId, subjectUserId, path } = await params;
  const rest = path.map(encodeURIComponent).join("/");
  const qs = req.nextUrl.searchParams.toString();
  return `/api/families/${encodeURIComponent(familyId)}/subjects/${encodeURIComponent(subjectUserId)}/care-memory/${rest}${qs ? `?${qs}` : ""}`;
}

export async function GET(req: NextRequest, ctx: RouteParams) {
  return proxyAuthGet(req, await backendPath(req, ctx));
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  return proxyAuthPost(req, await backendPath(req, ctx));
}

export async function PUT(req: NextRequest, ctx: RouteParams) {
  return proxyAuthPut(req, await backendPath(req, ctx));
}

export async function DELETE(req: NextRequest, ctx: RouteParams) {
  return proxyAuthDelete(req, await backendPath(req, ctx));
}
