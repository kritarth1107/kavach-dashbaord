import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/session-cookie";

const ALLOWED = new Set(["zepto", "swiggy", "instamart"]);

type RouteParams = { params: Promise<{ partner: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { partner } = await params;
  if (!ALLOWED.has(partner)) {
    return NextResponse.json({ message: "Unknown partner" }, { status: 404 });
  }
  const url = new URL(req.url);
  const backend = new URL(`/api/integrations/${partner}/callback`, getBackendUrl());
  url.searchParams.forEach((value, key) => {
    backend.searchParams.set(key, value);
  });
  return NextResponse.redirect(backend.toString(), 307);
}
