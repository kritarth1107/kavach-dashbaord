import { NextRequest } from "next/server";
import { proxyAuthGet } from "@/lib/auth-proxy";

export async function GET(req: NextRequest) {
  return proxyAuthGet(req, "/api/auth/me");
}
