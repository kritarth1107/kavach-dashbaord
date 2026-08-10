import { NextRequest } from "next/server";
import { fetchBackend } from "@/lib/auth-proxy";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ok, status, json } = await fetchBackend("/api/auth/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return Response.json(json, { status: ok ? status : status });
}
