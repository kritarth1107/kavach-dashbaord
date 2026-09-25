/**
 * Typed client for the caregiver activity feed + daily snapshot.
 * Contract: kavach-backend/docs/activity-api-contract.md (v1.1, 2026-09-26).
 *
 * All calls go through the dashboard's Next.js proxy routes under
 * /api/families/:familyId/subjects/:subjectUserId/{activity,daily-snapshot,daily-snapshots},
 * which forward the session token to the backend.
 */

export type ActivityKind =
  | "message_in"
  | "message_out"
  | "voice_note"
  | "order_step"
  | "order_confirm_card"
  | "order_placed"
  | "order_failed"
  | "order_cancelled"
  | "order_interrupt"
  | "ride"
  | "reminder"
  | "mood"
  | "health"
  | "caregiver_alert"
  | "diag"
  | "nudge";

export const KNOWN_ACTIVITY_KINDS: ActivityKind[] = [
  "message_in",
  "message_out",
  "voice_note",
  "order_step",
  "order_confirm_card",
  "order_placed",
  "order_failed",
  "order_cancelled",
  "order_interrupt",
  "ride",
  "reminder",
  "mood",
  "health",
  "caregiver_alert",
  "diag",
  "nudge",
];

export type ActivitySeverity = "info" | "warn" | "error";

export type ActivityItem = {
  id: string;
  /** Known kinds above; new kinds may appear and must render generically. */
  kind: ActivityKind | (string & {});
  title: string;
  detail?: string | null;
  severity: ActivitySeverity;
  /** IST calendar day YYYY-MM-DD. */
  dayKey: string;
  /** ISO-8601 UTC. */
  createdAt: string;
  actorUserId?: string | null;
  /** Optional, kind-specific. Unknown keys are ignored. */
  data?: Record<string, unknown> | null;
};

export type ActivityPage = {
  items: ActivityItem[];
  nextBefore: string | null;
  hasMore: boolean;
};

export type ActivityQuery = {
  day?: string;
  before?: string;
  kinds?: string[];
  limit?: number;
};

export type SnapshotStatus = "ready" | "generating" | "failed" | "empty";

export type DailySnapshotCounts = {
  messages?: number;
  voiceNotes?: number;
  orders?: number;
  rides?: number;
  reminders?: number;
  healthFlags?: number;
  /** v1.1 — may be missing on older snapshots (treat as 0). */
  nudges?: number;
  [key: string]: number | undefined;
};

export type DailySnapshot = {
  dayKey: string;
  status: SnapshotStatus;
  summary?: string | null;
  highlights?: string[];
  concerns?: string[];
  mood?: string | null;
  counts?: DailySnapshotCounts;
  model?: string | null;
  generatedAt?: string | null;
  source?: "scheduled" | "on_demand" | (string & {});
};

type Envelope<T> = { success: boolean; message?: string; data?: T };

export class ActivityApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ActivityApiError";
    this.status = status;
  }
}

async function request<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<T | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ActivityApiError("The request took too long. Please try again.", 504);
    }
    throw new ActivityApiError("Network error — check your connection.", 0);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let json: Envelope<T> | null = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text) as Envelope<T>;
    } catch {
      json = null;
    }
  }

  if (!res.ok || !json || json.success === false) {
    const fallback =
      res.status === 401
        ? "Your session expired. Please sign in again."
        : res.status === 403
          ? "Only caregivers of this family can view this."
          : res.status === 404
            ? "This isn't live on the server yet — check back soon."
            : res.status === 429
              ? "Please wait a couple of minutes before regenerating."
              : `Request failed (${res.status})`;
    // The proxy fills in generic messages when the backend returns non-JSON (e.g. a route 404).
    const generic = !json?.message || /^(Invalid|Empty) response/i.test(json.message);
    throw new ActivityApiError(generic ? fallback : (json?.message ?? fallback), res.status);
  }
  return json.data;
}

function base(familyId: string, subjectUserId: string) {
  return `/api/families/${encodeURIComponent(familyId)}/subjects/${encodeURIComponent(subjectUserId)}`;
}

export async function getActivity(
  familyId: string,
  subjectUserId: string,
  query: ActivityQuery = {},
): Promise<ActivityPage> {
  const qs = new URLSearchParams();
  if (query.day) qs.set("day", query.day);
  if (query.before) qs.set("before", query.before);
  if (query.kinds?.length) qs.set("kinds", query.kinds.join(","));
  if (query.limit) qs.set("limit", String(query.limit));
  const suffix = qs.toString() ? `?${qs}` : "";
  const data = await request<Partial<ActivityPage>>(
    `${base(familyId, subjectUserId)}/activity${suffix}`,
  );
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    nextBefore: data?.nextBefore ?? null,
    hasMore: Boolean(data?.hasMore && data?.nextBefore),
  };
}

export async function getDailySnapshot(
  familyId: string,
  subjectUserId: string,
  day?: string,
): Promise<DailySnapshot | null> {
  const suffix = day ? `?day=${encodeURIComponent(day)}` : "";
  const data = await request<{ snapshot: DailySnapshot | null }>(
    `${base(familyId, subjectUserId)}/daily-snapshot${suffix}`,
  );
  return data?.snapshot ?? null;
}

export async function generateDailySnapshot(
  familyId: string,
  subjectUserId: string,
  day?: string,
): Promise<DailySnapshot | null> {
  const data = await request<{ snapshot: DailySnapshot | null }>(
    `${base(familyId, subjectUserId)}/daily-snapshot`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(day ? { day } : {}),
    },
    75_000,
  );
  return data?.snapshot ?? null;
}

export async function listDailySnapshots(
  familyId: string,
  subjectUserId: string,
  limit = 14,
): Promise<DailySnapshot[]> {
  const data = await request<{ snapshots: DailySnapshot[] }>(
    `${base(familyId, subjectUserId)}/daily-snapshots?limit=${limit}`,
  );
  return Array.isArray(data?.snapshots) ? data.snapshots : [];
}
