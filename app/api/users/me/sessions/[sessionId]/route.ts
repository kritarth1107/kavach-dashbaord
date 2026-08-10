import { NextRequest } from "next/server";
import { proxyAuthDelete } from "@/lib/auth-proxy";

type RouteParams = {
  params: Promise<{ sessionId: string }>;
};

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  return proxyAuthDelete(req, `/api/users/me/sessions/${sessionId}`);
}
