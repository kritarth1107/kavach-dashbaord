import { NextRequest, NextResponse } from "next/server";

/** Crashes in the browser (lib/client-errors.ts), written to the server log as one line each. No session needed. */
let windowStart = 0;
let count = 0;
const PER_MINUTE = 120; // per instance: a crash loop must not flood the log

function clip(v: unknown, n: number): string {
  return typeof v === "string" ? v.slice(0, n) : "";
}

export async function POST(req: NextRequest) {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    count = 0;
  }
  if (++count > PER_MINUTE) return new NextResponse(null, { status: 204 });
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse((await req.text()).slice(0, 4000));
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  console.error(
    `[client-error] ${JSON.stringify({
      where: clip(body.where, 80),
      path: clip(body.path, 300),
      message: clip(body.message, 500),
      digest: clip(body.digest, 80) || null,
      stack: clip(body.stack, 1500),
    })}`,
  );
  return new NextResponse(null, { status: 204 });
}
