import { NextRequest } from "next/server";
import { proxyAuthPatch } from "@/lib/auth-proxy";

export async function PATCH(req: NextRequest) {
  return proxyAuthPatch(req, "/api/families/active");
}
