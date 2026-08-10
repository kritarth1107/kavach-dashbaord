import { NextRequest, NextResponse } from "next/server";
import {
  getBackendUrl,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session-cookie";

type AuthPayload = {
  token?: string;
  user?: unknown;
  registered?: boolean;
  email?: string;
};

type BackendJson = {
  success?: boolean;
  message?: string;
  data?: AuthPayload;
};

async function parseBackendJson(res: Response): Promise<BackendJson> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      success: false,
      message: res.ok ? "Empty response from server" : `Request failed (${res.status})`,
    };
  }

  try {
    return JSON.parse(text) as BackendJson;
  } catch {
    return {
      success: false,
      message: "Invalid response from server",
    };
  }
}

export async function fetchBackend(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; json: BackendJson }> {
  try {
    const res = await fetch(`${getBackendUrl()}${path}`, init);
    const json = await parseBackendJson(res);
    return { ok: res.ok, status: res.status, json };
  } catch {
    return {
      ok: false,
      status: 503,
      json: {
        success: false,
        message:
          "Cannot reach the API server. Make sure the backend is running on port 5000.",
      },
    };
  }
}

function attachSessionCookie(response: NextResponse, data: AuthPayload) {
  if (data.token) {
    response.cookies.set(SESSION_COOKIE, data.token, sessionCookieOptions);
  }
  return response;
}

function stripToken<T extends AuthPayload>(data: T): Omit<T, "token"> {
  const { token: _token, ...rest } = data;
  return rest;
}

export async function proxyAuthPost(req: NextRequest, backendPath: string) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const body = await req.json();

  const { ok, status, json } = await fetchBackend(backendPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-fingerprint": "N/A",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = json.data;
  const response = NextResponse.json(
    payload?.token ? { ...json, data: stripToken(payload) } : json,
    { status: ok ? status : status === 503 ? 503 : status },
  );

  if (ok && payload?.token) {
    attachSessionCookie(response, payload);
  }

  return response;
}

export async function proxyAuthPatch(req: NextRequest, backendPath: string) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const body = await req.json();

  const { ok, status, json } = await fetchBackend(backendPath, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-fingerprint": "N/A",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  return NextResponse.json(json, { status: ok ? status : status === 503 ? 503 : status });
}

export async function proxyAuthDelete(req: NextRequest, backendPath: string) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  const { ok, status, json } = await fetchBackend(backendPath, {
    method: "DELETE",
    headers: {
      "x-fingerprint": "N/A",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return NextResponse.json(json, { status: ok ? status : status === 503 ? 503 : status });
}

export async function proxyAuthGet(req: NextRequest, backendPath: string) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  const { ok, status, json } = await fetchBackend(backendPath, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "x-fingerprint": "N/A",
    },
  });

  return NextResponse.json(json, { status: ok ? status : status === 503 ? 503 : status });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  return response;
}

export { SESSION_COOKIE };
