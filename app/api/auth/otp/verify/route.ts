import { NextRequest } from "next/server";
import { proxyAuthPost } from "@/lib/auth-proxy";

export async function POST(req: NextRequest) {
  return proxyAuthPost(req, "/api/auth/otp/verify");
}
