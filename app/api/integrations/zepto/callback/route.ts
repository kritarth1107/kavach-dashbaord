import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/session-cookie";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const backend = new URL("/api/integrations/zepto/callback", getBackendUrl());
  url.searchParams.forEach((value, key) => {
    backend.searchParams.set(key, value);
  });
  return NextResponse.redirect(backend.toString(), 307);
}
