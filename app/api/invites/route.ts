import { NextRequest } from "next/server";
import { proxyAuthGet, proxyAuthPost } from "@/lib/auth-proxy";

/** Your invite links and this week's quota; POST makes one new link now. */
export async function GET(req: NextRequest) {
  return proxyAuthGet(req, "/api/invites");
}

export async function POST(req: NextRequest) {
  return proxyAuthPost(req, "/api/invites");
}
