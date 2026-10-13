"use client";
/**
 * Food & nutrition in the "Food diary" design (founder's choice, plan §N18 Q10): each day is a dated diary page, meals
 * are entries on ruled lines with their numbers in the margin, and a slim summary bar sits on top.
 *
 * Data: engine GET /v2/dash/{f}/{s}/nutrition?days=1|7|30&day=YYYY-MM-DD through the backend's care-memory/nutrition
 * (caregiver scope). The types below are the draft contract, shaped on plan §N2 (entries, pantry, targets as care facts)
 * and §N18 (targets are optional and carry who set them and how strict they are). When
 * contracts/dash.nutrition.schema.json lands, lib/engine.gen.ts replaces them.
 */

import {
  Barcode,
  Camera,
  CaretLeft,
  CaretRight,
  ChatCircleText,
  Coffee,
  Cube,
  DotsThree,
  Drop,
  Egg,
  LockSimple,
  Plus,
  WarningCircle,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { request } from "@/lib/activity-api";
import { cn } from "@/lib/utils";
import { IST, parseIst } from "./feature-kit";

/* ── draft contract ─────────────────────────────────────────────────────── */

export type NutrientKey =
  | "energy_kcal"
  | "protein_g"
  | "carbs_g"
  | "sugar_g"
  | "added_sugar_g"
  | "fibre_g"
  | "fat_g"
  | "sat_fat_g"
  | "cholesterol_mg"
  | "sodium_mg"
  | "potassium_mg"
  | "calcium_mg"
  | "iron_mg"
  | "vit_d_mcg"
  | "b12_mcg"
  | "caffeine_mg"
  | "water_g";
export type Nutrients = Partial<Record<NutrientKey, number>>;
export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner" | "other";
/** How sure the numbers are (§N2 nutrition_entries.confidence). */
export type Confidence = "label" | "said" | "photo" | "estimate" | "unquantified";
export type EntrySource = "chat" | "photo" | "label" | "order" | "dashboard" | "caregiver" | "nudge" | "backfill";
/** §N18 Q6: anyone in the care circle can set a target; it records who and how strict. */
export type TargetSetter = "caregiver" | "self" | "doctor" | "dietitian" | "trainer" | "other";
export type Strictness = "strict" | "guide";

/** One item eaten (a nutrition_entries row). */
export type NutritionEntry = {
  id: string;
  mealId: string;
  meal: MealSlot;
  eatenAt: string;
  /** Display name, already in the right number: "boiled eggs", "moong dal". */
  name: string;
  /** Their own words, when different: "do ande". */
  nameSaid: string | null;
  quantity: number | null;
  /** Household unit: "katori", "plate", "cup"; null for counted things (2 eggs). */
  unit: string | null;
  /** The measure behind it, when known: "150 ml", "180 g". */
  portion: string | null;
  grams: number | null;
  nutrients: Nutrients;
  confidence: Confidence;
  source: EntrySource;
  consumed: "yes" | "part";
  portionEaten: number | null;
  note: string | null;
};

/** Items grouped as one meal (meal_id). */
export type NutritionMeal = {
  id: string;
  meal: MealSlot;
  at: string;
  /** Signed URL (15 minutes) of the meal photo, when one was used. */
  photoUrl: string | null;
  loggedBy: { id: string | null; name: string; role: "self" | "caregiver" | "elder" | "saheli" };
  /** One line on where it came from, written by the engine: "From Maa's photo, she confirmed at 08:14". */
  note: string | null;
  items: NutritionEntry[];
  totals: Nutrients;
  canUndo: boolean;
};

export type MissingMeal = { meal: Exclude<MealSlot, "other">; usual: string | null; pendingId: string | null };

export type NutritionDay = {
  day: string;
  meals: NutritionMeal[];
  missing: MissingMeal[];
  totals: Nutrients;
  water: { glasses: number; glassMl: number };
};

/** A target (care fact in domain nutrition_target). A goal to reach has only min; a limit only max; a range both. */
export type NutritionTarget = {
  key: string;
  nutrient: NutrientKey | "water_glasses";
  min: number | null;
  max: number | null;
  setBy: TargetSetter;
  setByName: string | null;
  how: Strictness;
  status: "active" | "pending";
};

/** A food rule ("max 2 eggs a day"), also a nutrition_target fact. */
export type FoodRule = {
  key: string;
  text: string;
  setBy: TargetSetter;
  setByName: string | null;
  how: Strictness;
  counter: string | null;
  max: number | null;
  period: "day" | "week";
};

export type NutritionCounter = {
  key: "eggs" | "water" | "tea" | "sugar_tsp" | string;
  label: string;
  unit: string;
  today: number;
  usual: number;
  week: number;
  usualWeek: number;
  goal: number | null;
  limit: number | null;
};

export type CalendarDay = { day: string; tracked: boolean; logged: MealSlot[]; kcal: number | null };
export type WeekDay = { day: string; kcal: number | null; protein: number | null; logged: number };

export type PantryItem = {
  id: string;
  name: string;
  count: number;
  of: number | null;
  unit: string;
  service: string | null;
  serviceLabel: string | null;
  addedAt: string;
  bestBefore: string | null;
};

/** A delivered restaurant meal that counts only after a yes (§N6.1). */
export type PendingMeal = {
  id: string;
  taskId: string;
  service: string;
  serviceLabel: string;
  title: string;
  deliveredAt: string;
  meal: MealSlot;
  kcal: number | null;
  protein: number | null;
  askedAt: string | null;
};

export type Noticed = { id: string; kind: "pattern" | "learned" | "deviation"; text: string; at: string; undoTarget: string | null };

export type ShareLink = { id: string; url: string; days: number; forName: string | null; createdAt: string; expiresAt: string; revokedAt: string | null; opens: number };

export type NutritionView = {
  subjectId: string;
  today: string;
  day: string;
  range: 1 | 7 | 30;
  from: string;
  to: string;
  tracking: { level: "full" | "off"; since: string | null };
  /** Condition-aware rows (display only, §N7.2): diabetes → sugar and carbs, high BP → sodium. */
  conditions: Array<{ key: string; label: string; nutrients: NutrientKey[] }>;
  targets: NutritionTarget[];
  rules: FoodRule[];
  days: NutritionDay[];
  calendar: CalendarDay[];
  week: WeekDay[];
  averages: { d7: Nutrients; d30: Nutrients; d7Days: number; d30Days: number };
  counters: NutritionCounter[];
  pantry: PantryItem[];
  pending: PendingMeal[];
  noticed: Noticed[];
  shares: ShareLink[];
  /** Their own foods, for Add food's suggestions. */
  foods: Array<{ name: string; unit: string }>;
  /** When Saheli will next ask about a meal she hasn't heard about (Kavach NUdge). */
  nextAsk: { meal: MealSlot; at: string } | null;
};

/* ── API (backend care-memory/nutrition/*) ──────────────────────────────── */

function base(familyId: string, subjectId: string) {
  return `/api/families/${encodeURIComponent(familyId)}/subjects/${encodeURIComponent(subjectId)}/care-memory/nutrition`;
}
const send = <T,>(url: string, body: unknown, method = "POST") =>
  request<T>(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, 45_000);

export async function getNutrition(familyId: string, subjectId: string, range: 1 | 7 | 30, day: string | null): Promise<NutritionView> {
  const q = new URLSearchParams({ days: String(range) });
  if (day) q.set("day", day);
  const data = await request<NutritionView>(`${base(familyId, subjectId)}?${q}`, {}, 45_000);
  if (!data) throw new Error("Couldn't load food and nutrition");
  return data;
}
export const addFood = (f: string, s: string, body: { name: string; quantity: number; unit: string; meal: MealSlot; eatenAt: string }) => send(`${base(f, s)}/entries`, body);
export const changeEntry = (f: string, s: string, id: string, set: { quantity?: number; deleted?: boolean }) => send(`${base(f, s)}/entries/${encodeURIComponent(id)}`, set, "PATCH");
export const confirmEaten = (f: string, s: string, pendingId: string, answer: "yes" | "part" | "no") => send(`${base(f, s)}/confirm`, { pendingId, answer });
export const undoChange = (f: string, s: string, target: string) => send(`${base(f, s)}/undo`, { target });
export const shareWithDoctor = (f: string, s: string, body: { kind: "pdf" | "link"; days: number }) => send<{ url: string; share: ShareLink | null }>(`${base(f, s)}/share`, body);
export const revokeShare = (f: string, s: string, id: string) => send(`${base(f, s)}/share/${encodeURIComponent(id)}`, {}, "DELETE");

/* ── words and numbers ──────────────────────────────────────────────────── */

export const MEAL_ORDER: MealSlot[] = ["breakfast", "lunch", "snack", "dinner", "other"];
export const MEAL_LABEL: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner", other: "Through the day" };
export const MEAL_SHORT: Record<MealSlot, string> = { breakfast: "B", lunch: "L", snack: "S", dinner: "D", other: "·" };
export const MAIN_MEALS = MEAL_ORDER.slice(0, 4) as Array<Exclude<MealSlot, "other">>;

export const NUTRIENT: Record<NutrientKey | "water_glasses", { label: string; unit: string; dp: number }> = {
  energy_kcal: { label: "Energy", unit: "kcal", dp: 0 },
  protein_g: { label: "Protein", unit: "g", dp: 0 },
  carbs_g: { label: "Carbs", unit: "g", dp: 0 },
  sugar_g: { label: "Sugar", unit: "g", dp: 0 },
  added_sugar_g: { label: "Added sugar", unit: "g", dp: 0 },
  fibre_g: { label: "Fibre", unit: "g", dp: 0 },
  fat_g: { label: "Fat", unit: "g", dp: 0 },
  sat_fat_g: { label: "Saturated fat", unit: "g", dp: 0 },
  cholesterol_mg: { label: "Cholesterol", unit: "mg", dp: 0 },
  sodium_mg: { label: "Sodium", unit: "mg", dp: 0 },
  potassium_mg: { label: "Potassium", unit: "mg", dp: 0 },
  calcium_mg: { label: "Calcium", unit: "mg", dp: 0 },
  iron_mg: { label: "Iron", unit: "mg", dp: 1 },
  vit_d_mcg: { label: "Vitamin D", unit: "mcg", dp: 1 },
  b12_mcg: { label: "Vitamin B12", unit: "mcg", dp: 1 },
  caffeine_mg: { label: "Caffeine", unit: "mg", dp: 0 },
  water_g: { label: "Water", unit: "g", dp: 0 },
  water_glasses: { label: "Water", unit: "glasses", dp: 0 },
};

export const SETTER: Record<TargetSetter, string> = { caregiver: "Caregiver", self: "Self", doctor: "Doctor", dietitian: "Dietitian", trainer: "Trainer", other: "Other" };

export function num(v: number | null | undefined, dp = 0) {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** "1,400–1,600", "max 25", "60". */
export function targetText(t: NutritionTarget, dp = 0) {
  if (t.min != null && t.max != null) return t.min === t.max ? num(t.min, dp) : `${num(t.min, dp)}–${num(t.max, dp)}`;
  if (t.max != null) return `max ${num(t.max, dp)}`;
  return num(t.min, dp);
}

export type TargetState = "none" | "under" | "met" | "within" | "over";
export function targetState(v: number | null | undefined, t: NutritionTarget | undefined): TargetState {
  if (v == null || !t) return "none";
  // a single number ("2,200 kcal") counts as kept within 10%
  if (t.min != null && t.min === t.max) return v > t.max * 1.1 ? "over" : v < t.min * 0.9 ? "under" : "met";
  if (t.max != null && v > t.max) return "over";
  if (t.min != null && v < t.min) return "under";
  return t.min == null ? "within" : "met";
}

export const dayDate = (day: string) => parseIst(day);
export const fmtDayLong = (day: string, opts: Intl.DateTimeFormatOptions) => dayDate(day).toLocaleDateString("en-IN", { ...opts, timeZone: IST });
export function shiftDay(day: string, n: number) {
  const d = dayDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: IST });
}

/* ── small pieces ───────────────────────────────────────────────────────── */

const CONF: Record<Confidence, { text: string; hint: string; icon: PhosphorIcon | null }> = {
  label: { text: "Label", hint: "Read from the pack's nutrition label", icon: Barcode },
  said: { text: "Said", hint: "The amount as it was said", icon: ChatCircleText },
  photo: { text: "Photo", hint: "Estimated from the meal photo", icon: Camera },
  estimate: { text: "Estimate", hint: "Saheli's estimate: the amount wasn't clear", icon: null },
  unquantified: { text: "No amount", hint: "Eaten, amount not known", icon: null },
};

/** How sure an item's numbers are: Label, Said, Photo or Estimate. */
export function ConfidenceBadge({ c, className }: { c: Confidence; className?: string }) {
  const m = CONF[c];
  const loose = c === "estimate" || c === "unquantified";
  return (
    <span
      title={m.hint}
      className={cn(
        "inline-flex h-[20px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-medium",
        c === "label" && "bg-[var(--c-solid-soft)] text-[var(--c-ok-ink)]",
        (c === "said" || c === "photo") && "border border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink-2)]",
        loose && "border border-dashed border-[var(--c-ink-3)] text-[var(--c-ink-2)]",
        className,
      )}
    >
      {m.icon ? <m.icon size={11} weight="bold" aria-hidden /> : <span aria-hidden>≈</span>}
      {m.text}
    </span>
  );
}

/** "Strict" (filled) or "guide" (plain words), after who set it. */
export function SetBy({ t, short, className }: { t: NutritionTarget; short?: boolean; className?: string }) {
  const who = t.setBy === "caregiver" && t.setByName ? t.setByName : SETTER[t.setBy];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1 text-[11px] text-[var(--c-ink-2)]", className)} title={t.setByName ? `Set by ${t.setByName} (${SETTER[t.setBy].toLowerCase()})` : undefined}>
      <span className="truncate">{short ? who : `${who}${t.setByName && t.setBy !== "caregiver" ? ` · ${t.setByName}` : ""}`}</span>
      <span aria-hidden className="shrink-0">·</span>
      {t.how === "strict" ? <StrictChip /> : <span className="shrink-0">guide</span>}
      {t.status === "pending" && <span className="shrink-0 text-[var(--c-accent-text)]">· waiting for OK</span>}
    </span>
  );
}

export function StrictChip() {
  return (
    <span className="inline-flex h-[17px] shrink-0 items-center gap-0.5 rounded-full bg-[var(--c-solid)] px-1.5 text-[10px] font-medium text-[var(--c-on-solid)]">
      <LockSimple size={9} weight="bold" aria-hidden />
      Strict
    </span>
  );
}

/** A 4px meter: jade fill on a pale jade track; red only past a strict limit. A range marks where it starts. */
export function Meter({ value, t, className }: { value: number | null | undefined; t: NutritionTarget | undefined; className?: string }) {
  if (!t) return <div className={cn("h-1", className)} aria-hidden />;
  const top = t.max ?? t.min ?? 1;
  const v = value ?? 0;
  const st = targetState(value, t);
  const pct = Math.max(0, Math.min(1, v / top));
  return (
    <div className={cn("relative h-1 rounded-full bg-[var(--c-solid-soft)]", className)} aria-hidden>
      <div className={cn("absolute inset-y-0 left-0 rounded-full", st === "over" && t.how === "strict" ? "bg-[var(--c-danger)]" : "bg-[var(--n-mark)]")} style={{ width: `${pct * 100}%` }} />
      {t.min != null && t.max != null && t.min !== t.max && (
        <span className="absolute -top-[3px] h-[10px] w-[2px] rounded-full bg-[var(--c-ink-2)]" style={{ left: `calc(${(t.min / t.max) * 100}% - 1px)` }} />
      )}
    </div>
  );
}

export function IconBtn({ label, onClick, children, disabled, className }: { label: string; onClick?: () => void; children: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink)] transition-colors hover:bg-[var(--c-card)] disabled:opacity-35",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── the slim summary bar ───────────────────────────────────────────────── */

const SUMMARY: Array<NutrientKey | "water_glasses"> = ["energy_kcal", "protein_g", "carbs_g", "fat_g", "fibre_g", "water_glasses"];

/** kcal, protein, carbs, fat, fibre and water against their targets, when someone set one. */
export function SummaryBar({
  values,
  targets,
  hitDays,
  className,
}: {
  values: Partial<Record<NutrientKey | "water_glasses", number | null>>;
  targets: NutritionTarget[];
  /** Week and month: on how many days each target was kept. */
  hitDays?: Partial<Record<NutrientKey | "water_glasses", { hit: number; of: number }>>;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-[var(--c-line)] sm:grid-cols-3 lg:grid-cols-6", className)}>
      {SUMMARY.map((k) => {
        const meta = NUTRIENT[k];
        const t = targets.find((x) => x.nutrient === k && x.status === "active");
        const v = values[k];
        const st = targetState(v, t);
        const strictOver = st === "over" && t?.how === "strict";
        const hd = hitDays?.[k];
        return (
          <div key={k} className="min-w-0 bg-[var(--c-frame)] px-3 pb-3 pt-2.5 sm:px-3.5">
            <div className="flex items-center justify-between gap-1.5">
              <span className="truncate text-[11.5px] text-[var(--c-ink-2)]">
                {meta.label} · {meta.unit}
              </span>
            </div>
            <p className="mt-1 flex items-baseline gap-1 whitespace-nowrap">
              <span className={cn("c-num text-[20px] leading-none sm:text-[22px]", strictOver && "text-[var(--c-danger-ink)]")}>{num(v, k === "water_glasses" ? 0 : meta.dp)}</span>
              {t && <span className="truncate text-[11.5px] text-[var(--c-ink-2)] sm:text-[12px]">/ {targetText(t)}</span>}
              {strictOver && <WarningCircle size={14} weight="fill" className="shrink-0 self-center text-[var(--c-danger-ink)]" aria-label="over the limit" />}
            </p>
            <Meter value={v} t={t} className="mt-2" />
            <p className="mt-1.5 truncate text-[11px] text-[var(--c-ink-2)]">
              {t ? (
                <>
                  {hd ? `${hd.hit} of ${hd.of} days · ` : ""}
                  <SetBy t={t} short className="align-middle" />
                </>
              ) : (
                "No target"
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── the diary page ─────────────────────────────────────────────────────── */

/** Margin | entry | kcal | protein. The ruled lines run across all four. */
export const DIARY_COLS = "grid grid-cols-[46px_minmax(0,1fr)_46px_46px] sm:grid-cols-[88px_minmax(0,1fr)_80px_80px]";
const MARGIN_RULE = "border-r border-[color-mix(in_srgb,var(--c-accent)_70%,transparent)]";
const NUM_CELL = "flex items-center justify-end border-b border-l border-[var(--c-line)] pr-2 c-num text-[13px] tabular-nums tracking-normal sm:pr-3.5";
const BODY_CELL = "min-w-0 border-b border-[var(--c-line)] pl-2.5 pr-1.5 sm:pl-5 sm:pr-3";

export function DiaryColumnHeads({ left = "" }: { left?: string }) {
  return (
    <div className={cn(DIARY_COLS, "text-[11px] font-medium text-[var(--c-ink-2)]")}>
      <div className={cn(MARGIN_RULE, "border-b border-[var(--c-line)] py-2.5 pr-2 text-right sm:pr-4")}>
        <span className="hidden whitespace-nowrap sm:inline">{left}</span>
      </div>
      <div className="border-b border-[var(--c-line)]" />
      <div className="flex items-center justify-end border-b border-l border-[var(--c-line)] pr-2.5 sm:pr-3.5">kcal</div>
      <div className="flex items-center justify-end border-b border-l border-[var(--c-line)] pr-2.5 sm:pr-3.5">
        <span className="sm:hidden">prot. g</span>
        <span className="hidden sm:inline">protein g</span>
      </div>
    </div>
  );
}

export function clockOf(iso: string) {
  return parseIst(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
}

export type MealAction = "edit" | "add" | "move" | "delete" | "undo";

/** One meal written as a diary entry: time and photo in the margin, items on ruled lines, kcal and protein beside. */
export function MealEntry({ meal, onAction, menuOpen, onMenu }: { meal: NutritionMeal; onAction: (a: MealAction, meal: NutritionMeal) => void; menuOpen?: boolean; onMenu?: (open: boolean) => void }) {
  const rows = meal.items.length + 1;
  const other = meal.meal === "other";
  return (
    <div className={DIARY_COLS} id={`meal-${meal.id}`}>
      <div className={cn(MARGIN_RULE, "flex flex-col items-end gap-2 border-b border-[var(--c-line)] pr-2 pt-3 sm:pr-4")} style={{ gridRow: `span ${rows} / span ${rows}` }}>
        <span className="c-num text-[12.5px] font-medium leading-none sm:text-[14px]">{other ? "all day" : clockOf(meal.at)}</span>
        {meal.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meal.photoUrl} alt={`Photo of ${MEAL_LABEL[meal.meal].toLowerCase()}`} className="h-9 w-9 rounded-[10px] object-cover sm:h-[60px] sm:w-[60px] sm:rounded-[14px]" />
        ) : other ? (
          <Drop size={16} className="text-[var(--c-ink-2)]" aria-hidden />
        ) : null}
      </div>
      <div className={cn(BODY_CELL, "flex min-h-[46px] flex-wrap items-center gap-x-2.5 gap-y-0.5 py-2")}>
        <h3 className="text-[15px] font-medium leading-tight">{MEAL_LABEL[meal.meal]}</h3>
        {meal.note && <p className="min-w-0 text-[12px] leading-snug text-[var(--c-ink-2)] max-sm:basis-full max-sm:order-3">{meal.note}</p>}
        <div className="relative ml-auto">
          <button
            type="button"
            aria-label={`Change ${MEAL_LABEL[meal.meal].toLowerCase()}`}
            aria-haspopup="menu"
            aria-expanded={Boolean(menuOpen)}
            onClick={() => onMenu?.(!menuOpen)}
            className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[var(--c-ink-2)] transition-colors hover:bg-[var(--c-card)] hover:text-[var(--c-ink)]", menuOpen && "bg-[var(--c-card)] text-[var(--c-ink)]")}
          >
            <DotsThree size={18} weight="bold" />
          </button>
          {menuOpen && <MealMenu meal={meal} onClose={() => onMenu?.(false)} onAction={onAction} />}
        </div>
      </div>
      <div className={cn(NUM_CELL, "text-[14px] font-medium")}>{num(meal.totals.energy_kcal)}</div>
      <div className={cn(NUM_CELL, "text-[14px] font-medium")}>{num(meal.totals.protein_g, 1)}</div>
      {meal.items.map((it) => (
        <ItemLine key={it.id} it={it} />
      ))}
    </div>
  );
}

function ItemLine({ it }: { it: NutritionEntry }) {
  const qty = it.quantity != null ? `${num(it.quantity, it.quantity % 1 ? 1 : 0)}${it.unit ? ` ${it.unit}` : ""}` : "";
  return (
    <>
      <div className={cn(BODY_CELL, "flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-1 py-2")}>
        <p className="min-w-0 text-[14px] leading-snug">
          {qty && <span className="font-medium">{qty} </span>}
          {it.name}
          {it.portion && <span className="text-[var(--c-ink-2)]"> · {it.portion}</span>}
          {it.consumed === "part" && <span className="text-[var(--c-ink-2)]"> · ate part</span>}
          {it.nameSaid && <span className="hidden text-[12px] text-[var(--c-ink-2)] sm:inline"> &ldquo;{it.nameSaid}&rdquo;</span>}
        </p>
        <ConfidenceBadge c={it.confidence} className="sm:ml-auto" />
      </div>
      <div className={cn(NUM_CELL, "text-[var(--c-ink-2)]")}>{num(it.nutrients.energy_kcal)}</div>
      <div className={cn(NUM_CELL, "text-[var(--c-ink-2)]")}>{it.nutrients.protein_g ? num(it.nutrients.protein_g, 1) : num(it.nutrients.protein_g)}</div>
    </>
  );
}

function MealMenu({ meal, onClose, onAction }: { meal: NutritionMeal; onClose: () => void; onAction: (a: MealAction, meal: NutritionMeal) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const off = (e: MouseEvent) => !ref.current?.parentElement?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  const items: Array<{ a: MealAction; label: string; danger?: boolean }> = [
    { a: "edit", label: "Change amounts" },
    { a: "add", label: "Add an item" },
    { a: "move", label: "Change time or meal" },
    { a: "delete", label: "Remove this meal", danger: true },
  ];
  return (
    <div ref={ref} role="menu" className="absolute right-0 top-[calc(100%+6px)] z-30 w-[230px] rounded-[18px] border border-[var(--c-line)] bg-[var(--c-frame)] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)]">
      {items.map((i) => (
        <button
          key={i.a}
          type="button"
          role="menuitem"
          onClick={() => {
            onAction(i.a, meal);
            onClose();
          }}
          className={cn("flex w-full items-center rounded-[12px] px-3 py-2 text-left text-[13px] hover:bg-[var(--c-card)]", i.danger && "text-[var(--c-danger-ink)]")}
        >
          {i.label}
        </button>
      ))}
      {meal.canUndo && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onAction("undo", meal);
            onClose();
          }}
          className="mt-1 flex w-full flex-col items-start rounded-[12px] border-t border-[var(--c-line)] px-3 pb-2 pt-2.5 text-left text-[13px] hover:bg-[var(--c-card)]"
        >
          Undo the last change
          <span className="text-[11px] text-[var(--c-ink-2)]">{meal.loggedBy.name}, {clockOf(meal.at)}</span>
        </button>
      )}
    </div>
  );
}

/** A meal nobody has told Saheli about: a soft slot with "+ Add". */
export function NotLogged({ m, note, onAdd, onNote }: { m: MissingMeal; note?: string | null; onAdd: () => void; onNote?: () => void }) {
  return (
    <div className={DIARY_COLS}>
      <div className={cn(MARGIN_RULE, "flex flex-col items-end border-b border-[var(--c-line)] pr-2 pt-3.5 sm:pr-4")}>
        {m.usual && <span className="c-num text-[12.5px] leading-none text-[var(--c-ink-2)] sm:text-[14px]">~{m.usual}</span>}
      </div>
      <div className={cn(BODY_CELL, "py-2")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[14px] border border-dashed border-[var(--c-line)] px-3 py-2 sm:px-3.5">
          <span className="text-[14px] font-medium text-[var(--c-ink-2)]">{MEAL_LABEL[m.meal]}</span>
          <span className="text-[12.5px] text-[var(--c-ink-2)]">Not logged{m.usual ? ` · usually around ${m.usual}` : ""}</span>
          <button
            type="button"
            onClick={onAdd}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-3 text-[12px] font-medium transition-colors hover:border-[var(--c-ink-2)]"
          >
            <Plus size={12} weight="bold" /> Add
          </button>
          {note && (
            <button type="button" onClick={onNote} className="basis-full text-left text-[12px] text-[var(--c-accent-text)] underline-offset-2 hover:underline">
              {note}
            </button>
          )}
        </div>
      </div>
      <div className={cn(NUM_CELL, "text-[var(--c-ink-2)]")}>—</div>
      <div className={cn(NUM_CELL, "text-[var(--c-ink-2)]")}>—</div>
    </div>
  );
}

/** The ledger close: one rule above, a double rule below. */
export function DiaryTotal({ label, kcal, protein, aside }: { label: string; kcal: number | null | undefined; protein: number | null | undefined; aside?: React.ReactNode }) {
  return (
    <div className={DIARY_COLS}>
      <div className={MARGIN_RULE} />
      <div className="flex min-h-[48px] items-center justify-between gap-3 border-y border-b-[3px] border-[var(--c-ink)] border-b-[var(--c-ink)] [border-bottom-style:double] pl-3 pr-2 sm:pl-5 sm:pr-3">
        <span className="min-w-0 truncate text-[12px] text-[var(--c-ink-2)]">{aside}</span>
        <span className="shrink-0 text-[13px] font-medium">{label}</span>
      </div>
      <div className="c-num flex items-center justify-end border-y border-b-[3px] border-[var(--c-ink)] [border-bottom-style:double] pr-2 text-[14px] font-medium tabular-nums tracking-normal sm:pr-3.5 sm:text-[15px]">{num(kcal)}</div>
      <div className="c-num flex items-center justify-end border-y border-b-[3px] border-[var(--c-ink)] [border-bottom-style:double] pr-2 text-[14px] font-medium tabular-nums tracking-normal sm:pr-3.5 sm:text-[15px]">{num(protein, 1)}</div>
    </div>
  );
}

/* ── the month calendar ─────────────────────────────────────────────────── */

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Each day carries four dots (breakfast, lunch, snack, dinner), filled when logged. The selected day is marigold. */
export function MonthCalendar({
  days,
  selected,
  today,
  range,
  onPick,
  onMonth,
}: {
  days: CalendarDay[];
  selected: string;
  today: string;
  /** Week view: the seven days shown. */
  range?: { from: string; to: string } | null;
  onPick: (day: string) => void;
  onMonth: (dir: -1 | 1) => void;
}) {
  if (!days.length) return null;
  const first = days[0].day;
  const lead = (dayDate(first).getUTCDay() + 6) % 7;
  const month = fmtDayLong(first, { month: "long", year: "numeric" });
  const full = days.filter((d) => d.tracked && MAIN_MEALS.every((m) => d.logged.includes(m))).length;
  const tracked = days.filter((d) => d.tracked && d.day <= today).length;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-medium">{month}</p>
        <div className="flex gap-1.5">
          <IconBtn label="Previous month" onClick={() => onMonth(-1)} className="h-8 w-8">
            <CaretLeft size={14} weight="bold" />
          </IconBtn>
          <IconBtn label="Next month" onClick={() => onMonth(1)} disabled={days[days.length - 1].day >= today} className="h-8 w-8">
            <CaretRight size={14} weight="bold" />
          </IconBtn>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="pb-1 text-[10.5px] font-medium text-[var(--c-ink-2)]">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((d) => {
          const on = d.day === selected;
          const future = d.day > today;
          const inRange = Boolean(range && d.day >= range.from && d.day <= range.to);
          const n = Number(d.day.slice(8, 10));
          const label = `${fmtDayLong(d.day, { weekday: "long", day: "numeric", month: "long" })}: ${
            future ? "not yet" : !d.tracked ? "not tracked" : `${MAIN_MEALS.filter((m) => d.logged.includes(m)).length} of 4 meals logged`
          }`;
          return (
            <div key={d.day} className={cn("flex justify-center py-px", inRange && "bg-[var(--c-solid-soft)]", inRange && d.day === range?.from && "rounded-l-[14px]", inRange && d.day === range?.to && "rounded-r-[14px]")}>
              <button
                type="button"
                onClick={() => onPick(d.day)}
                disabled={future}
                aria-label={label}
                title={label}
                aria-pressed={on}
                className={cn(
                  "flex h-[46px] w-[40px] flex-col items-center justify-center gap-[5px] rounded-[12px] transition-colors",
                  on ? "bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "hover:bg-[var(--c-frame)]",
                  !on && d.day === today && "ring-1 ring-inset ring-[var(--c-ink)]",
                  future && "cursor-default text-[var(--c-ink-3)] hover:bg-transparent",
                )}
              >
                <span className={cn("c-num text-[13px] leading-none", on && "font-medium")}>{n}</span>
                <span className="flex gap-[3px]" aria-hidden>
                  {MAIN_MEALS.map((m) => {
                    const got = d.logged.includes(m);
                    return (
                      <span
                        key={m}
                        className={cn(
                          "h-[4px] w-[4px] rounded-full",
                          future || !d.tracked ? "bg-transparent" : on ? (got ? "bg-[var(--c-accent-ink)]" : "bg-[var(--c-accent-ink)] opacity-25") : got ? "bg-[var(--n-mark)]" : "bg-[var(--c-ink-3)] opacity-40",
                        )}
                      />
                    );
                  })}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-[var(--c-line)] pt-3 text-[11.5px] text-[var(--c-ink-2)]">
        <span className="flex items-center gap-1.5">
          <span className="flex gap-[3px]" aria-hidden>
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--n-mark)]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--n-mark)]" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--c-ink-3)] opacity-40" />
            <span className="h-[5px] w-[5px] rounded-full bg-[var(--n-mark)]" />
          </span>
          Breakfast, lunch, snack, dinner
        </span>
        <span>
          <b className="font-medium text-[var(--c-ink)]">{full}</b> of {tracked} days complete
        </span>
      </div>
    </div>
  );
}

/* ── counters ───────────────────────────────────────────────────────────── */

const COUNTER_ICON: Record<string, PhosphorIcon> = { eggs: Egg, water: Drop, tea: Coffee, sugar_tsp: Cube };

/** Eggs, water, tea, sugar: today as filled beads against what's usual (or the goal). */
export function Counter({ c, rule, mode }: { c: NutritionCounter; rule?: FoodRule; mode: "day" | "week" }) {
  const Icon = COUNTER_ICON[c.key] ?? Egg;
  const now = mode === "day" ? c.today : c.week;
  const usual = mode === "day" ? c.usual : c.usualWeek;
  const limit = mode === "day" ? c.limit : c.limit != null ? c.limit * 7 : null;
  const goal = mode === "day" ? c.goal : c.goal != null ? c.goal * 7 : null;
  const over = limit != null && now > limit;
  const slots = mode === "day" ? Math.min(12, Math.max(now, Math.round(usual), goal ?? 0, limit ?? 0)) : 0;
  return (
    <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-[var(--c-line)] py-3 first:pt-1 last:border-0 last:pb-1">
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--c-frame)]">
        <Icon size={16} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">{c.label}</p>
        {mode === "day" ? (
          <span className="mt-1.5 flex flex-wrap gap-[3px]" aria-hidden>
            {Array.from({ length: slots }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-[10px] w-[10px] rounded-full",
                  i < now ? (limit != null && i >= limit ? "bg-[var(--c-danger)]" : "bg-[var(--n-mark)]") : "border border-[var(--c-ink-3)]",
                  limit != null && i === limit - 1 && "mr-2",
                )}
              />
            ))}
          </span>
        ) : (
          <p className="mt-0.5 truncate text-[11.5px] text-[var(--c-ink-2)]">this week</p>
        )}
      </div>
      <div className="text-right">
        <p className="leading-none">
          <span className={cn("c-num text-[20px]", over && "text-[var(--c-danger-ink)]")}>{now}</span>
          {goal != null && <span className="text-[12px] text-[var(--c-ink-2)]"> / {goal}</span>}
        </p>
        <p className="mt-1 whitespace-nowrap text-[11px] text-[var(--c-ink-2)]">
          usual {num(Math.round(usual))}
          {limit != null ? ` · max ${limit}` : ""}
        </p>
      </div>
      {rule && mode === "day" && (
        <p className="col-start-2 col-end-4 mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-[var(--c-ink-2)]">
          <span>&ldquo;{rule.text}&rdquo;</span>
          <span aria-hidden>·</span>
          <span>{rule.setBy === "caregiver" && rule.setByName ? rule.setByName : SETTER[rule.setBy]}</span>
          <span aria-hidden>·</span>
          {rule.how === "strict" ? <StrictChip /> : <span>guide</span>}
        </p>
      )}
    </div>
  );
}

/* ── the week mini-chart ────────────────────────────────────────────────── */

/** kcal a day as jade columns against the target band; the selected day in marigold. Protein dots underneath
 * (filled when the protein target was reached), on their own row so the chart keeps a single scale. */
export function WeekChart({ week, kcal, protein, selected, onPick, height = 104 }: { week: WeekDay[]; kcal?: NutritionTarget; protein?: NutritionTarget; selected: string; onPick: (day: string) => void; height?: number }) {
  const vals = week.map((w) => w.kcal ?? 0);
  const top = Math.max(...vals, kcal?.max ?? kcal?.min ?? 0, 1) * 1.22;
  const y = (v: number) => (v / top) * height;
  const band = kcal ? { lo: kcal.min ?? 0, hi: kcal.max ?? kcal.min ?? 0 } : null;
  const pTop = protein?.min ?? protein?.max ?? null;
  return (
    <div>
      <div className="relative" style={{ height }}>
        {band && (
          <div
            className="absolute inset-x-0 rounded-[3px] border-y border-[color-mix(in_srgb,var(--n-mark)_30%,transparent)] bg-[var(--c-solid-soft)]"
            style={{ bottom: y(band.lo), height: Math.max(3, y(band.hi) - y(band.lo)) }}
            aria-hidden
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--c-line)]" aria-hidden />
        <div className="absolute inset-0 flex items-end">
          {week.map((w) => {
            const on = w.day === selected;
            const h = w.kcal ? Math.max(4, y(w.kcal)) : 2;
            const label = `${fmtDayLong(w.day, { weekday: "short", day: "numeric", month: "short" })}: ${w.kcal ? `${num(w.kcal)} kcal, ${num(w.protein)} g protein` : "nothing logged"}`;
            return (
              <button key={w.day} type="button" onClick={() => onPick(w.day)} aria-label={label} title={label} aria-pressed={on} className="group relative flex h-full flex-1 items-end justify-center">
                {on && w.kcal ? (
                  <span className="c-num absolute whitespace-nowrap text-[11px] font-medium" style={{ bottom: h + 4 }}>
                    {num(w.kcal)}
                  </span>
                ) : null}
                <span
                  className={cn("block w-[18px] rounded-t-[4px] transition-opacity group-hover:opacity-80", !w.kcal ? "bg-[var(--c-line)]" : on ? "bg-[var(--c-accent)]" : "bg-[var(--n-mark)]")}
                  style={{ height: h }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex">
        {week.map((w) => (
          <span key={w.day} className={cn("flex-1 text-center text-[11px] leading-none", w.day === selected ? "font-medium text-[var(--c-ink)]" : "text-[var(--c-ink-2)]")}>
            {fmtDayLong(w.day, { weekday: "narrow" })}
            <span className="mt-0.5 block text-[10px] tabular-nums">{Number(w.day.slice(8))}</span>
          </span>
        ))}
      </div>
      {pTop != null && (
        <div className="mt-3 border-t border-[var(--c-line)] pt-2">
          <div className="relative h-[38px]">
            {(() => {
              const pMax = Math.max(pTop, ...week.map((w) => w.protein ?? 0)) * 1.15;
              const py = (v: number) => 4 + (1 - v / pMax) * 30;
              return (
                <>
                  <div className="absolute inset-x-0 h-px bg-[color-mix(in_srgb,var(--n-mark)_45%,transparent)]" style={{ top: py(pTop) }} aria-hidden />
                  <span className="absolute right-0 -translate-y-full pb-px text-[10px] text-[var(--c-ink-2)]" style={{ top: py(pTop) }}>
                    {num(pTop)} g
                  </span>
                  <div className="absolute inset-0 flex">
                    {week.map((w) => {
                      const met = w.protein != null && w.protein >= pTop;
                      return (
                        <span key={w.day} className="relative flex-1" title={w.protein != null ? `${num(w.protein)} g protein` : "no protein logged"}>
                          {w.protein != null && (
                            <span
                              className={cn(
                                "absolute left-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--c-card)]",
                                met ? "bg-[var(--n-mark)]" : "border-[1.5px] border-[var(--n-mark)] bg-[var(--c-card)]",
                              )}
                              style={{ top: py(w.protein) }}
                              aria-hidden
                            />
                          )}
                        </span>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-[var(--c-ink-2)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--n-mark)]" aria-hidden /> kcal
        </span>
        {band && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-3.5 rounded-[3px] bg-[var(--c-solid-soft)]" aria-hidden /> target {band.lo === band.hi ? num(band.hi) : `${num(band.lo)}–${num(band.hi)}`}
          </span>
        )}
        {pTop != null && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--n-mark)]" aria-hidden />
            <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-[var(--n-mark)]" aria-hidden /> protein a day, filled when {num(pTop)} g was reached
          </span>
        )}
      </div>
    </div>
  );
}

/* ── nutrients vs targets ───────────────────────────────────────────────── */

const TABLE_ORDER: NutrientKey[] = ["energy_kcal", "protein_g", "carbs_g", "fat_g", "fibre_g", "sugar_g", "added_sugar_g", "sodium_mg", "potassium_mg", "calcium_mg", "iron_mg"];

/** Macros and key micros: the day (or the week's daily average) with 7- and 30-day averages; condition rows first. */
export function NutrientTable({
  now,
  nowLabel,
  view,
}: {
  now: Nutrients;
  nowLabel: string;
  view: Pick<NutritionView, "targets" | "conditions" | "averages">;
}) {
  const flagged = new Map<NutrientKey, string>();
  for (const c of view.conditions) for (const n of c.nutrients) if (!flagged.has(n)) flagged.set(n, c.label);
  const keys = TABLE_ORDER.filter((k) => now[k] != null || view.averages.d7[k] != null || view.targets.some((t) => t.nutrient === k));
  const rows = [...keys.filter((k) => flagged.has(k)), ...keys.filter((k) => !flagged.has(k))];
  const firstPlain = rows.findIndex((k) => !flagged.has(k));
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="whitespace-nowrap text-[11.5px] font-medium text-[var(--c-ink-2)]">
          <th className="py-2 pl-1 pr-2 font-medium sm:pr-3">Nutrient</th>
          <th className="px-2 py-2 text-right font-medium sm:px-3">{nowLabel}</th>
          <th className="hidden w-[20%] px-3 py-2 font-medium md:table-cell">
            <span className="sr-only">Against target</span>
          </th>
          <th className="hidden px-3 py-2 font-medium sm:table-cell">Target</th>
          <th className="px-2 py-2 text-right font-medium sm:px-3">7-day</th>
          <th className="py-2 pl-2 pr-1 text-right font-medium sm:pl-3">30-day</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((k, i) => {
          const meta = NUTRIENT[k];
          const t = view.targets.find((x) => x.nutrient === k && x.status === "active");
          const st = targetState(now[k], t);
          const st7 = targetState(view.averages.d7[k], t);
          const st30 = targetState(view.averages.d30[k], t);
          const strict = t?.how === "strict";
          return (
            <tr key={k} className={cn("border-t border-[var(--c-line)]", i === firstPlain && firstPlain > 0 && "border-t-[var(--c-ink-3)]")}>
              <td className="py-2.5 pl-1 pr-2 sm:pr-3">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[13.5px] font-medium">{meta.label}</span>
                  {flagged.has(k) && <span className="rounded-full bg-[var(--c-accent-soft)] px-2 py-[1px] text-[10.5px] font-medium text-[var(--c-accent-soft-ink)]">{flagged.get(k)}</span>}
                </span>
                {/* phones: the target sits under the name */}
                <span className="mt-0.5 block text-[11px] text-[var(--c-ink-2)] sm:hidden">
                  {t ? (
                    <>
                      <span className="block">{targetText(t, meta.dp)} {meta.unit}</span>
                      <SetBy t={t} short />
                    </>
                  ) : (
                    "No target"
                  )}
                </span>
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right sm:px-3">
                <span className={cn("c-num text-[15px] tracking-normal", st === "over" && strict && "text-[var(--c-danger-ink)]")}>{num(now[k], meta.dp)}</span>
                <span className="text-[11.5px] text-[var(--c-ink-2)]"> {meta.unit}</span>
                {st === "over" && strict && (
                  <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[11px] font-medium text-[var(--c-danger-ink)] md:hidden">
                    <WarningCircle size={12} weight="fill" aria-hidden /> over
                  </span>
                )}
              </td>
              <td className="hidden px-3 py-2.5 md:table-cell">
                <span className="flex items-center gap-2">
                  <Meter value={now[k]} t={t} className="flex-1" />
                  {st === "over" && strict && (
                    <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-[var(--c-danger-ink)]">
                      <WarningCircle size={12} weight="fill" aria-hidden /> over
                    </span>
                  )}
                </span>
              </td>
              <td className="hidden px-3 py-2.5 sm:table-cell">
                {t ? (
                  <span className="flex flex-col gap-0.5">
                    <span className="whitespace-nowrap text-[12.5px]">
                      {targetText(t, meta.dp)} {meta.unit}
                    </span>
                    <SetBy t={t} short />
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--c-ink-2)]">No target</span>
                )}
              </td>
              <td className={cn("c-num whitespace-nowrap px-2 py-2.5 text-right text-[13.5px] tracking-normal sm:px-3", st7 === "over" && strict ? "text-[var(--c-danger-ink)]" : "text-[var(--c-ink-2)]")}>{num(view.averages.d7[k], meta.dp)}</td>
              <td className={cn("c-num whitespace-nowrap py-2.5 pl-2 pr-1 text-right text-[13.5px] tracking-normal sm:pl-3", st30 === "over" && strict ? "text-[var(--c-danger-ink)]" : "text-[var(--c-ink-2)]")}>{num(view.averages.d30[k], meta.dp)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** For the PanelTitle row: a one-line legend of the four confidence badges. */
export function ConfidenceLegend() {
  return (
    <span className="hidden flex-wrap items-center gap-1.5 md:flex">
      {(["label", "said", "photo", "estimate"] as const).map((c) => (
        <ConfidenceBadge key={c} c={c} />
      ))}
    </span>
  );
}

/** Small bead row: how much of a pack is left. */
export function Beads({ count, of, max = 12 }: { count: number; of: number | null; max?: number }) {
  const whole = of ?? count;
  const total = Math.min(max, whole);
  if (!total) return null;
  // a big pack (30 scoops) shrinks to 12 beads, each worth a share
  const filled = whole > max ? Math.round((count / whole) * max) : Math.min(count, total);
  return (
    <span className="flex flex-wrap gap-[3px]" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={cn("h-[7px] w-[7px] rounded-full", i < filled ? "bg-[var(--n-mark)]" : "border border-[var(--c-ink-3)]")} />
      ))}
    </span>
  );
}
