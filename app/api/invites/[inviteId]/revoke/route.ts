import { NextRequest, NextResponse } from "next/server";
import { proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ inviteId: string }> };

/** Cancel one of your unused invite links. */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { inviteId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) {
    return NextResponse.json({ success: false, message: "Invite not found" }, { status: 404 });
  }
  return proxyAuthPost(req, `/api/invites/${inviteId}/revoke`);
}
