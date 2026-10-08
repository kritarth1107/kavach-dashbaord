/**
 * Plain helpers for the health records screens: kinds, flags from printed ranges, dates,
 * medicine times, pronouns and friendly error messages. No React, no network.
 */
import { ApiError, type DraftReading, type LabDocument, type LabFlag, type MedicineSlot, type RecordKind } from "@/lib/api";

/* ── kinds ─────────────────────────────────────────────────────────────── */

export const RECORD_KINDS: Array<{ id: RecordKind; label: string; plural: string }> = [
  { id: "lab", label: "Lab report", plural: "Lab reports" },
  { id: "scan", label: "Scan", plural: "Scans" },
  { id: "discharge", label: "Discharge", plural: "Discharge" },
  { id: "prescription", label: "Prescription", plural: "Prescriptions" },
  { id: "other", label: "Other", plural: "Other" },
];

/** Older records used "vitals" and "note"; they count as other. */
export function recordKind(kind: string | null | undefined): RecordKind {
  return kind === "lab" || kind === "scan" || kind === "discharge" || kind === "prescription" ? kind : "other";
}

export function kindLabel(kind: string | null | undefined): string {
  const k = recordKind(kind);
  if (k === "other") return "Health record";
  return RECORD_KINDS.find((x) => x.id === k)!.label;
}

/** The type a record is shown as in the review "Type" field. */
export const TYPE_OPTIONS: Array<{ id: RecordKind; label: string }> = [
  { id: "lab", label: "Lab report" },
  { id: "prescription", label: "Prescription" },
  { id: "discharge", label: "Discharge summary" },
  { id: "scan", label: "Scan" },
  { id: "other", label: "Other" },
];

/* ── status of a record ───────────────────────────────────────────────── */

export type RowStatus = "saved" | "review" | "failed" | "file_only";

export function rowStatus(doc: Pick<LabDocument, "review_status" | "extraction_status">): RowStatus {
  if (doc.extraction_status === "failed" && doc.review_status !== "file_only") return "failed";
  if (doc.review_status === "needs_review") return "review";
  if (doc.review_status === "file_only") return "file_only";
  return "saved";
}

/** Failed reads and records that wait for review open the review screen; the rest open the detail view. */
export function opensReview(doc: Pick<LabDocument, "review_status" | "extraction_status">): boolean {
  const s = rowStatus(doc);
  return s === "review" || s === "failed";
}

/* ── flags from the printed range ─────────────────────────────────────── */

const num = (s: string | null | undefined): number | null => {
  const m = String(s ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/** low / high / normal from the printed range ("12-15", "< 5.7", "> 40", "upto 35", "130/80"); else the given flag. Same rules as the backend. */
export function computeFlag(value: string, range: string | null | undefined, given: LabFlag | null | undefined): LabFlag | null {
  const r = String(range || "").toLowerCase().replace(/,/g, "").replace(/[–—]/g, "-").trim();
  if (/\//.test(value) && /\//.test(r)) {
    const [s, d] = value.split("/").map((x) => num(x));
    const [rs, rd] = r.replace(/[<≤>≥]|upto|up to|below/g, "").split("/").map((x) => num(x));
    if (s != null && d != null && rs != null && rd != null && /[<≤]|upto|up to|below/.test(r)) return s >= rs || d >= rd ? "high" : "normal";
    return given ?? null;
  }
  const v = num(value);
  if (v == null || !r) return given ?? null;
  const between = r.match(/(-?\d+(?:\.\d+)?)\s*(?:-|to)\s*(-?\d+(?:\.\d+)?)/);
  if (between) {
    const lo = Number(between[1]);
    const hi = Number(between[2]);
    return v < lo ? "low" : v > hi ? "high" : "normal";
  }
  const upper = r.match(/(?:<|≤|upto|up to|below|less than)\s*=?\s*(-?\d+(?:\.\d+)?)/);
  if (upper) return v > Number(upper[1]) ? "high" : "normal";
  const lower = r.match(/(?:>|≥|above|more than)\s*=?\s*(-?\d+(?:\.\d+)?)/);
  if (lower) return v < Number(lower[1]) ? "low" : "normal";
  return given ?? null;
}

/** Lower and upper normal limits from a printed range, when they can be read. */
export function parseRange(range: string | null | undefined): { lo: number | null; hi: number | null } {
  const r = String(range || "").toLowerCase().replace(/,/g, "").replace(/[–—]/g, "-").trim();
  if (!r || r.includes("/")) return { lo: null, hi: null };
  const between = r.match(/(-?\d+(?:\.\d+)?)\s*(?:-|to)\s*(-?\d+(?:\.\d+)?)/);
  if (between) return { lo: Number(between[1]), hi: Number(between[2]) };
  const upper = r.match(/(?:<|≤|upto|up to|below|less than)\s*=?\s*(-?\d+(?:\.\d+)?)/);
  if (upper) return { lo: null, hi: Number(upper[1]) };
  const lower = r.match(/(?:>|≥|above|more than)\s*=?\s*(-?\d+(?:\.\d+)?)/);
  if (lower) return { lo: Number(lower[1]), hi: null };
  return { lo: null, hi: null };
}

/** "12-15" → "12–15" for display. */
export function prettyRange(range: string | null | undefined): string {
  return String(range || "").replace(/\s*-\s*(?=\d)/g, "–").replace(/^</, "< ").replace(/^>/, "> ").replace(/\s{2,}/g, " ").trim();
}

/** "+0.12" / "−0.6": the true minus sign reads better next to numbers. */
export function signed(n: number): string {
  const v = Math.round(n * 100) / 100;
  return v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0";
}

const SHORT: Array<[RegExp, string]> = [
  [/^h(a)?emoglobin\b|^hb\b|^hgb\b/i, "Hb"],
  [/^creatinine/i, "Creat"],
  [/^platelet/i, "Plt"],
  [/^(total )?wbc|white blood|total leu[ck]ocyte/i, "WBC"],
  [/^rbc|red blood/i, "RBC"],
  [/^hba1c|glycated|glycosylated/i, "HbA1c"],
  [/^tsh|thyroid stimulating/i, "TSH"],
  [/^fasting (blood )?(glucose|sugar)/i, "FBS"],
  [/^(post ?prandial|pp) (blood )?(glucose|sugar)/i, "PPBS"],
  [/^random (blood )?(glucose|sugar)/i, "RBS"],
  [/^ldl/i, "LDL"],
  [/^hdl/i, "HDL"],
  [/^triglyceride/i, "TG"],
  [/^(total )?cholesterol/i, "Chol"],
  [/^(blood )?urea/i, "Urea"],
  [/^sodium/i, "Na"],
  [/^potassium/i, "K"],
  [/^sgpt|^alt\b/i, "SGPT"],
  [/^sgot|^ast\b/i, "SGOT"],
  [/^vitamin d|^25.?oh/i, "Vit D"],
  [/^vitamin b.?12/i, "B12"],
];

/** Short name for a value chip: "Haemoglobin" → "Hb". */
export function shortTestName(name: string): string {
  const n = name.trim();
  for (const [re, short] of SHORT) if (re.test(n)) return short;
  return n.length > 12 ? `${n.slice(0, 11).trim()}…` : n;
}

/* ── dates ─────────────────────────────────────────────────────────────── */

const IST = "Asia/Kolkata";
const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };

/** "2026-04-22", "22 Apr 2026", "22/04/2026" (Indian order) → YYYY-MM-DD. */
export function isoOf(text: string | null | undefined): string | null {
  const t = String(text || "").trim().toLowerCase();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/(\d{1,2})[\s-]+([a-z]{3,9})[a-z]*[\s,-]+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[2].startsWith("sept") ? "sept" : m[2].slice(0, 3)];
    if (mon !== undefined) return `${m[3]}-${String(mon + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = t.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

const utcDay = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** YYYY-MM-DD → "22 Apr 2026". */
export function fmtIsoDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!iso) return "";
  const d = utcDay(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
}

/** YYYY-MM-DD → "Apr". */
export function monthLabel(iso: string | null | undefined): string {
  return fmtIsoDate(iso, { month: "short" });
}

/** Today's date in IST as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: IST });
}

function dayWord(iso: string, now = new Date()): string | null {
  const today = todayIso(now);
  if (iso === today) return "Today";
  const y = todayIso(new Date(now.getTime() - 86_400_000));
  return iso === y ? "Yesterday" : null;
}

/** The date a record shows: the printed date, else the day it was added ("Today", "Yesterday", "3 Oct 2026"). */
export function recordDateLabel(doc: Pick<LabDocument, "record_date" | "created_at">, now = new Date()): string {
  const printed = isoOf(doc.record_date);
  if (printed) return fmtIsoDate(printed);
  if (doc.record_date) return doc.record_date;
  if (!doc.created_at) return "";
  const d = new Date(doc.created_at);
  if (Number.isNaN(d.getTime())) return "";
  const iso = todayIso(d);
  return dayWord(iso, now) ?? fmtIsoDate(iso);
}

/** "today 9:40 PM", "yesterday 9:40 PM", "3 Oct, 9:40 PM". */
export function addedAt(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST }).toUpperCase();
  const word = dayWord(todayIso(d), now);
  if (word) return `${word.toLowerCase()} ${time}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST })}, ${time}`;
}

/** When the next visit is, from a printed date or "Review after 1 month" plus the record date. */
export function nextVisitDate(r: Pick<DraftReading, "nextVisit" | "recordDate">): string | null {
  if (r.nextVisit?.date) return r.nextVisit.date;
  if (!r.nextVisit?.text) return null;
  const m = r.nextVisit.text.toLowerCase().match(/(\d+|one|two|three|four|six)\s*(day|week|month)s?/);
  if (!m) return null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, six: 6 };
  const n = Number(m[1]) || words[m[1]] || 0;
  const from = r.recordDate ? utcDay(r.recordDate) : utcDay(todayIso());
  const days = m[2] === "day" ? n : m[2] === "week" ? n * 7 : n * 30;
  return new Date(from.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** "early November", "mid March", "late April". */
export function roughly(iso: string): string {
  const d = utcDay(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getUTCDate();
  const part = day <= 10 ? "early" : day <= 20 ? "mid" : "late";
  return `${part} ${d.toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" })}`;
}

/* ── medicine times ───────────────────────────────────────────────────── */

export const SLOTS: Array<{ id: MedicineSlot; label: string; time: string }> = [
  { id: "morning", label: "Morning", time: "08:00" },
  { id: "afternoon", label: "Afternoon", time: "13:00" },
  { id: "evening", label: "Evening", time: "18:00" },
  { id: "night", label: "Night", time: "21:00" },
];

/** Which part of the day a time belongs to. */
export function slotOf(time: string): MedicineSlot {
  const h = Number(time.slice(0, 2));
  if (h >= 4 && h < 12) return "morning";
  if (h >= 12 && h < 16) return "afternoon";
  if (h >= 16 && h < 20) return "evening";
  return "night";
}

/** The time a slot starts at: before breakfast moves the morning dose to 07:30. */
export function defaultTime(slot: MedicineSlot, food: string | null | undefined): string {
  if (slot === "morning" && (food === "before_food" || food === "empty_stomach")) return "07:30";
  return SLOTS.find((s) => s.id === slot)!.time;
}

export const isClock = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** "08:00" → "8:00 AM". */
export function fmtClock(t: string): string {
  if (!isClock(t)) return t;
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export const FOOD_LABEL: Record<string, string> = {
  before_food: "Before food",
  after_food: "After food",
  with_food: "With food",
  empty_stomach: "On an empty stomach",
};

/* ── people ───────────────────────────────────────────────────────────── */

export type Pronouns = { subject: string; object: string; possessive: string; owned: string; self: boolean };

const FEMALE = /^(mother|mom|mum|maa|amma|mummy|grandmother|grandma|dadi|nani|wife|daughter|sister|aunt|aunty|mother-in-law|daughter-in-law|sister-in-law|bua|mausi|chachi|mami|bhabhi|didi)\b/;
const MALE = /^(father|dad|papa|pitaji|grandfather|grandpa|dada|nana|husband|son|brother|uncle|father-in-law|son-in-law|brother-in-law|chacha|mama|mausa|fufa|bhaiya)\b/;

/** her / his / their (from the relationship), or you for self care. */
export function pronounsFor(person: { relation?: string; self?: boolean } | null | undefined): Pronouns {
  if (person?.self) return { subject: "you", object: "you", possessive: "your", owned: "yours", self: true };
  const r = (person?.relation || "").toLowerCase().trim();
  if (FEMALE.test(r)) return { subject: "she", object: "her", possessive: "her", owned: "hers", self: false };
  if (MALE.test(r)) return { subject: "he", object: "him", possessive: "his", owned: "his", self: false };
  return { subject: "they", object: "them", possessive: "their", owned: "theirs", self: false };
}

const HONORIFIC = /^(mr|mrs|ms|miss|smt|shri|sri|dr|late)\.?$/i;

/** "Smt. Vasundara Devi" → "Vasundara". */
export function firstNameOf(name: string | null | undefined): string {
  const parts = String(name || "").split(/\s+/).filter(Boolean);
  const first = parts.find((p) => !HONORIFIC.test(p));
  return first ?? parts[0] ?? "";
}

/* ── errors people can read ───────────────────────────────────────────── */

/** Server messages that already read like a person wrote them (short, a sentence, no code words). */
function readsHuman(message: string): boolean {
  if (!message || message.length > 160) return false;
  if (!/^[A-Z]/.test(message)) return false;
  if (/[{}<>_`]|error|exception|failed with|status|undefined|null|ECONN|ETIMEDOUT|fetch|stack|request failed|invalid response/i.test(message)) return false;
  return true;
}

/** A message to show instead of the raw server error. */
export function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.code === "person_mismatch") return "First choose whose report this is.";
    if (err.status === 401) return "Your session ended. Please sign in again.";
    if (err.status === 403) return "Only caregivers of this family can do this.";
    if (err.status === 413) return "This file is too large. The maximum is 15 MB.";
    if (err.status === 503) return "Kavach can't be reached right now. Please try again in a minute.";
    if (err.status >= 500) return fallback;
    return readsHuman(err.message) ? err.message : fallback;
  }
  if (err instanceof Error) {
    if (/taking too long/i.test(err.message)) return "This is taking longer than usual. Please try again in a minute.";
    if (/failed to fetch|network|load failed|cannot reach/i.test(err.message)) return "Couldn't reach Kavach. Check your internet and try again.";
  }
  return fallback;
}
