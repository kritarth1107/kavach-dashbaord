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
  /** How it connects (read-only; Saheli and the record review set these): "for diabetes", "Dr Sharma", "from the 3 Sep prescription". */
  links?: CareLink[];
};

export type CareLink = {
  relation: "for" | "prescribed_by" | "from_record" | "with_doctor" | "related_to" | string;
  to: string;
  label: string;
  text: string;
  phrase: string;
  status: "active" | "pending" | string;
  source: string;
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
    /** Set for later: when it is for, when it is booked or placed, the most they agreed to pay. */
    later?: { at?: string; book_at?: string; max?: number | null; no_max?: boolean; state?: string; asked?: { amount?: string } };
    /** A cancel asked after it was placed or booked (Order Engineer, HANDOFF §3). */
    cancel_ask?: { state?: "pending" | "cancelling" | "fee" | "cancelled" | "refused" | "kept" | "told_carers" | "unclear" | "not_placed" | "cancelled_in_app" | string; by?: string };
    approval_needed?: { reasons?: string[]; amount?: number | null };
  };
  /** scheduled: set for later (details.later). */
  status: "queued" | "running" | "needs_input" | "awaiting_confirm" | "scheduled" | "done" | "failed" | "cancelled";
  /** check: Saheli is reading the store's own order list. */
  phase: "browse" | "prepare" | "otp" | "place" | "check" | "cancel";
  inputNeeded: "go" | "otp" | "confirm" | "fee" | "choice" | "swap" | "later" | "approve" | "fare" | null;
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
    /** Placed or booked before a yes: being cancelled on the store. */
    by_mistake?: boolean;
    placed?: boolean;
    booked?: boolean;
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
  /** The day's due doses with their status (same list as the Home card: weekly medicines only on their day). */
  doses?: Array<{ id: string; time: string; name: string; dose?: string | null; status: string }>;
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
  /** The latest mood heard in the last 24 hours (Saheli in the chat, or the 30-minute re-read). Score 1 very low … 5 very good. */
  mood?: { score: number | null; word: string | null; summary: string; at: string; source: string } | null;
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

/** The person-centred pages (Care plan, Story, Emergency card): one read from the engine's /portrait. */
export type PortraitMood = { day?: string; score: number | null; word: string | null; summary: string; at: string; source: string };
export type PortraitDose = { id: string; time: string; name: string; dose?: string | null; status: CareHomeSummary["doses"][number]["status"] };
export type Portrait = {
  person: {
    name: string | null;
    age: string | null;
    callAs: string | null;
    language: string | null;
    livesWith: string | null;
    city: string | null;
    address: string | null;
    mobility: string | null;
  };
  mood: { now: PortraitMood | null; days: PortraitMood[] };
  stats: { known: number; learnedWeek: number; pending: number };
  learned: Array<{
    id: string;
    key: string;
    domain: string;
    text: string;
    status: FactStatus;
    source: string;
    statedBy: string | null;
    at: string;
    /** The person's own words: the message the fact was saved from, or (heard) the words the 30-minute re-read picked. */
    said: { text: string; at: string; voice: boolean; heard?: boolean } | null;
  }>;
  people: Array<{ id?: string; name: string; relation: string; phone?: string | null; note?: string; kind: "member" | "family" | "contact" | "doctor"; key?: string }>;
  day: Array<{ time: string; label: string; key: string }>;
  enjoys: Array<{ key: string; text: string; domain: string }>;
  avoid: string[];
  week: Array<{ day: string; doses: PortraitDose[] }>;
  /** Habits, routines, things given up (engine activities): today's state, streak and the last thing they said. */
  activities?: PortraitActivity[];
  /** What Saheli does not know yet, most useful first; a "has none" answer counts as known. */
  gaps?: { known: number; total: number; items: Array<{ key: GapKey; known: boolean }> };
  knownSince: string | null;
};

export type GapKey = "medicine" | "allergy" | "condition" | "blood_group" | "emergency_contact" | "doctor" | "hospital" | "address" | "routine" | "weight" | "enjoys" | "language";

export type PortraitActivity = {
  key: string;
  label: string;
  type: string;
  category: string;
  kind: "habit" | "quit" | "task" | "routine";
  days: number[];
  start: string | null;
  end: string | null;
  paused: boolean;
  goal: string | null;
  today: "done" | "skipped" | "off" | "routine" | "upcoming" | "not_heard";
  streak: number;
  week_done: number;
  last: { at: string; summary: string; done: boolean } | null;
  text: string;
};

export async function getPortrait(familyId: string, subjectUserId: string): Promise<Portrait> {
  const data = await request<Portrait>(`${base(familyId, subjectUserId)}/portrait`, {}, 45_000);
  if (!data) throw new Error("Empty response");
  return data;
}
