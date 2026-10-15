/**
 * Food & nutrition: the engine's page view → the Food diary (components/care-os/nutrition-data.ts toDiary). Pure, no
 * browser. An invented family; the view is shaped as app/nutrition/report.py view() writes it.
 *
 *   npx tsx scripts/test-nutrition-data.ts
 */
import assert from "node:assert/strict";
import { MAIN_MEALS, asSlot, shownSlots, toDiary, type EngineEntry, type NutritionView } from "../components/care-os/nutrition-data";

let passed = 0;
const ok = (name: string, fn: () => void) => {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e instanceof Error ? e.stack || e.message : e}`);
    process.exitCode = 1;
  }
};

const SUBJ = "0f00d000-0000-4000-8000-00000000e001";
const CG = "0f00d000-0000-4000-8000-00000000c001";
const DAY = "2026-10-14";

const entry = (over: Partial<EngineEntry>): EngineEntry => ({
  id: "e1", mealId: "m1", meal: "breakfast", kind: "food", eatenAt: `${DAY}T08:10:00+05:30`, day: DAY, name: "poha", nameSaid: "poha", quantity: 1, unit: "plate",
  qty: "1 plate", grams: 180, nutrients: { energy_kcal: 290, protein_g: 5.4 }, kcal: 290, protein_g: 5.4, confidence: "photo", source: "photo", sourceRef: "",
  photoRef: "families/x/nutrition/e1.jpg", consumed: null, portionEaten: null, status: "active", loggedBy: SUBJ, flags: {}, note: null, version: 1, foodId: null,
  ...over,
});

const row = (day: string, kcal: number, items: number, extra: object = {}) => ({
  day, kcal, protein_g: kcal / 30, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, sodium_mg: 0, water_ml: 500, items, mealsLogged: items ? 2 : 0,
  complete: items ? 0.67 : 0, met: {}, ...extra,
});

function view(over: Partial<NutritionView> = {}): NutritionView {
  const week = ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", DAY].map((d, i) => row(d, i === 3 ? 0 : 1400 + i * 10, i === 3 ? 0 : 5));
  return {
    subjectId: SUBJ,
    day: DAY,
    days: 1,
    tracking: { tracking: "full", ask: "adaptive", counters: ["eggs", "tea"], daily_summary_to: [], sizes: {} },
    targets: [
      { key: "nutrition_target:kcal", field: "kcal", nutrient: "energy_kcal", text: "Energy about 1,600 kcal", sense: "target", value: 1600, min: null, max: null, unit: "kcal", setBy: "doctor", how: "guide", status: "active" },
      { key: "nutrition_target:protein_g", field: "protein_g", nutrient: "protein_g", text: "Protein at least 50 g", sense: "min", value: 50, min: 50, max: null, unit: "g", setBy: "dietitian", how: "strict", status: "active" },
      { key: "nutrition_target:sugar_g", field: "sugar_g", nutrient: "sugar_g", text: "Sugar at most 25 g", sense: "max", value: 25, min: null, max: 25, unit: "g", setBy: "nurse", how: "guide", status: "pending" },
      { key: "nutrition_target:water_ml", field: "water_ml", nutrient: "water_ml", text: "Water at least 2,000 ml", sense: "min", value: 2000, min: 2000, max: null, unit: "ml", setBy: "caregiver", how: "guide", status: "active" },
    ],
    rules: [{ key: "nutrition_target:rule_egg", rule: "At most 2 eggs a day", food: "egg", maxPerDay: 2, none: false, when: null, setBy: "doctor", how: "strict", status: "active", text: "Food rule: At most 2 eggs a day (set by their doctor, strict)" }],
    today: {
      day: DAY,
      meals: [
        { meal: "breakfast", label: "Breakfast", entries: [entry({}), entry({ id: "e2", name: "tea with milk", nameSaid: "chai", quantity: 1, unit: "cup", kcal: 75, protein_g: 2.1, confidence: "said", photoRef: null, eatenAt: `${DAY}T08:00:00+05:30` })], kcal: 365, protein_g: 7.5, skipped: false, notLogged: false },
        { meal: "lunch", label: "Lunch", entries: [], kcal: 0, protein_g: 0, skipped: false, notLogged: true },
        { meal: "snack", label: "Snack", entries: [], kcal: 0, protein_g: 0, skipped: false, notLogged: false },
        { meal: "dinner", label: "Dinner", entries: [entry({ id: "e3", mealId: "m3", meal: "dinner", kind: "skipped", name: "dinner skipped", kcal: 0, protein_g: 0, loggedBy: CG })], kcal: 0, protein_g: 0, skipped: true, notLogged: false },
        { meal: "other", label: "Food", entries: [entry({ id: "e4", mealId: "m4", meal: "other", name: "water", quantity: 2, unit: "glass", kcal: 0, protein_g: 0, confidence: "unquantified", loggedBy: "saheli", photoRef: null })], kcal: 0, protein_g: 0, skipped: false, notLogged: false },
      ],
      totals: { energy_kcal: 365, protein_g: 7.5, water_ml: 500 },
      progress: [],
      water: { ml: 500, glasses: 2, glassMl: 250, targetMl: 2000 },
    },
    history: [row(DAY, 365, 3)],
    counters: [{ key: "eggs", label: "Eggs", unit: "eggs", today: 2, usual: 1.5, week: [1, 2, 0, 1, 2, 2, 2] }],
    week,
    month: { calendar: week.map((w) => ({ day: w.day, complete: w.complete, kcal: w.kcal, items: w.items })), trends: { kcal: [], protein_g: [], sugar_g: [], sodium_mg: [] } },
    nutrients: [
      { key: "energy_kcal", label: "Energy", unit: "kcal", avg7: 1420, avg30: 1390, target: 1600, min: null, max: null, highlight: true },
      { key: "sodium_mg", label: "Sodium", unit: "mg", avg7: null, avg30: 1800, target: null, min: null, max: null, highlight: false },
    ],
    streaks: { allMeals: 0, proteinMet: 1 },
    pantry: [{ id: "p1", name: "protein bar", brand: "Acme", count: 4, unit: "piece", unitG: 60, perUnit: { kcal: 210, protein_g: 20 }, fromTask: null, source: "order", subjectId: null, addedAt: `${DAY}T10:00:00+05:30`, bestBefore: null, status: "in_stock" }],
    // the engine writes times in UTC: 07:40 UTC is 13:10 IST the same day
    waiting: [{ task_id: "t1", subject_id: SUBJ, what: "Veg thali", restaurant: "Test Kitchen", service: "swiggy", since: `${DAY}T07:40:00+00:00` }],
    pendingQuestions: [{ jobId: "j1", reason: "quantity", question: "How many rotis?", options: ["1", "2", "3"], since: `${DAY}T09:00:00+05:30` }],
    noticed: [{ key: "missing:lunch", text: "Lunch not logged on 3 of the last 6 logged days", severity: "info" }, { key: "deviations", text: "Past a strict rule 2 times", severity: "watch" }],
    units: ["piece", "katori", "glass"],
    mealSlots: ["breakfast", "lunch", "snack", "dinner", "other"],
    ...over,
  } as NutritionView;
}

const NAMES = { [CG]: "Rohan" };

ok("a slot's entries become one meal per log, in time order, with totals from the engine's numbers", () => {
  const d = toDiary(view(), { today: DAY, names: NAMES });
  const b = d.days[0].meals.filter((m) => m.meal === "breakfast");
  assert.equal(b.length, 1);
  assert.equal(b[0].items.length, 2);
  assert.equal(b[0].at, `${DAY}T08:00:00+05:30`);
  assert.deepEqual(b[0].totals, { kcal: 365, protein: 7.5 });
  assert.equal(b[0].photoRef, "families/x/nutrition/e1.jpg");
  assert.equal(b[0].editable, true);
});

ok("their own words show only when they differ from the food's name", () => {
  const d = toDiary(view(), { today: DAY });
  const items = d.days[0].meals.flatMap((m) => m.items);
  assert.equal(items.find((i) => i.id === "e1")?.nameSaid, null);
  assert.equal(items.find((i) => i.id === "e2")?.nameSaid, "chai");
});

ok("a skipped meal is one empty, read-only line; who logged it is named", () => {
  const d = toDiary(view(), { today: DAY, names: NAMES });
  const dinner = d.days[0].meals.find((m) => m.meal === "dinner")!;
  assert.equal(dinner.note, "Skipped");
  assert.equal(dinner.items.length, 0);
  assert.equal(dinner.editable, false);
  assert.deepEqual(dinner.loggedBy, { id: CG, name: "Rohan", role: "caregiver" });
});

ok("only the three main meals can be 'not logged' (a snack never is)", () => {
  const d = toDiary(view(), { today: DAY });
  assert.deepEqual(d.days[0].missing.map((m) => m.meal), ["lunch"]);
});

ok("a delivered meal waiting for an answer is pointed at from that day's first missing meal", () => {
  const d = toDiary(view(), { today: DAY });
  assert.equal(d.days[0].missing[0].pendingId, "t1");
  assert.deepEqual(d.pending[0], { taskId: "t1", service: "swiggy", title: "Veg thali", restaurant: "Test Kitchen", deliveredAt: `${DAY}T07:40:00+00:00` });
  // a delivery at 20:00 UTC on the 13th is 01:30 IST on the 14th: it belongs to the 14th
  const late = toDiary(view({ waiting: [{ task_id: "t2", subject_id: SUBJ, what: "Soup", restaurant: null, service: "zomato", since: "2026-10-13T20:00:00+00:00" }] }), { today: DAY });
  assert.equal(late.days[0].missing[0].pendingId, "t2");
});

ok("targets: kcal 'about' is min = max; protein a floor; sugar a ceiling (pending); water in their glasses", () => {
  const d = toDiary(view(), { today: DAY });
  const t = Object.fromEntries(d.targets.map((x) => [x.nutrient, x]));
  assert.deepEqual([t.energy_kcal.min, t.energy_kcal.max], [1600, 1600]);
  assert.deepEqual([t.protein_g.min, t.protein_g.max, t.protein_g.how], [50, null, "strict"]);
  assert.deepEqual([t.sugar_g.min, t.sugar_g.max, t.sugar_g.status], [null, 25, "pending"]);
  assert.equal(t.sugar_g.setBy, "other", "a setter the page doesn't know falls back to other");
  assert.deepEqual([t.water_glasses.min, t.water_glasses.max], [8, null]);
});

ok("rules keep who set them and how strict", () => {
  const d = toDiary(view(), { today: DAY });
  assert.deepEqual(d.rules[0], { key: "nutrition_target:rule_egg", text: "At most 2 eggs a day", setBy: "doctor", how: "strict", status: "active" });
  const noWords = toDiary(view({ rules: [{ ...view().rules[0], rule: "" }] }), { today: DAY });
  assert.equal(noWords.rules[0].text, "Food rule: At most 2 eggs a day (set by their doctor, strict)");
});

ok("week: a day with nothing logged has no numbers (not zero)", () => {
  const d = toDiary(view(), { today: DAY });
  assert.equal(d.week[3].kcal, null);
  assert.equal(d.week[3].protein, null);
  assert.equal(d.week[4].kcal, 1440);
});

ok("week view without the engine's per-meal summary: totals only, no 'not logged' guesses", () => {
  const v = view({ days: 7, history: view().week });
  const d = toDiary(v, { today: DAY });
  const other = d.days.find((x) => x.day === "2026-10-12")!;
  assert.equal(other.summarised, false);
  assert.deepEqual(other.missing, []);
  assert.equal(other.totals.energy_kcal, 1440);
  const sel = d.days.find((x) => x.day === DAY)!;
  assert.equal(sel.summarised, true);
  assert.equal(sel.meals.length > 0, true);
  assert.equal(d.from, "2026-10-08");
  assert.equal(d.to, DAY);
});

ok("week view with the engine's per-meal summary: meals by slot and the missing ones", () => {
  const history = view().week.map((r) => (r.day === "2026-10-12" ? { ...r, meals: [{ meal: "lunch", at: "2026-10-12T13:20:00+05:30", names: ["rice", "sambar"], kcal: 420, protein_g: 11 }], skipped: ["breakfast"] } : r));
  const d = toDiary(view({ days: 7, history }), { today: DAY });
  const day = d.days.find((x) => x.day === "2026-10-12")!;
  assert.equal(day.summarised, true);
  assert.deepEqual(day.meals.map((m) => [m.meal, m.items.map((i) => i.name), m.totals.kcal]), [["lunch", ["rice", "sambar"], 420]]);
  assert.deepEqual(day.missing.map((m) => m.meal), ["dinner"]);
  assert.deepEqual(d.calendar.find((c) => c.day === "2026-10-12")?.logged, ["lunch"]);
});

ok("calendar: a day's logged meals from the engine when it sends them, else the selected day's own", () => {
  const d = toDiary(view(), { today: DAY });
  assert.deepEqual(d.calendar.find((c) => c.day === DAY)?.logged.sort(), ["breakfast", "dinner", "other"].sort());
  const cal = view().month.calendar.map((c) => (c.day === "2026-10-10" ? { ...c, logged: ["breakfast", "lunch", "dinner"] } : c));
  const d2 = toDiary(view({ month: { calendar: cal, trends: view().month.trends } }), { today: DAY });
  assert.deepEqual(d2.calendar.find((c) => c.day === "2026-10-10")?.logged, ["breakfast", "lunch", "dinner"]);
});

ok("averages, highlighted rows, counters, pantry, questions and noticed lines pass through", () => {
  const d = toDiary(view(), { today: DAY });
  assert.deepEqual(d.averages.d7, { energy_kcal: 1420 });
  assert.deepEqual(d.averages.d30, { energy_kcal: 1390, sodium_mg: 1800 });
  assert.deepEqual(d.highlighted, ["energy_kcal"]);
  assert.deepEqual(d.counters[0], { key: "eggs", label: "Eggs", unit: "eggs", today: 2, usual: 1.5, week: 10, usualWeek: 11 });
  assert.equal(d.pantry[0].name, "Acme protein bar");
  assert.equal(d.questions[0].jobId, "j1");
  assert.deepEqual(d.noticed.map((n) => n.watch), [false, true]);
});

ok("late night is its own meal and is not one of the three", () => {
  const v = view();
  v.today.meals = [{
    meal: "late_night", label: "Late night", kcal: 200, protein_g: 10, skipped: false, notLogged: false,
    entries: [entry({ id: "e9", mealId: "m9", meal: "late_night", eatenAt: `${DAY}T02:36:00+05:30` })],
  }];
  const d = toDiary(v, { today: DAY });
  assert.deepEqual(d.days[0].meals.map((m) => m.meal), ["late_night"]);
  assert.equal(d.days[0].meals[0].at, `${DAY}T02:36:00+05:30`);
  assert.deepEqual(MAIN_MEALS.filter((m) => d.days[0].meals.some((x) => x.meal === m)), []);
  assert.equal(d.days[0].missing.some((m) => m.meal === "late_night"), false);
  const history = view().week.map((r) => (r.day === "2026-10-12" ? { ...r, meals: [{ meal: "late_night", at: "2026-10-12T02:36:00+05:30", names: ["boiled egg"], kcal: 200, protein_g: 18 }], skipped: [] } : r));
  const week = toDiary(view({ days: 7, history }), { today: DAY });
  const day = week.days.find((x) => x.day === "2026-10-12")!;
  assert.deepEqual(day.meals.map((m) => m.meal), ["late_night"]);
  assert.deepEqual(day.missing.map((m) => m.meal), ["breakfast", "lunch", "dinner"]);
  assert.deepEqual(shownSlots(day.meals), ["breakfast", "lunch", "snack", "dinner", "late_night"]);
  assert.deepEqual(shownSlots([]), ["breakfast", "lunch", "snack", "dinner"]);
  assert.equal(asSlot("brunch"), "other");
  assert.equal(asSlot("after_dinner"), "after_dinner");
});

ok("tracking off, an unknown confidence, a missing name: nothing breaks", () => {
  const d = toDiary(view({ tracking: { tracking: "off", ask: "off", counters: [], daily_summary_to: [], sizes: {} } }), { today: DAY });
  assert.equal(d.tracking, "off");
  const odd = view();
  odd.today.meals[0].entries[0] = { ...odd.today.meals[0].entries[0], confidence: "guess" };
  const d2 = toDiary(odd, { today: DAY });
  assert.equal(d2.days[0].meals[0].items.find((i) => i.id === "e1")?.confidence, "estimate");
  assert.equal(d2.days[0].meals[0].loggedBy.role, "self");
});

console.log(`nutrition data: ${passed} passed`);
