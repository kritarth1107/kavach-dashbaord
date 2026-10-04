/**
 * Care views that Saheli also serves on WhatsApp: refills, emergency card, care team, report,
 * wellbeing, family tasks and spending (backend /care-memory/* → ai-engine /v2/dash).
 */
import { request } from "./activity-api";

const base = (familyId: string, subjectUserId: string) =>
  `/api/families/${encodeURIComponent(familyId)}/subjects/${encodeURIComponent(subjectUserId)}/care-memory`;

function send<T>(url: string, body: unknown, method: "POST" | "PUT" | "DELETE" = "POST") {
  return request<T>(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) }, 45_000);
}

/* ── refills ─────────────────────────────────────────────────────────────── */

export type StockRow = {
  key: string;
  name: string;
  dose: string | null;
  perDay: number;
  stock: number | null;
  daysLeft: number | null;
  asOf: string | null;
  low: boolean;
};
export type Pharmacy = "apollo" | "1mg" | "pharmeasy";

export async function getStock(familyId: string, subjectUserId: string) {
  const d = await request<{ medicines: StockRow[]; refillWithinDays: number }>(`${base(familyId, subjectUserId)}/stock`);
  return d ?? { medicines: [], refillWithinDays: 5 };
}
export const setStock = (familyId: string, subjectUserId: string, key: string, count: number) =>
  send<StockRow>(`${base(familyId, subjectUserId)}/stock`, { key, count });
export const orderRefill = (familyId: string, subjectUserId: string, key: string, service: Pharmacy, qty = 1) =>
  send<{ task?: { id: string; status: string }; alreadyRunning?: boolean }>(
    `${base(familyId, subjectUserId)}/stock/${encodeURIComponent(key)}/order`,
    { service, qty },
  );

/* ── emergency card ──────────────────────────────────────────────────────── */

export type EmergencyCard = {
  profile: Record<string, string>;
  conditions: string[];
  allergies: Array<{ allergen: string; reaction: string | null; text: string }>;
  medicines: Array<{ name: string; dose: string | null; times: string[]; text: string }>;
  diet: string[];
  doctors: Array<{ name: string; phone: string | null; speciality: string | null; text: string }>;
  hospital: Array<{ name: string; phone: string | null; address: string | null; text: string }>;
  contacts: Array<{ name: string; phone: string | null; relation: string | null; emergency: boolean; text: string }>;
  familyRules: string[];
};
export type EmergencyLink = { url: string; createdAt?: string; opens?: number; lastOpenedAt?: string | null };
export type PublicEmergency = {
  person: { name: string; photo: string | null; phone: string | null };
  caregivers: Array<{ name: string; phone: string | null; primary: boolean }>;
  card: EmergencyCard;
  updatedAt: string;
};

export async function getEmergencyCard(familyId: string, subjectUserId: string) {
  return (await request<EmergencyCard>(`${base(familyId, subjectUserId)}/emergency`))!;
}
export const getEmergencyLink = (familyId: string, subjectUserId: string) =>
  request<EmergencyLink | null>(`${base(familyId, subjectUserId)}/emergency-link`);
export const createEmergencyLink = (familyId: string, subjectUserId: string) =>
  send<EmergencyLink>(`${base(familyId, subjectUserId)}/emergency-link`, {});
export const revokeEmergencyLink = (familyId: string, subjectUserId: string) =>
  send<{ revoked: number }>(`${base(familyId, subjectUserId)}/emergency-link`, {}, "DELETE");

/** Public, no sign-in: the card behind a share link. */
export async function getPublicEmergency(token: string): Promise<PublicEmergency> {
  const res = await fetch(`/api/public/emergency/${encodeURIComponent(token)}`, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as { success?: boolean; data?: PublicEmergency; message?: string } | null;
  if (!res.ok || !json?.data) throw new Error(json?.message || "This emergency link is not active");
  return json.data;
}

/* ── care team & appointments ────────────────────────────────────────────── */

export type Appointment = {
  key: string;
  doctor: string;
  when: string | null; // YYYY-MM-DDTHH:MM IST
  place: string | null;
  purpose: string | null;
  questions: string[];
  status: string;
  upcoming: boolean;
  text: string;
};
export type CareTeam = {
  doctors: EmergencyCard["doctors"];
  hospital: EmergencyCard["hospital"];
  contacts: EmergencyCard["contacts"];
  helpers: Array<{ name: string; text: string; phone: string | null }>;
  upcoming: Appointment[];
  past: Appointment[];
};

export async function getCareTeam(familyId: string, subjectUserId: string) {
  return (await request<CareTeam>(`${base(familyId, subjectUserId)}/care-team`))!;
}
export const addDoctorQuestion = (familyId: string, subjectUserId: string, key: string, question: string) =>
  send<{ result: string; questions: string[] }>(`${base(familyId, subjectUserId)}/appointments/question`, { key, question });

/* ── report ──────────────────────────────────────────────────────────────── */

export type CareReport = {
  from: string;
  to: string;
  days: number;
  generatedAt: string;
  narrative: string;
  adherence: {
    percent: number | null;
    taken: number;
    expected: number;
    byDay: Array<{ day: string; expected: number; taken: number; missed: number }>;
    byMedicine: Array<{ name: string; dose: string | null; times: string[]; expected: number; taken: number; missed: number }>;
  };
  vitals: Array<{ at: string; kind: string | null; value: string | null; note: string | null; redFlag: unknown }>;
  symptoms: Array<{ at: string; text: string; level: string }>;
  mood: Array<{ at: string; text: string }>;
  alerts: Array<{ at: string; text: string; whatsapp: boolean }>;
  changes: Array<{ at: string; text: string; kind: string }>;
  orders: Array<{ at: string; service: string; kind: string; goal: string; status: string; total: number | null }>;
  appointments: Appointment[];
};

export async function getReport(familyId: string, subjectUserId: string, days = 7) {
  return (await request<CareReport>(`${base(familyId, subjectUserId)}/report?days=${days}`, {}, 70_000))!;
}

/* ── wellbeing ───────────────────────────────────────────────────────────── */

export type Wellbeing = {
  lastHeard: string | null;
  daysTalked: number;
  streak: number;
  days: Array<{ day: string; talked: boolean; level: "info" | "watch" | "concern"; mood: string[]; symptoms: string[] }>;
  recentMood: Array<{ at: string; text: string; level: string }>;
  concerns: Array<{ at: string; text: string }>;
};

export async function getWellbeing(familyId: string, subjectUserId: string, days = 14) {
  return (await request<Wellbeing>(`${base(familyId, subjectUserId)}/wellbeing?days=${days}`))!;
}

/* ── patterns Saheli noticed ─────────────────────────────────────────────── */

export type CarePattern = {
  kind: string;
  key: string;
  title: string;
  detail: string;
  suggestion: string;
  severity: "info" | "watch";
};

export async function getPatterns(familyId: string, subjectUserId: string) {
  return (await request<{ patterns: CarePattern[]; windowDays: number }>(`${base(familyId, subjectUserId)}/patterns`))!;
}

/* ── what happened (outcomes), feedback, learning consent ─────────────────── */

export type CareOutcome = { at: string; kind: string; label: string; summary: string; source: "said" | "button" | "dashboard" | "auto" };
export type OutcomesView = {
  outcomes: CareOutcome[];
  kinds: Record<string, string>;
  consent: { granted: boolean; by: string | null; at: string | null };
};

export async function getOutcomes(familyId: string, subjectUserId: string) {
  return (await request<OutcomesView>(`${base(familyId, subjectUserId)}/outcomes`))!;
}

export async function logOutcome(familyId: string, subjectUserId: string, kind: string, summary: string) {
  return (await send<{ outcomes: CareOutcome[] }>(`${base(familyId, subjectUserId)}/outcomes`, { kind, summary }))!;
}

export async function sendFeedback(familyId: string, subjectUserId: string, target: string, vote: "up" | "down") {
  return send<{ ok: boolean }>(`${base(familyId, subjectUserId)}/feedback`, { target, vote });
}

export async function setLearningConsent(familyId: string, subjectUserId: string, granted: boolean) {
  return send<{ granted: boolean }>(`${base(familyId, subjectUserId)}/consent`, { granted });
}

/* ── memory health, profile card, forget ──────────────────────────────────── */

export type MemoryHealth = {
  issues: Array<{ kind: string; key: string; problem: string; ask: string }>;
  profileCard: string | null;
  forgotten: Array<{ id: number; at: string; what: string; restored: boolean }>;
};

export async function getMemoryHealth(familyId: string, subjectUserId: string) {
  return (await request<MemoryHealth>(`${base(familyId, subjectUserId)}/memory-health`))!;
}

export async function forgetMemory(familyId: string, subjectUserId: string, what: string) {
  return (await send<{ forgotten: number }>(`${base(familyId, subjectUserId)}/forget`, { what }))!;
}

export async function restoreForgotten(familyId: string, subjectUserId: string, id: number) {
  return (await send<{ restored: number }>(`${base(familyId, subjectUserId)}/forgotten/${id}/restore`, {}))!;
}

/* ── skills ──────────────────────────────────────────────────────────────── */

export type Skill = {
  id: number;
  scope: "store" | "family";
  subjectId: string | null;
  service: string;
  title: string;
  body: string;
  steps: string[];
  source: "auto" | "caregiver" | "dream";
  status: "proposed" | "active" | "stale" | "archived" | "blocked";
  uses: number;
  successes: number;
  failures: number;
  successRate: number | null;
  lastUsedAt: string | null;
  updatedAt: string;
  version: number;
};

export async function getSkills(familyId: string, subjectUserId: string) {
  return (await request<{ skills: Skill[]; store: Skill[] }>(`${base(familyId, subjectUserId)}/skills`))!;
}

export async function addSkill(familyId: string, subjectUserId: string, text: string) {
  return (await send<{ saved: boolean; id: number }>(`${base(familyId, subjectUserId)}/skills`, { text }))!;
}

export async function skillAction(familyId: string, subjectUserId: string, id: number, action: "approve" | "edit" | "remove" | "restore", text?: string) {
  return (await send<{ ok: boolean }>(`${base(familyId, subjectUserId)}/skills/${id}`, { action, text }))!;
}

/* ── family tasks ────────────────────────────────────────────────────────── */

export type FamilyTask = {
  id: string;
  title: string;
  assignee: string | null;
  subjectId: string;
  due: string | null;
  assignedBy: string | null;
  status: "open" | "done" | "cancelled" | "expired";
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getFamilyTasks(familyId: string, subjectUserId: string) {
  return (await request<{ tasks: FamilyTask[] }>(`${base(familyId, subjectUserId)}/family-tasks`))?.tasks ?? [];
}
/** due: "YYYY-MM-DDTHH:MM" in IST, optional. */
export const addFamilyTask = (familyId: string, subjectUserId: string, task: { title: string; assignee: string; due?: string }) =>
  send<FamilyTask>(`${base(familyId, subjectUserId)}/family-tasks`, task);
export const completeFamilyTask = (familyId: string, subjectUserId: string, taskId: string, note = "done") =>
  send<FamilyTask>(`${base(familyId, subjectUserId)}/family-tasks/${encodeURIComponent(taskId)}/done`, { note });

/* ── spending ────────────────────────────────────────────────────────────── */

export type Spending = {
  month: string;
  total: number;
  count: number;
  byService: Record<string, number>;
  byPerson: Record<string, number>;
  byKind: Record<string, number>;
  items: Array<{ at: string; service: string; kind: string; goal: string; subjectId: string; total: number }>;
};

export async function getSpending(familyId: string, subjectUserId: string, month?: string) {
  return (await request<Spending>(`${base(familyId, subjectUserId)}/spending${month ? `?month=${month}` : ""}`))!;
}
