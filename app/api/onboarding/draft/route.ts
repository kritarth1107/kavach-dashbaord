import { NextRequest } from "next/server";
import { proxyAuthPut } from "@/lib/auth-proxy";

export async function PUT(req: NextRequest) {
  return proxyAuthPut(req, "/api/onboarding/draft");
}
