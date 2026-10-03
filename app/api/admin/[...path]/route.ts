import { NextRequest } from "next/server";
import { proxyAuthGet, proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ path: string[] }> };

async function backendPath(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const qs = req.nextUrl.searchParams.toString();
  return `/api/admin/${path.map(encodeURIComponent).join("/")}${qs ? `?${qs}` : ""}`;
}

export async function GET(req: NextRequest, ctx: RouteParams) {
  return proxyAuthGet(req, await backendPath(req, ctx));
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  return proxyAuthPost(req, await backendPath(req, ctx));
}
