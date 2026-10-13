/**
 * Food & nutrition: the engine's page view (GET /v2/dash/{f}/{s}/nutrition, contract dash.nutrition → DashNutrition in
 * lib/engine.gen.ts) and the diary the page draws from it.
 *
 * The contract is learnt from the synthetic world, so fields the world has only seen empty are typed loosely there; the
 * shapes below say what the engine writes for them (app/nutrition/report.py view()). Everything else is the generated
 * type itself, so a renamed or retyped engine field fails tsc here.
 *
 * toDiary() is pure (no React): it turns the view into the meals, missing slots, week and calendar the Food diary shows.
 * Nothing is invented: a value the engine doesn't give stays empty.
 */
import type { DashNutrition, DashNutritionReport } from "@/lib/engine.gen";

/* ── the engine's view ──────────────────────────────────────────────────── */

type GenToday = DashNutrition["today"];
type GenMeal = GenToday["meals"][number];
type GenEntry = GenMeal["entries"][number];
type GenDayRow = DashNutrition["history"][number];

export type EngineEntry = Omit<GenEntry, "photoRef" | "note" | "portionEaten" | "flags" | "consumed" | "kind" | "quantity" | "unit"> & {
  kind: "food" | "skipped";
  quantity: number | null;
  unit: string | null;
  photoRef: string | null;
  note: string | null;
  consumed: "yes" | "part" | null;
  portionEaten: string | null;
  flags: { tags?: string[]; allergy?: string[]; deviation?: string[]; rough?: boolean };
};

export type EngineMeal = Omit<GenMeal, "entries"> & { entries: EngineEntry[] };

/** A day's line in history / week, with (once the engine sends it) what was eaten in each meal. */
export type EngineDayRow = Omit<GenDayRow, "met"> & {
  met: Record<string, boolean>;
  meals?: Array<{ meal: string; at: string; names: string[]; kcal: number; protein_g: number }>;
  skipped?: string[];
};

export type EngineTarget = Omit<DashNutrition["targets"][number], "max" | "min" | "value" | "sense" | "status"> & {
  sense: "target" | "min" | "max" | "range";
  value: number | null;
  min: number | null;
  max: number | null;
  status: "active" | "pending" | string;
};

export type EngineRule = Omit<DashNutrition["rules"][number], "when" | "maxPerDay"> & { when: string | null; maxPerDay: number | null };

export type EnginePantry = Omit<DashNutrition["pantry"][number], "bestBefore" | "brand" | "subjectId" | "perUnit" | "fromTask"> & {
  bestBefore: string | null;
  brand: string | null;
  subjectId: string | null;
  fromTask: string | null;
  perUnit: { kcal: number; protein_g: number } | null;
};

/** A delivered restaurant meal nobody has said was eaten (agent.order_waiting). */
export type EngineWaiting = { task_id: string; subject_id: string; what: string; restaurant: string | null; service: string; since: string };

/** A question Saheli's food agent is waiting on (how many, which one, a photo). */
export type EngineQuestion = { jobId: string; reason: string; question: string; options: string[]; since: string };

/** Data-only lines ("Breakfast not logged on 3 of the last 6 logged days"). */
export type EngineNoticed = { key: string; text: string; severity: "info" | "watch" };

export type NutritionView = Omit<
  DashNutrition,
  "today" | "history" | "week" | "targets" | "rules" | "pantry" | "waiting" | "pendingQuestions" | "noticed" | "nutrients" | "month"
> & {
  today: Omit<GenToday, "meals" | "water"> & {
    meals: EngineMeal[];
    water: { ml: number; glasses: number; glassMl: number; targetMl: number | null };
  };
  history: EngineDayRow[];
  week: EngineDayRow[];
  month: { calendar: Array<DashNutrition["month"]["calendar"][number] & { logged?: string[] }>; trends: DashNutrition["month"]["trends"] };
  targets: EngineTarget[];
  rules: EngineRule[];
  pantry: EnginePantry[];
  waiting: EngineWaiting[];
  pendingQuestions: EngineQuestion[];
  noticed: EngineNoticed[];
  nutrients: Array<Omit<DashNutrition["nutrients"][number], "max"> & { max: number | null }>;
};

export type NutritionReport = Omit<DashNutritionReport, "deviations" | "targets" | "averages"> & {
  /** Daily averages over logged days; null when no food logged carried that nutrient. */
  averages: Partial<Record<"energy_kcal" | "protein_g" | "carbs_g" | "sugar_g" | "fat_g" | "sat_fat_g" | "fibre_g" | "sodium_mg" | "potassium_mg" | "calcium_mg" | "iron_mg" | "water_ml", number | null>>;
  deviations: string[];
  targets: Array<Omit<DashNutritionReport["targets"][number], "average"> & { average: number | null }>;
};

/** A doctor link (backend ShareLink kind "nutrition"). */
export type ShareLink = {
  id: string;
  url: string;
  days: number;
  label: string | null;
  createdAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  opens: number;
  lastOpenedAt: string | null;
  active: boolean;
};

/** Add food: log_food's answer. */
export type LogResult =
  | { result: "saved"; say?: string; saved?: Array<{ id: string; name: string }>; undo?: unknown }
  | { result: "needs_input"; job_id: string; needs: Array<{ reason: string; question: string; options?: string[]; item?: string }> }
  | { result: "looking_up"; job_id: string; say?: string }
  | { result: "dropped"; why?: string };

/* ── the diary the page draws ───────────────────────────────────────────── */

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
  | "water_g"
  | "water_ml";
export type Nutrients = Partial<Record<NutrientKey, number>>;
export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner" | "other";
/** How sure the numbers are (entries.confidence). */
export type Confidence = "label" | "said" | "photo" | "estimate" | "unquantified";
/** Anyone in the care circle can set a target; it records who and how strict (founder §N18 Q6). */
export type TargetSetter = "caregiver" | "self" | "doctor" | "dietitian" | "trainer" | "other";
export type Strictness = "strict" | "guide";

export const MEAL_ORDER: MealSlot[] = ["breakfast", "lunch", "snack", "dinner", "other"];
/** The meals a day is counted by (the engine's portions.MAIN_MEALS); a snack is shown when there is one. */
export const MAIN_MEALS: Array<Exclude<MealSlot, "other" | "snack">> = ["breakfast", "lunch", "dinner"];
/** The four places a day has in the diary, the week cards and the calendar dots. */
export const DAY_SLOTS: Array<Exclude<MealSlot, "other">> = ["breakfast", "lunch", "snack", "dinner"];
const SETTERS: TargetSetter[] = ["caregiver", "self", "doctor", "dietitian", "trainer", "other"];
const CONFIDENCES: Confidence[] = ["label", "said", "photo", "estimate", "unquantified"];

export const asSlot = (m: string | null | undefined): MealSlot => (MEAL_ORDER.includes(m as MealSlot) ? (m as MealSlot) : "other");
export const asSetter = (s: string | null | undefined): TargetSetter => (SETTERS.includes(s as TargetSetter) ? (s as TargetSetter) : "other");
const asConfidence = (c: string | null | undefined): Confidence => (CONFIDENCES.includes(c as Confidence) ? (c as Confidence) : "estimate");

export type DiaryItem = {
  id: string;
  mealId: string;
  meal: MealSlot;
  eatenAt: string;
  /** Display name: "boiled egg", "moong dal". */
  name: string;
  /** Their own words, when different: "do ande". */
  nameSaid: string | null;
  quantity: number | null;
  unit: string | null;
  /** The measure behind it, when known: "100 g". */
  portion: string | null;
  kcal: number;
  protein: number;
  nutrients: Nutrients;
  confidence: Confidence;
  source: string;
  consumed: "yes" | "part" | null;
  allergy: boolean;
  overStrict: boolean;
  /** A drink (it carries water): its portion reads in ml. */
  drink: boolean;
};

export type DiaryMeal = {
  id: string;
  meal: MealSlot;
  at: string;
  photoRef: string | null;
  loggedBy: { id: string; name: string; role: "self" | "caregiver" | "saheli" };
  note: string | null;
  items: DiaryItem[];
  totals: { kcal: number; protein: number };
  /** A real meal of entries (a summary from the week view has no ids to change). */
  editable: boolean;
};

export type MissingMeal = { meal: Exclude<MealSlot, "other" | "snack">; pendingId: string | null };

export type DiaryDay = {
  day: string;
  meals: DiaryMeal[];
  missing: MissingMeal[];
  totals: Nutrients;
  water: { glasses: number; glassMl: number };
  items: number;
  /** Meals are known per slot (the selected day, or a summary from the engine); otherwise only the totals. */
  summarised: boolean;
};

/** A target (care fact nutrition_target). A goal to reach has only min, a limit only max, a range both, kcal "about" both. */
export type DiaryTarget = {
  key: string;
  nutrient: NutrientKey | "water_glasses";
  min: number | null;
  max: number | null;
  text: string;
  setBy: TargetSetter;
  how: Strictness;
  status: "active" | "pending";
};

export type DiaryRule = { key: string; text: string; setBy: TargetSetter; how: Strictness; status: "active" | "pending" };

export type DiaryCounter = { key: string; label: string; unit: string; today: number; usual: number | null; week: number; usualWeek: number | null };

export type CalendarDay = { day: string; logged: MealSlot[]; complete: number; kcal: number | null; items: number };
export type WeekDay = { day: string; kcal: number | null; protein: number | null; logged: number };

export type PantryItem = { id: string; name: string; count: number; unit: string; addedAt: string; bestBefore: string | null; perUnit: { kcal: number; protein_g: number } | null };

/** A delivered restaurant meal that counts only after a yes (§N6.1). */
export type PendingMeal = { taskId: string; service: string; title: string; restaurant: string | null; deliveredAt: string };

export type Noticed = { id: string; text: string; watch: boolean };

export type Diary = {
  subjectId: string;
  today: string;
  day: string;
  range: 1 | 7 | 30;
  from: string;
  to: string;
  tracking: "off" | "counts" | "full";
  targets: DiaryTarget[];
  rules: DiaryRule[];
  /** The selected day in full; for week and month also the other days (meals summarised per slot when the engine sends it). */
  days: DiaryDay[];
  calendar: CalendarDay[];
  week: WeekDay[];
  averages: { d7: Nutrients; d30: Nutrients; d7Days: number; d30Days: number };
  /** Nutrients with a target set come first in the table (display only). */
  highlighted: NutrientKey[];
  counters: DiaryCounter[];
  pantry: PantryItem[];
  pending: PendingMeal[];
  questions: EngineQuestion[];
  noticed: Noticed[];
  streaks: { allMeals: number; proteinMet: number };
};

/** Today in IST, YYYY-MM-DD. */
export const istToday = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const n0 = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function target(t: EngineTarget, glassMl: number): DiaryTarget {
  const value = t.value ?? null;
  let min = t.min ?? (t.sense === "target" || t.sense === "min" ? value : null);
  let max = t.max ?? (t.sense === "target" || t.sense === "max" ? value : null);
  const water = t.field === "water_ml";
  if (water) {
    // the page counts water in glasses (their own glass size)
    min = min != null ? Math.round((min / glassMl) * 10) / 10 : null;
    max = max != null ? Math.round((max / glassMl) * 10) / 10 : null;
  }
  return {
    key: t.key,
    nutrient: water ? "water_glasses" : (t.nutrient as NutrientKey),
    min,
    max,
    text: t.text,
    setBy: asSetter(t.setBy),
    how: t.how === "strict" ? "strict" : "guide",
    status: t.status === "active" ? "active" : "pending",
  };
}

function item(e: EngineEntry): DiaryItem {
  const said = (e.nameSaid || "").trim();
  return {
    id: e.id,
    mealId: e.mealId,
    meal: asSlot(e.meal),
    eatenAt: e.eatenAt,
    name: e.name,
    nameSaid: said && said.toLowerCase() !== e.name.toLowerCase() ? said : null,
    quantity: e.quantity,
    unit: e.unit,
    portion: e.grams ? `${Math.round(e.grams)} ${(e.nutrients as Nutrients)?.water_ml || e.flags?.tags?.includes("water") ? "ml" : "g"}` : null,
    kcal: n0(e.kcal),
    protein: n0(e.protein_g),
    nutrients: (e.nutrients ?? {}) as Nutrients,
    confidence: asConfidence(e.confidence),
    source: e.source,
    consumed: e.consumed === "part" ? "part" : e.consumed === "yes" ? "yes" : null,
    allergy: Boolean(e.flags?.allergy?.length),
    overStrict: Boolean(e.flags?.deviation?.length),
    drink: Boolean((e.nutrients as Nutrients)?.water_ml || e.flags?.tags?.includes("water")),
  };
}

function who(id: string, subjectId: string, names: Record<string, string>, self: boolean): DiaryMeal["loggedBy"] {
  if (!id || id === "saheli") return { id: "saheli", name: "Saheli", role: "saheli" };
  if (id === subjectId) return { id, name: names[id] || (self ? "You" : ""), role: "self" };
  return { id, name: names[id] || "", role: "caregiver" };
}

/** One slot's entries as diary meals: one per log (meal id), in time order. A slot marked skipped is one empty meal. */
function mealsOf(m: EngineMeal, subjectId: string, names: Record<string, string>, self: boolean): DiaryMeal[] {
  const slot = asSlot(m.meal);
  if (!m.entries.length) return [];
  if (m.skipped) {
    const first = m.entries[0];
    return [{ id: `skipped:${first.mealId}`, meal: slot, at: first.eatenAt, photoRef: null, loggedBy: who(first.loggedBy, subjectId, names, self),
              note: "Skipped", items: [], totals: { kcal: 0, protein: 0 }, editable: false }];
  }
  const groups = new Map<string, EngineEntry[]>();
  for (const e of m.entries) if (e.kind === "food") groups.set(e.mealId, [...(groups.get(e.mealId) ?? []), e]);
  return [...groups.entries()]
    .map(([id, es]) => {
      const items = es.map(item);
      return {
        id,
        meal: slot,
        at: es.map((e) => e.eatenAt).sort()[0],
        photoRef: es.find((e) => e.photoRef)?.photoRef ?? null,
        loggedBy: who(es[0].loggedBy, subjectId, names, self),
        note: null,
        items,
        totals: { kcal: items.reduce((s, i) => s + i.kcal, 0), protein: items.reduce((s, i) => s + i.protein, 0) },
        editable: true,
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at));
}

function rowTotals(r: EngineDayRow): Nutrients {
  return { energy_kcal: r.kcal, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g, fibre_g: r.fibre_g, sugar_g: r.sugar_g, sodium_mg: r.sodium_mg, water_ml: r.water_ml };
}

/** A day from history: totals always; meals per slot only when the engine summarises them (week and month views). */
function summaryDay(r: EngineDayRow, glassMl: number, today: string): DiaryDay {
  const meals: DiaryMeal[] = (r.meals ?? []).map((m) => {
    const slot = asSlot(m.meal);
    return {
      id: `${r.day}:${slot}`,
      meal: slot,
      at: m.at,
      photoRef: null,
      loggedBy: { id: "", name: "", role: "saheli" },
      note: null,
      items: m.names.map((name, i) => ({
        id: `${r.day}:${slot}:${i}`, mealId: `${r.day}:${slot}`, meal: slot, eatenAt: m.at, name, nameSaid: null, quantity: null, unit: null, portion: null,
        kcal: 0, protein: 0, nutrients: {}, confidence: "said", source: "", consumed: null, allergy: false, overStrict: false, drink: false,
      })),
      totals: { kcal: m.kcal, protein: m.protein_g },
      editable: false,
    };
  });
  const logged = new Set(meals.map((m) => m.meal));
  return {
    day: r.day,
    meals,
    missing: r.meals && r.day <= today ? MAIN_MEALS.filter((s) => !logged.has(s) && !(r.skipped ?? []).includes(s)).map((s) => ({ meal: s, pendingId: null })) : [],
    totals: rowTotals(r),
    water: { glasses: Math.round((n0(r.water_ml) / glassMl) * 10) / 10, glassMl },
    items: r.items,
    summarised: Boolean(r.meals),
  };
}

export function toDiary(v: NutritionView, opts: { today?: string; names?: Record<string, string>; self?: boolean } = {}): Diary {
  const today = opts.today ?? istToday();
  const names = opts.names ?? {};
  const self = Boolean(opts.self);
  const glassMl = v.today.water.glassMl || 250;
  const range = (v.days === 1 || v.days === 30 ? v.days : 7) as 1 | 7 | 30;

  const meals = v.today.meals.flatMap((m) => mealsOf(m, v.subjectId, names, self));
  const waiting = v.waiting ?? [];
  const selected: DiaryDay = {
    day: v.day,
    meals,
    missing: v.today.meals.filter((m) => m.notLogged && MAIN_MEALS.includes(m.meal as MissingMeal["meal"])).map((m) => ({ meal: m.meal as MissingMeal["meal"], pendingId: null })),
    totals: (v.today.totals ?? {}) as Nutrients,
    water: { glasses: v.today.water.glasses, glassMl },
    items: meals.reduce((s, m) => s + m.items.length, 0),
    summarised: true,
  };
  // a delivered meal waiting for an answer is pointed at from the first missing slot of that day
  const firstWaiting = waiting.find((w) => istToday(new Date(w.since)) === v.day);
  if (firstWaiting && selected.missing.length) selected.missing[0].pendingId = firstWaiting.task_id;

  const history = v.history ?? [];
  const days = range === 1 ? [selected] : history.map((r) => (r.day === v.day ? { ...summaryDay(r, glassMl, today), ...selected } : summaryDay(r, glassMl, today)));

  const avg = (key: "avg7" | "avg30") => Object.fromEntries(v.nutrients.filter((n) => n[key] != null).map((n) => [n.key, n[key] as number])) as Nutrients;
  const calendar: CalendarDay[] = v.month.calendar.map((c) => {
    const fromWeek = [...history, ...v.week].find((r) => r.day === c.day)?.meals;
    const logged = (c.logged ?? fromWeek?.map((m) => m.meal) ?? (c.day === v.day ? meals.map((m) => m.meal) : [])).map(asSlot);
    return { day: c.day, logged: [...new Set(logged)], complete: c.complete, kcal: c.items ? c.kcal : null, items: c.items };
  });

  return {
    subjectId: v.subjectId,
    today,
    day: v.day,
    range,
    from: history[0]?.day ?? v.day,
    to: history[history.length - 1]?.day ?? v.day,
    tracking: v.tracking.tracking === "off" ? "off" : v.tracking.tracking === "counts" ? "counts" : "full",
    targets: v.targets.map((t) => target(t, glassMl)),
    // the rule in its own words ("At most 1 egg a day"); the engine's text also names who set it, which the page shows apart
    rules: v.rules.map((r) => ({ key: r.key, text: r.rule || r.text, setBy: asSetter(r.setBy), how: r.how === "strict" ? "strict" : "guide", status: r.status === "active" ? "active" : "pending" })),
    days,
    calendar,
    week: v.week.map((w) => ({ day: w.day, kcal: w.items ? w.kcal : null, protein: w.items ? w.protein_g : null, logged: w.mealsLogged })),
    averages: { d7: avg("avg7"), d30: avg("avg30"), d7Days: v.week.filter((w) => w.items).length, d30Days: v.month.calendar.filter((c) => c.items).length },
    highlighted: v.nutrients.filter((n) => n.highlight).map((n) => n.key as NutrientKey),
    counters: v.counters.map((c) => ({
      key: c.key, label: c.label, unit: c.unit, today: c.today, usual: c.usual, week: c.week.reduce((s, x) => s + x, 0), usualWeek: c.usual != null ? Math.round(c.usual * 7) : null,
    })),
    pantry: v.pantry.map((p) => ({ id: p.id, name: p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.brand} ${p.name}` : p.name, count: p.count, unit: p.unit, addedAt: p.addedAt, bestBefore: p.bestBefore, perUnit: p.perUnit })),
    pending: waiting.map((w) => ({ taskId: w.task_id, service: w.service, title: w.what, restaurant: w.restaurant, deliveredAt: w.since })),
    questions: v.pendingQuestions ?? [],
    noticed: v.noticed.map((x) => ({ id: x.key, text: x.text, watch: x.severity === "watch" })),
    streaks: v.streaks,
  };
}
