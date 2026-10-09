/**
 * Saheli's care memory and tasks for caregivers (backend /care-memory/* → ai-engine /v2/dash).
 */
import { request } from "./activity-api";

export type FactStatus = "active" | "pending" | "superseded" | "stopped" | "retracted";
export type FactSource = "prescription" | "lab" | "caregiver_said" | "dashboard" | "import" | "elder_said" | "inferred";

export type CareFact = {
  id: string;
  domain: string;
  key: string;
  name: string;
  value: Record<string, unknown>;
  text: string;
  status: FactStatus;
  source: FactSource | string;
  statedBy: string | null;
  confirmedBy: string | null;
  confidence: number;
  validFrom: string;
  validTo: string | null;
  recordedAt: string;
  note: string | null;
};

export type CareEvent = {
  id: number;
  kind: string;
  at: string;
  day: string;
  summary: string;
  actorId: string | null;
  payload: Record<string, unknown>;
};

export type OpenLoop = {
  id: string;
  kind: "question" | "followup" | "confirm_fact" | "task" | "watch" | string;
  title: string;
  status: string;
  detail: Record<string, unknown>;
  ownerId: string | null;
  wakeAt: string | null;
  rule: string | null;
  createdAt: string;
};

export type TaskItem = { name: string; qty?: number; price?: string; available?: boolean; for_item?: string };
export type RideOption = { type?: string; fare?: string; eta?: string };

export type CareTask = {
  id: string;
  service: string;
  serviceLabel: string;
  kind: "order" | "ride";
  goal: string;
  details: {
    items?: TaskItem[];
    pickup?: string;
    drop?: string;
    vehicle?: string;
    area?: string;
    confirmed_by?: string;
    choice?: string;
    /** Same id on every store of one comparison (no store was named). */
    compare?: string;
    /** What that store's look-up came to, e.g. "Zepto does not deliver to Home". */
    compare_note?: string;
    login?: string;
  };
  status: "queued" | "running" | "needs_input" | "awaiting_confirm" | "done" | "failed" | "cancelled";
  phase: "browse" | "prepare" | "otp" | "place" | "cancel";
  inputNeeded: "go" | "otp" | "confirm" | "fee" | "choice" | "swap" | null;
  cancelRequested: boolean;
  result: {
    items?: TaskItem[];
    total?: string;
    fees?: string;
    eta?: string;
    order_id?: string;
    ride_id?: string;
    driver?: string;
    options?: RideOption[];
    surge?: boolean;
    cancel_fee?: string;
    otp_sent_to?: string;
    alternatives?: string[];
    problem?: string;
    payment_method?: string;
  };
  history: Array<{ at: string; phase: string; status: string; note: string }>;
  audit?: string[];
  requestedBy: string;
  hasLiveView: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MemoryNote = { subjectId: string; slug: string; title: string; body: string; version: number; updatedAt: string };

export type CareOverview = {
  day: string;
  domains: Record<string, string>;
  facts: CareFact[];
  pending: CareFact[];
  loops: OpenLoop[];
  events: CareEvent[];
  tasks: CareTask[];
  notes: MemoryNote[];
};

function base(familyId: string, subjectUserId: string) {
  return `/api/families/${encodeURIComponent(familyId)}/subjects/${encodeURIComponent(subjectUserId)}/care-memory`;
}

function post<T>(url: string, body: unknown, method: "POST" | "PUT" = "POST") {
  return request<T>(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, 45_000);
}

export async function getCareOverview(familyId: string, subjectUserId: string, day?: string): Promise<CareOverview> {
  const data = await request<CareOverview>(`${base(familyId, subjectUserId)}/overview${day ? `?day=${day}` : ""}`, {}, 45_000);
  if (!data) throw new Error("Empty response");
  return data;
}

export async function getFactHistory(familyId: string, subjectUserId: string, key: string): Promise<CareFact[]> {
  const data = await request<{ versions: CareFact[] }>(`${base(familyId, subjectUserId)}/history?key=${encodeURIComponent(key)}`);
  return data?.versions ?? [];
}

export async function getCareEvents(familyId: string, subjectUserId: string, day: string): Promise<CareEvent[]> {
  const data = await request<{ events: CareEvent[] }>(`${base(familyId, subjectUserId)}/events?day=${day}&limit=500`);
  return data?.events ?? [];
}

export function saveFact(familyId: string, subjectUserId: string, fact: { domain: string; name: string; details: Record<string, unknown>; sentence: string }) {
  return post<{ result: string; key: string; note?: string }>(`${base(familyId, subjectUserId)}/facts`, fact);
}

export function stopFact(familyId: string, subjectUserId: string, fact: { domain: string; name: string; reason: string }) {
  return post<{ result: string }>(`${base(familyId, subjectUserId)}/facts/stop`, fact);
}

export function resolveFact(familyId: string, subjectUserId: string, key: string, approve: boolean) {
  return post<{ result: string }>(`${base(familyId, subjectUserId)}/facts/resolve`, { key, approve });
}

export function closeLoop(familyId: string, subjectUserId: string, loopId: string, note?: string) {
  return post<{ closed: boolean }>(`${base(familyId, subjectUserId)}/loops/${loopId}/close`, { note });
}

export function saveNote(familyId: string, subjectUserId: string, note: { subjectId: string; slug: string; title: string; body: string }) {
  return post<{ saved: boolean; version: number }>(`${base(familyId, subjectUserId)}/notes`, note, "PUT");
}

export function taskInput(familyId: string, subjectUserId: string, taskId: string, kind: "go" | "otp" | "confirm" | "fee" | "choice" | "approve", value: string) {
  return post<{ result: string; task: CareTask }>(`${base(familyId, subjectUserId)}/tasks/${taskId}/input`, { kind, value });
}

export function cancelTask(familyId: string, subjectUserId: string, taskId: string) {
  return post<{ result: string; task: CareTask }>(`${base(familyId, subjectUserId)}/tasks/${taskId}/cancel`, {});
}

export async function taskLiveUrl(familyId: string, subjectUserId: string, taskId: string): Promise<string | null> {
  const data = await request<{ url: string | null }>(`${base(familyId, subjectUserId)}/tasks/${taskId}/live`);
  return data?.url ?? null;
}

export const SOURCE_LABEL: Record<string, string> = {
  prescription: "Prescription",
  lab: "Lab report",
  caregiver_said: "Caregiver",
  dashboard: "Dashboard",
  import: "Earlier record",
  elder_said: "Said by elder",
  inferred: "Heard in chat",
};

export const DOMAIN_TITLE: Record<string, string> = {
  allergy: "Allergies",
  medicine: "Medicines",
  no_order: "Never order",
  condition: "Conditions",
  diet: "Diet rules",
  vital_target: "Targets",
  dish: "Dishes they cook",
  naming: "Naming",
  language: "Language",
  family: "Family rules",
  routine: "Routine",
  occasion: "Occasions",
  doctor: "Doctors",
  hospital: "Hospital",
  home: "Home & helpers",
  contact: "Contacts",
  preference: "Preferences",
};

export const DOMAIN_ORDER = Object.keys(DOMAIN_TITLE);

export type VitalSummary = {
  value: string;
  unit: string | null;
  at: string;
  trend: number[];
  change: { pct: number; dir: "up" | "down" } | null;
  redFlag: string | null;
} | null;

export type CareHomeSummary = {
  now: string;
  doses: Array<{ id: string; time: string; name: string; dose?: string | null; status: "taken" | "reminded" | "missed" | "due" | "upcoming" | "skipped" | "unmarked" }>;
  week: { taken: number; scheduled: number; streakDays: number; adherence: number[]; days: string[] };
  vitals: Record<"bp" | "sugar" | "weight" | "temperature" | "spo2", VitalSummary>;
  needsYou: Array<{ id: string; kind: "fact" | "task" | "refill" | "appointment"; key?: string; taskId?: string; input?: string | null; title: string; meta: string }>;
  followUps: OpenLoop[];
  tasks: CareTask[];
  timeline: Array<{ id: number; at: string; kind: string; text: string }>;
  lastHeardAt: string | null;
};

export async function getCareHome(familyId: string, subjectUserId: string): Promise<CareHomeSummary> {
  const data = await request<CareHomeSummary>(`${base(familyId, subjectUserId)}/home`, {}, 45_000);
  if (!data) throw new Error("Empty response");
  return data;
}

export async function getRecentLearning(familyId: string, subjectUserId: string): Promise<CareEvent[]> {
  const kinds = "fact_created,fact_superseded,fact_pending,fact_stopped";
  const data = await request<{ events: CareEvent[] }>(`${base(familyId, subjectUserId)}/events?kinds=${kinds}&limit=300`);
  return (data?.events ?? []).slice().reverse();
}
