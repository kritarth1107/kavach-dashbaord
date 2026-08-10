import { NextRequest } from "next/server";
import { proxyAuthGet, proxyAuthPatch } from "@/lib/auth-proxy";

export async function GET(req: NextRequest) {
  return proxyAuthGet(req, "/api/users/me");
}

export async function PATCH(req: NextRequest) {
  return proxyAuthPatch(req, "/api/users/me");
}
