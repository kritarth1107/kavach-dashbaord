import { NextRequest } from "next/server";
import { proxyAuthGet, proxyAuthPatch, proxyAuthPost } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; subjectUserId: string; path?: string[] }> };

/** A person's Saheli reminders (backend /reminders): the calendar's Reminders column and the "All reminders" list. */
async function backendPath(req: NextRequest, { params }: RouteParams) {
  const { familyId, subjectUserId, path } = await params;
  const rest = (path ?? []).map(encodeURIComponent).join("/");
  const qs = req.nextUrl.searchParams.toString();
  return `/api/families/${encodeURIComponent(familyId)}/subjects/${encodeURIComponent(subjectUserId)}/reminders${rest ? `/${rest}` : ""}${qs ? `?${qs}` : ""}`;
}

export async function GET(req: NextRequest, ctx: RouteParams) {
  return proxyAuthGet(req, await backendPath(req, ctx));
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  return proxyAuthPost(req, await backendPath(req, ctx));
}

export async function PATCH(req: NextRequest, ctx: RouteParams) {
  return proxyAuthPatch(req, await backendPath(req, ctx));
}
