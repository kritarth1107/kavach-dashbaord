import { NextRequest } from "next/server";
import { proxyAuthGet } from "@/lib/auth-proxy";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/onboarding/verify/[target]">) {
  const { target } = await ctx.params;
  return proxyAuthGet(req, `/api/onboarding/verify/${encodeURIComponent(target)}`);
}
