import { NextRequest } from "next/server";
import { proxyAuthFormPost } from "@/lib/auth-proxy";

export async function POST(req: NextRequest) {
  return proxyAuthFormPost(req, "/api/onboarding/prescription", 90_000);
}
