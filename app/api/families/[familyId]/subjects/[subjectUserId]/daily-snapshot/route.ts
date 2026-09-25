import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, proxyAuthGet, SESSION_COOKIE } from "@/lib/auth-proxy";

type RouteParams = { params: Promise<{ familyId: string; subjectUserId: string }> };

/** On-demand Gemini generation can take ~30 s. */
const GENERATE_TIMEOUT_MS = 70_000;

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { familyId, subjectUserId } = await params;
  const qs = req.nextUrl.searchParams.toString();
  const suffix = qs ? `?${qs}` : "";
  return proxyAuthGet(
    req,
    `/api/families/${familyId}/subjects/${subjectUserId}/daily-snapshot${suffix}`,
  );
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { familyId, subjectUserId } = await params;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { ok, status, json } = await fetchBackend(
    `/api/families/${familyId}/subjects/${subjectUserId}/daily-snapshot`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-fingerprint": "N/A",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    },
    GENERATE_TIMEOUT_MS,
  );

  return NextResponse.json(json, { status: ok ? status : status === 503 ? 503 : status });
}
