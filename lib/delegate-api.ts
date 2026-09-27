/** Saheli as a persistent delegate: permissions, open tasks, follow-ups, approvals and WHY memory. */

export type DelegateTask = {
  taskId: string;
  kind: "open_task" | "followup" | "approval";
  status: string;
  title: string;
  item: string | null;
  partner: string | null;
  category: string | null;
  isMedicine: boolean;
  important: boolean;
  why: string | null;
  whyId: string | null;
  byCaregiver: boolean;
  flow: string | null;
  phase: string | null;
  whereStopped: string | null;
  stage: string | null;
  lastActiveAt: string | null;
  resumeOfferedAt: string | null;
  nudgedAt: string | null;
  placedAt: string | null;
  dueAt: string | null;
  askedAt: string | null;
  askCount: number;
  lastSaheliLine: string | null;
  outcome: string | null;
  outcomeNote: string | null;
  resolvedAt: string | null;
  approval: { reason: string; detail: string; amountPaise: number | null; decidedByName: string | null; decidedAt: string | null; notifiedAt: string | null } | null;
  expiresAt: string;
  createdAt: string | null;
  history: { at: string; event: string; note?: string }[];
};

export type DelegateWhy = {
  whyId: string;
  subject: string;
  reason: string;
  category: string | null;
  status: "active" | "stopped" | "paused";
  importance: string;
  source: string;
  partner: string | null;
  updates: { at: string; kind: string; note: string }[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type DelegatePermissions = {
  groceries: boolean;
  food: boolean;
  medicines: boolean;
  rides: boolean;
  spendSoftLimitInr: number | null;
  deliveryFollowUps: boolean;
  medicineStartCheck: boolean;
  resumeNudges: boolean;
  stores: { key: string; label: string; category: string; allowed: boolean }[];
  locked: string[];
  summary: { can: string[]; asks: string[] };
  history: { at: string; byName?: string; change: string }[];
  updatedAt: string | null;
};

export type DelegateSummary = {
  permissions: DelegatePermissions;
  openTasks: DelegateTask[];
  followups: DelegateTask[];
  approvals: DelegateTask[];
  recent: DelegateTask[];
  whys: DelegateWhy[];
};

export type PermissionPatch = Partial<
  Pick<DelegatePermissions, "groceries" | "food" | "medicines" | "rides" | "spendSoftLimitInr" | "deliveryFollowUps" | "medicineStartCheck" | "resumeNudges">
> & { stores?: Record<string, boolean> };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.method && init.method !== "GET" ? 25_000 : 12_000);
  try {
    const res = await fetch(path, { ...init, credentials: "include", signal: controller.signal });
    const text = await res.text();
    let json: { success?: boolean; message?: string; data?: T } = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error("Invalid response from server");
    }
    if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`);
    return json.data as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("Saheli is taking too long. Try again in a moment.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const json = (method: string, body: unknown = {}): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const rp = (f: string, r: string) => `/api/families/${f}/recipients/${r}/saheli`;

export const getDelegateSummary = (familyId: string, recipientUserId: string) => call<DelegateSummary>(`${rp(familyId, recipientUserId)}/delegate`);

export const updateSaheliPermissions = (familyId: string, recipientUserId: string, patch: PermissionPatch) =>
  call<DelegateSummary>(`/api/families/${familyId}/saheli/permissions?recipientUserId=${encodeURIComponent(recipientUserId)}`, json("PATCH", patch));

export const decideSaheliApproval = (familyId: string, taskId: string, decision: "approve" | "deny") =>
  call<{ taskId: string; status: string }>(`/api/families/${familyId}/saheli/approvals/${encodeURIComponent(taskId)}`, json("POST", { decision }));

export const dismissSaheliTask = (familyId: string, taskId: string) =>
  call<{ dismissed: boolean }>(`/api/families/${familyId}/saheli/tasks/${encodeURIComponent(taskId)}/dismiss`, json("POST", {}));

export const forgetSaheliWhy = (familyId: string, recipientUserId: string, whyId: string) =>
  call<{ removed: boolean }>(`${rp(familyId, recipientUserId)}/why/${encodeURIComponent(whyId)}`, { method: "DELETE" });
