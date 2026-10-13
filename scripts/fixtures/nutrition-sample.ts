/**
 * An invented family for the Food & nutrition page (no real people): Rohan Mehra (self care, 36, trains at a gym) and his
 * mother Sushila Mehra (72, type 2 diabetes and high blood pressure). Answers GET .../care-memory/nutrition the way the
 * engine will (the draft contract in components/care-os/nutrition-kit.tsx), for any day and for 1, 7 or 30 days.
 * Past days are made up from each person's usual foods with a fixed seed, so every run draws the same diary.
 */
import type {
  CalendarDay,
  Confidence,
  FoodRule,
  MealSlot,
  MissingMeal,
  NutrientKey,
  Nutrients,
  NutritionCounter,
  NutritionDay,
  NutritionEntry,
  NutritionMeal,
  NutritionTarget,
  NutritionView,
  WeekDay,
} from "../../components/care-os/nutrition-kit";

export const FAMILY_ID = "0f00d000-0000-4000-8000-0000000000f1";
export const ELDER_ID = "0f00d000-0000-4000-8000-00000000e001";
export const SELF_ID = "0f00d000-0000-4000-8000-00000000c001";
export type Who = "elder" | "self";

export const PEOPLE = [
  { userId: ELDER_ID, name: "Sushila Mehra", role: "CARE_RECIPIENT", status: "JOINED", relationship: "Mother" },
  { userId: SELF_ID, name: "Rohan Mehra", role: "PRIMARY_CAREGIVER", status: "JOINED", relationship: "Son" },
];

const KEYS: NutrientKey[] = ["energy_kcal", "protein_g", "carbs_g", "sugar_g", "added_sugar_g", "fibre_g", "fat_g", "sodium_mg", "potassium_mg", "calcium_mg", "iron_mg"];
type Vec = [number, number, number, number, number, number, number, number, number, number, number];
type Food = { qty: number | null; unit: string | null; name: string; portion?: string; conf: Confidence; n: Vec; said?: string };

const F = (qty: number | null, unit: string | null, name: string, portion: string | undefined, conf: Confidence, n: Vec, said?: string): Food => ({ qty, unit, name, portion, conf, n, said });

/* kcal, protein, carbs, sugar, added sugar, fibre, fat, sodium, potassium, calcium, iron */
const E = {
  poha: F(1, "plate", "poha", "180 g", "photo", [290, 5.4, 52, 2.5, 0, 2.4, 6.8, 290, 180, 18, 5.2]),
  egg: F(1, null, "boiled egg", undefined, "said", [78, 6.3, 0.6, 0.6, 0, 0, 5.3, 62, 63, 25, 0.9]),
  tea: F(1, "cup", "tea with milk, 1 tsp sugar", undefined, "said", [75, 2.1, 10, 9, 4, 0, 2.6, 30, 110, 75, 0.1]),
  upma: F(1, "katori", "rava upma", "180 g", "said", [250, 6, 38, 2, 0, 2.5, 8, 380, 120, 20, 1.2]),
  idli: F(2, null, "idli", undefined, "said", [116, 4, 24, 0.4, 0, 1.2, 0.4, 260, 60, 10, 0.6]),
  sambar: F(1, "katori", "sambar", "150 ml", "estimate", [110, 5, 16, 3, 0, 4, 3, 420, 300, 40, 1.4]),
  daliya: F(1, "bowl", "vegetable daliya", "220 g", "photo", [230, 7.5, 42, 3, 0, 6, 3.5, 310, 260, 30, 2.2]),
  chilla: F(2, null, "besan chillas", undefined, "said", [240, 11, 28, 2, 0, 5, 9, 360, 380, 40, 2.6]),
  curd: F(1, "bowl", "curd", "100 g", "said", [60, 3.5, 4.7, 4.7, 0, 0, 3.1, 40, 155, 120, 0.1]),
  phulka: F(2, null, "phulka rotis", "80 g", "said", [210, 6.2, 36, 0.6, 0, 5.4, 4.4, 10, 170, 24, 2]),
  dal: F(1, "katori", "moong dal", "180 ml", "said", [120, 6.8, 17, 1, 0, 4, 3, 260, 290, 30, 1.6]),
  lauki: F(1, "katori", "lauki sabzi", "120 g", "photo", [85, 2, 8, 4, 0, 2.5, 5, 180, 220, 25, 0.5]),
  papad: F(1, null, "roasted papad", undefined, "label", [35, 2.5, 6, 0, 0, 1.3, 0.3, 340, 100, 10, 0.8]),
  khichdi: F(1, "bowl", "vegetable khichdi", "250 g", "photo", [310, 9.5, 52, 3, 0, 5.5, 7, 380, 380, 45, 2.2]),
  bhurji: F(1, "katori", "egg bhurji, from 1 egg", undefined, "said", [110, 6.6, 2, 1, 0, 0.4, 8.5, 160, 90, 30, 1]),
  chaas: F(1, "glass", "buttermilk", "200 ml", "said", [40, 2.2, 3.5, 3.5, 0, 0, 1.8, 120, 150, 110, 0.1]),
  rice: F(1, "katori", "steamed rice", "150 g", "said", [195, 4, 43, 0, 0, 0.6, 0.4, 2, 50, 15, 0.3]),
  poriyal: F(1, "katori", "beans poriyal", "100 g", "estimate", [90, 2.5, 8, 2.5, 0, 3.5, 5.5, 210, 200, 40, 0.9]),
  rajma: F(1, "katori", "rajma", "150 g", "said", [180, 9, 26, 1, 0, 8, 4, 390, 450, 50, 2.6]),
  salad: F(1, "plate", "cucumber and tomato salad", undefined, "estimate", [30, 1, 6, 3, 0, 1.8, 0.2, 8, 230, 20, 0.4]),
  palak: F(1, "katori", "palak paneer", "150 g", "photo", [210, 10, 8, 2, 0, 3, 15, 420, 400, 260, 2.4]),
  banana: F(1, null, "banana", undefined, "estimate", [105, 1.3, 27, 14, 0, 3.1, 0.4, 1, 422, 6, 0.3]),
  chana: F(1, "handful", "roasted chana", "30 g", "said", [110, 6.5, 17, 0.5, 0, 5, 1.6, 8, 260, 18, 1.6]),
  ragi: F(2, null, "ragi biscuits", undefined, "label", [90, 1.5, 13, 4, 4, 1.2, 3.6, 70, 40, 30, 0.6]),
  sprouts: F(1, "katori", "sprouts chaat", undefined, "said", [120, 8, 18, 2, 0, 5, 1, 220, 320, 30, 1.8]),
  mixveg: F(1, "katori", "mixed veg sabzi", undefined, "estimate", [110, 3, 10, 4, 0, 4, 6.5, 240, 300, 40, 1]),
  soup: F(1, "bowl", "vegetable soup", "250 ml", "said", [70, 2, 12, 4, 0, 3, 1.5, 480, 280, 30, 0.8]),
  paneer: F(1, "katori", "paneer bhurji", "100 g", "said", [230, 13, 6, 2, 0, 1, 17, 260, 150, 300, 0.4]),
  dkhichdi: F(1, "bowl", "daliya khichdi", "250 g", "photo", [270, 9, 48, 2, 0, 7, 5, 340, 320, 40, 2.4]),
};
const S = {
  eggs4: F(4, null, "boiled eggs", undefined, "said", [312, 25.2, 2.4, 2.4, 0, 0, 21.2, 248, 252, 100, 3.6]),
  banana: E.banana,
  coffee: F(1, "cup", "black coffee", undefined, "said", [5, 0.3, 0, 0, 0, 0, 0, 5, 116, 5, 0.1]),
  oats: F(1, "bowl", "oats with milk", "250 g", "said", [290, 12, 44, 12, 0, 5, 7, 120, 420, 250, 2.2]),
  whey: F(1, "scoop", "whey in milk", "300 ml", "label", [290, 33, 18, 16, 0, 0, 8, 210, 520, 420, 0.3]),
  omelette: F(1, null, "3-egg omelette", undefined, "said", [280, 19, 2, 1, 0, 0.5, 21, 420, 230, 90, 2.8]),
  toast: F(2, "slices", "brown bread toast", undefined, "label", [150, 6, 26, 3, 2, 4, 2, 260, 120, 60, 1.6]),
  poha: E.poha,
  eggs2: F(2, null, "boiled eggs", undefined, "said", [156, 12.6, 1.2, 1.2, 0, 0, 10.6, 124, 126, 50, 1.8]),
  bar: F(1, null, "protein bar", undefined, "label", [210, 20, 22, 4, 3, 6, 7, 180, 150, 120, 2]),
  yogurt: F(1, "cup", "Greek yogurt", "100 g", "label", [100, 10, 6, 5, 0, 0, 3.5, 50, 200, 150, 0]),
  apple: F(1, null, "apple", undefined, "estimate", [95, 0.5, 25, 19, 0, 4.4, 0.3, 2, 195, 11, 0.2]),
  chikki: F(1, "piece", "peanut chikki", undefined, "label", [130, 4, 14, 10, 9, 1.5, 7, 15, 120, 15, 0.6]),
  bowl: F(1, null, "chicken rice bowl", undefined, "photo", [640, 38, 72, 5, 0, 4, 20, 1100, 600, 60, 3]),
  phulka3: F(3, null, "phulka rotis", "120 g", "said", [315, 9.3, 54, 0.9, 0, 8.1, 6.6, 15, 255, 36, 3]),
  chicken: F(1, "katori", "chicken curry", "150 g", "said", [260, 26, 6, 2, 0, 1.5, 15, 520, 380, 30, 1.4]),
  salad: E.salad,
  rajma: E.rajma,
  rice: F(1, "plate", "steamed rice", "200 g", "said", [260, 5.4, 57, 0, 0, 0.8, 0.5, 3, 70, 20, 0.4]),
  curd: E.curd,
  wrap: F(1, null, "paneer wrap", undefined, "photo", [520, 22, 55, 5, 1, 5, 23, 980, 300, 280, 2]),
  grilled: F(1, "plate", "grilled chicken", "200 g", "said", [330, 50, 2, 1, 0, 0, 13, 600, 520, 30, 1.6]),
  paneer: E.paneer,
  phulka2: E.phulka,
  dal: E.dal,
  eggcurry: F(1, "katori", "egg curry, 2 eggs", undefined, "said", [220, 13, 8, 3, 0, 1.5, 15, 480, 260, 60, 1.6]),
};

const LIB: Record<Who, Record<Exclude<MealSlot, "other">, Food[][]>> = {
  elder: {
    breakfast: [[E.poha, E.egg, E.tea], [E.upma, E.tea], [E.idli, E.sambar, E.tea], [E.daliya, E.tea], [E.chilla, E.curd, E.tea]],
    lunch: [[E.phulka, E.dal, E.lauki, E.curd], [E.rice, E.sambar, E.poriyal, E.chaas], [E.phulka, E.rajma, E.salad], [E.phulka, E.palak, E.dal]],
    snack: [[E.banana, E.tea], [E.chana, E.tea], [E.ragi, E.tea], [E.sprouts]],
    dinner: [[E.khichdi, E.chaas], [E.phulka, E.mixveg, E.dal], [E.soup, E.paneer], [E.dkhichdi, E.curd]],
  },
  self: {
    breakfast: [[S.eggs4, S.banana, S.coffee], [S.oats, S.whey], [S.omelette, S.toast, S.coffee], [S.poha, S.eggs2]],
    snack: [[S.bar, S.whey], [S.yogurt, S.apple], [S.chikki, S.coffee]],
    lunch: [[S.bowl, S.yogurt], [S.phulka3, S.chicken, S.salad], [S.rajma, S.rice, S.curd], [S.wrap]],
    dinner: [[S.phulka3, S.chicken], [S.paneer, S.phulka2], [S.grilled, S.salad], [S.dal, S.rice, S.eggcurry]],
  },
};
const TIMES: Record<Who, Record<Exclude<MealSlot, "other">, string>> = {
  elder: { breakfast: "08:15", lunch: "13:15", snack: "16:30", dinner: "20:00" },
  self: { breakfast: "07:45", snack: "11:30", lunch: "13:45", dinner: "21:30" },
};
const ODDS: Record<Who, Record<Exclude<MealSlot, "other">, number>> = {
  elder: { breakfast: 0.96, lunch: 0.94, snack: 0.45, dinner: 0.86 },
  self: { breakfast: 0.9, snack: 0.72, lunch: 0.92, dinner: 0.78 },
};
const SINCE = "2026-09-10";

/* ── days ────────────────────────────────────────────────────────────────── */

const shift = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const at = (day: string, hhmm: string) => `${day}T${hhmm}:00+05:30`;

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const vec = (n: Vec): Nutrients => Object.fromEntries(KEYS.map((k, i) => [k, n[i]]));
function sum(list: Nutrients[]): Nutrients {
  const out: Nutrients = {};
  for (const n of list) for (const k of KEYS) out[k] = Math.round(((out[k] ?? 0) + (n[k] ?? 0)) * 10) / 10;
  return out;
}

let seq = 0;
function meal(who: Who, day: string, slot: MealSlot, time: string, foods: Food[], extra: Partial<NutritionMeal> = {}): NutritionMeal {
  const id = `${who}-${day}-${slot}-${time.replace(":", "")}`;
  const items: NutritionEntry[] = foods.map((f) => ({
    id: `${id}-${seq++}`,
    mealId: id,
    meal: slot,
    eatenAt: at(day, time),
    name: f.name,
    nameSaid: f.said ?? null,
    quantity: f.qty,
    unit: f.unit,
    portion: f.portion ?? null,
    grams: null,
    nutrients: vec(f.n),
    confidence: f.conf,
    source: f.conf === "label" ? "label" : f.conf === "photo" ? "photo" : "chat",
    consumed: "yes",
    portionEaten: null,
    note: null,
  }));
  return {
    id,
    meal: slot,
    at: at(day, time),
    photoUrl: null,
    loggedBy: who === "elder" ? { id: ELDER_ID, name: "Sushila", role: "elder" } : { id: SELF_ID, name: "You", role: "self" },
    note: null,
    items,
    totals: sum(items.map((i) => i.nutrients)),
    canUndo: true,
    ...extra,
  };
}

const photo = (who: Who, file: string) => `/api/families/${FAMILY_ID}/subjects/${who === "elder" ? ELDER_ID : SELF_ID}/care-memory/nutrition/photos/${file}`;
const tweak = (f: Food, set: Partial<Food>): Food => ({ ...f, ...set });

/** The day as the engine would answer it. `today` gets the hand-written diary (or nothing, for the empty state). */
function dayOf(who: Who, day: string, today: string, emptyToday: boolean): NutritionDay {
  const meals: NutritionMeal[] = [];
  let water = 0;
  if (day > today || day < SINCE) return { day, meals, missing: [], totals: {}, water: { glasses: 0, glassMl: 250 } };
  if (day === today && emptyToday) {
    return { day, meals, missing: (["breakfast", "lunch", "snack", "dinner"] as const).map((m) => ({ meal: m, usual: TIMES[who][m], pendingId: null })), totals: {}, water: { glasses: 0, glassMl: 250 } };
  }
  if (day === today && who === "elder") {
    meals.push(
      meal(who, day, "breakfast", "08:10", [E.poha, E.egg, E.tea], { photoUrl: photo(who, "poha.jpg"), note: "From Maa's photo; she said yes to it at 08:14" }),
      meal(who, day, "lunch", "13:20", [tweak(E.phulka, { conf: "estimate", portion: "usual 2" }), E.dal, E.lauki, E.curd, E.papad], {
        photoUrl: photo(who, "lunch.jpg"),
        note: "From Maa's voice note at 13:42",
      }),
      meal(who, day, "dinner", "20:05", [E.khichdi, E.bhurji, E.chaas], { photoUrl: photo(who, "khichdi.jpg"), note: "Rohan told Saheli on WhatsApp at 20:31", loggedBy: { id: SELF_ID, name: "Rohan", role: "caregiver" } }),
      meal(who, day, "other", "11:00", [F(2, "cups", "tea with milk, 1 tsp sugar each", "11:00 and 17:10", "said", [150, 4.2, 20, 18, 8, 0, 5.2, 60, 220, 150, 0.2]), F(5, "glasses", "water", "1.25 L", "said", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])], {
        note: "Counted from what Maa told Saheli",
      }),
    );
    water = 5;
    return {
      day,
      meals,
      missing: [{ meal: "snack", usual: "16:30", pendingId: "pend-idli" }],
      totals: sum(meals.map((m) => m.totals)),
      water: { glasses: water, glassMl: 250 },
    };
  }
  if (day === today && who === "self") {
    meals.push(
      meal(who, day, "breakfast", "07:40", [tweak(S.eggs4, { said: "four boiled eggs" }), S.banana, S.coffee], { photoUrl: photo(who, "eggs.jpg"), note: "From your photo; Saheli asked how many and you said 4" }),
      meal(who, day, "snack", "11:30", [S.bar, S.whey], { note: "After the gym · numbers from the labels you sent on 9 Oct" }),
      meal(who, day, "lunch", "13:45", [S.bowl, S.yogurt], { note: "Swiggy order; you said you ate all of it" }),
      meal(who, day, "other", "10:00", [F(1, "cup", "black coffee", "16:00", "said", [5, 0.3, 0, 0, 0, 0, 0, 5, 116, 5, 0.1]), F(7, "glasses", "water", "1.75 L", "said", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]),
    );
    return {
      day,
      meals,
      missing: [{ meal: "dinner", usual: "21:30", pendingId: null }],
      totals: sum(meals.map((m) => m.totals)),
      water: { glasses: 7, glassMl: 250 },
    };
  }
  const r = rng(`${who}:${day}`);
  const skipAll = who === "elder" ? day === "2026-10-04" : day === "2026-10-11";
  const missing: MissingMeal[] = [];
  for (const slot of ["breakfast", "lunch", "snack", "dinner"] as const) {
    const opts = LIB[who][slot];
    const pick = opts[Math.floor(r() * opts.length)];
    const logged = !skipAll && r() < ODDS[who][slot];
    if (!logged) {
      missing.push({ meal: slot, usual: TIMES[who][slot], pendingId: null });
      continue;
    }
    const [h, m] = TIMES[who][slot].split(":").map(Number);
    const mins = Math.max(0, h * 60 + m + Math.round((r() - 0.5) * 50));
    meals.push(meal(who, day, slot, `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`, pick));
  }
  water = skipAll ? 0 : who === "elder" ? 4 + Math.floor(r() * 4) : 7 + Math.floor(r() * 5);
  return { day, meals, missing, totals: sum(meals.map((m) => m.totals)), water: { glasses: water, glassMl: 250 } };
}

/* ── targets, rules, counters, pantry, notes ─────────────────────────────── */

const T = (nutrient: NutritionTarget["nutrient"], min: number | null, max: number | null, setBy: NutritionTarget["setBy"], setByName: string | null, how: NutritionTarget["how"]): NutritionTarget => ({
  key: `nutrition_target:${nutrient}`,
  nutrient,
  min,
  max,
  setBy,
  setByName,
  how,
  status: "active",
});

const TARGETS: Record<Who, NutritionTarget[]> = {
  elder: [
    T("energy_kcal", 1400, 1600, "dietitian", "Kavya Rao", "guide"),
    T("protein_g", 60, null, "dietitian", "Kavya Rao", "guide"),
    T("carbs_g", null, 230, "doctor", "Dr. Anil Nair", "strict"),
    T("added_sugar_g", null, 25, "doctor", "Dr. Anil Nair", "strict"),
    T("sodium_mg", null, 1500, "doctor", "Dr. Anil Nair", "strict"),
    T("fibre_g", 25, null, "dietitian", "Kavya Rao", "guide"),
    T("water_glasses", 8, null, "caregiver", "Rohan", "guide"),
  ],
  self: [
    T("energy_kcal", 2200, 2200, "self", null, "guide"),
    T("protein_g", 150, null, "trainer", "Vikram", "guide"),
    T("fat_g", null, 70, "trainer", "Vikram", "guide"),
    T("water_glasses", 12, null, "self", null, "guide"),
  ],
};
const RULES: Record<Who, FoodRule[]> = {
  elder: [
    { key: "nutrition_target:rule_eggs", text: "Max 2 eggs a day", setBy: "doctor", setByName: "Dr. Anil Nair", how: "strict", counter: "eggs", max: 2, period: "day" },
    { key: "nutrition_target:rule_sugar", text: "No more than 3 tsp of sugar a day", setBy: "caregiver", setByName: "Rohan", how: "guide", counter: "sugar_tsp", max: 3, period: "day" },
  ],
  self: [{ key: "nutrition_target:rule_shake", text: "Protein shake after the gym", setBy: "trainer", setByName: "Vikram", how: "guide", counter: null, max: null, period: "day" }],
};

function counters(who: Who, empty: boolean): NutritionCounter[] {
  const z = (n: number) => (empty ? 0 : n);
  if (who === "elder")
    return [
      { key: "eggs", label: "Eggs", unit: "eggs", today: z(2), usual: 1.2, week: 9, usualWeek: 8, goal: null, limit: 2 },
      { key: "water", label: "Water glasses", unit: "glasses", today: z(5), usual: 6, week: 38, usualWeek: 42, goal: 8, limit: null },
      { key: "tea", label: "Tea cups", unit: "cups", today: z(3), usual: 3, week: 21, usualWeek: 21, goal: null, limit: null },
      { key: "sugar_tsp", label: "Sugar spoons", unit: "tsp", today: z(3), usual: 3, week: 20, usualWeek: 21, goal: null, limit: 3 },
    ];
  return [
    { key: "eggs", label: "Eggs", unit: "eggs", today: z(4), usual: 4, week: 26, usualWeek: 24, goal: null, limit: null },
    { key: "water", label: "Water glasses", unit: "glasses", today: z(7), usual: 9, week: 61, usualWeek: 63, goal: 12, limit: null },
    { key: "tea", label: "Coffee or tea cups", unit: "cups", today: z(2), usual: 2, week: 13, usualWeek: 14, goal: null, limit: null },
    { key: "sugar_tsp", label: "Sugar spoons", unit: "tsp", today: z(0), usual: 1, week: 4, usualWeek: 6, goal: null, limit: null },
  ];
}

type Facts = { proteinUnder: number; proteinHit: number; snackMissed: number; dinnerMissed: number; breakfastEarly: number; sodium: number; logged: number };

function sideLists(who: Who, today: string, f: Facts) {
  const y = shift(today, -1);
  const of7 = (n: number) => (n === f.logged ? `each of the last ${f.logged} days` : `${n} of the last ${f.logged} days`);
  if (who === "elder")
    return {
      pantry: [
        { id: "p1", name: "Eggs", count: 7, of: 12, unit: "eggs", service: "blinkit", serviceLabel: "Blinkit", addedAt: at(shift(today, -3), "10:10"), bestBefore: null },
        { id: "p2", name: "Toned milk, 500 ml", count: 2, of: 6, unit: "packs", service: "instamart", serviceLabel: "Instamart", addedAt: at(y, "07:30"), bestBefore: null },
        { id: "p3", name: "Paneer, 200 g", count: 1, of: 1, unit: "pack", service: "blinkit", serviceLabel: "Blinkit", addedAt: at(shift(today, -3), "10:10"), bestBefore: shift(today, 2) },
        { id: "p4", name: "Bananas", count: 4, of: 6, unit: "bananas", service: "zepto", serviceLabel: "Zepto", addedAt: at(y, "18:20"), bestBefore: null },
        { id: "p5", name: "Ragi biscuits", count: 1, of: 2, unit: "packs", service: "blinkit", serviceLabel: "Blinkit", addedAt: at(shift(today, -3), "10:10"), bestBefore: null },
      ],
      pending: [
        { id: "pend-idli", taskId: "task-idli", service: "swiggy", serviceLabel: "Swiggy", title: "2 idli with sambar and chutney", deliveredAt: at(today, "16:40"), meal: "snack" as const, kcal: 270, protein: 8, askedAt: at(today, "17:10") },
        { id: "pend-soup", taskId: "task-soup", service: "zomato", serviceLabel: "Zomato", title: "Tomato soup and 2 phulka", deliveredAt: at(y, "20:15"), meal: "dinner" as const, kcal: 290, protein: 8, askedAt: at(y, "20:45") },
      ],
      noticed: [
        { id: "n1", kind: "deviation" as const, text: `Sodium reached ${f.sodium.toLocaleString("en-IN")} mg today, over Dr. Nair's 1,500 mg limit. Largest: khichdi 380 mg, papad 340 mg.`, at: at(today, "20:32"), undoTarget: null },
        { id: "n2", kind: "pattern" as const, text: `Protein stayed under Kavya Rao's 60 g on ${of7(f.proteinUnder)}.`, at: at(today, "20:32"), undoTarget: null },
        { id: "n3", kind: "learned" as const, text: "Maa's katori holds about 180 ml (from her photo). Dal and sabzi use it.", at: at(shift(today, -3), "13:30"), undoTarget: "learned:portion_katori" },
        { id: "n4", kind: "learned" as const, text: "Usually 2 rotis at lunch. When the number isn't said, Saheli writes 2 and marks it Estimate.", at: at(shift(today, -2), "14:05"), undoTarget: "learned:usual_lunch_roti" },
        { id: "n5", kind: "pattern" as const, text: `The afternoon snack wasn't logged on ${f.snackMissed} of the last 7 days.`, at: at(today, "20:32"), undoTarget: null },
        { id: "n6", kind: "pattern" as const, text: `Breakfast was eaten before 9 am on ${of7(f.breakfastEarly)}.`, at: at(today, "20:32"), undoTarget: null },
      ],
      shares: [{ id: "s1", url: "https://kavach.example/n/7Kq2Mx", days: 14, forName: "Dr. Anil Nair", createdAt: at(shift(today, -3), "19:00"), expiresAt: at(shift(today, 4), "19:00"), revokedAt: null, opens: 2 }],
    };
  return {
    pantry: [
      { id: "q1", name: "Protein bars", count: 5, of: 12, unit: "bars", service: "zepto", serviceLabel: "Zepto", addedAt: at(shift(today, -6), "19:10"), bestBefore: null },
      { id: "q2", name: "Whey, 1 kg", count: 18, of: 30, unit: "scoops", service: "blinkit", serviceLabel: "Blinkit", addedAt: at(shift(today, -12), "11:00"), bestBefore: null },
      { id: "q3", name: "Greek yogurt cups", count: 3, of: 4, unit: "cups", service: "instamart", serviceLabel: "Instamart", addedAt: at(y, "08:20"), bestBefore: shift(today, 3) },
      { id: "q4", name: "Eggs", count: 18, of: 30, unit: "eggs", service: "blinkit", serviceLabel: "Blinkit", addedAt: at(shift(today, -4), "09:00"), bestBefore: null },
    ],
    pending: [{ id: "pend-wrap", taskId: "task-wrap", service: "zomato", serviceLabel: "Zomato", title: "Paneer tikka wrap", deliveredAt: at(y, "22:05"), meal: "dinner" as const, kcal: 520, protein: 22, askedAt: null }],
    noticed: [
      { id: "m1", kind: "pattern" as const, text: `Protein reached Vikram's 150 g on ${f.proteinHit} of the last ${f.logged} logged days.`, at: at(today, "14:00"), undoTarget: null },
      { id: "m2", kind: "pattern" as const, text: `Dinner wasn't logged on ${f.dinnerMissed} of the last 7 days.`, at: at(today, "14:00"), undoTarget: null },
      { id: "m3", kind: "learned" as const, text: "Your scoop is 32 g of whey (from the label photo).", at: at(shift(today, -5), "11:40"), undoTarget: "learned:portion_scoop" },
      { id: "m4", kind: "learned" as const, text: "\"Eggs\" means boiled eggs unless you say otherwise.", at: at(y, "07:55"), undoTarget: "learned:usual_eggs" },
    ],
    shares: [],
  };
}

/* ── the answer ──────────────────────────────────────────────────────────── */

export function nutritionFixture(who: Who, opts: { today: string; day?: string | null; range: 1 | 7 | 30; emptyToday?: boolean }): NutritionView {
  const today = opts.today;
  const day = opts.day && opts.day <= today ? opts.day : today;
  const empty = Boolean(opts.emptyToday);
  const get = (d: string) => dayOf(who, d, today, empty);

  const monthStart = `${day.slice(0, 8)}01`;
  const monthDays: string[] = [];
  for (let d = monthStart; d.slice(0, 7) === day.slice(0, 7); d = shift(d, 1)) monthDays.push(d);

  let from = day;
  let to = day;
  let days: NutritionDay[];
  if (opts.range === 7) {
    from = shift(day, -6);
    days = Array.from({ length: 7 }, (_, i) => get(shift(from, i)));
  } else if (opts.range === 30) {
    from = monthStart;
    to = monthDays.filter((d) => d <= today).pop() ?? monthStart;
    days = monthDays.filter((d) => d <= today && d >= SINCE).map(get);
  } else {
    days = [get(day)];
  }

  const calendar: CalendarDay[] = monthDays.map((d) => {
    const x = get(d);
    return { day: d, tracked: d >= SINCE, logged: [...new Set(x.meals.map((m) => m.meal).filter((m) => m !== "other"))], kcal: x.meals.length ? (x.totals.energy_kcal ?? null) : null };
  });
  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const x = get(shift(day, i - 6));
    return { day: x.day, kcal: x.meals.length ? (x.totals.energy_kcal ?? null) : null, protein: x.meals.length ? (x.totals.protein_g ?? null) : null, logged: x.meals.filter((m) => m.meal !== "other").length };
  });
  const avgOver = (n: number) => {
    const list = Array.from({ length: n }, (_, i) => get(shift(day, -i))).filter((x) => x.meals.length);
    const out: Nutrients = {};
    for (const k of KEYS) out[k] = list.length ? Math.round((list.reduce((s, x) => s + (x.totals[k] ?? 0), 0) / list.length) * 10) / 10 : undefined;
    return { out, n: list.length };
  };
  const d7 = avgOver(7);
  const d30 = avgOver(30);
  const last7 = Array.from({ length: 7 }, (_, i) => get(shift(today, -i)));
  const ate = last7.filter((x) => x.meals.length);
  const has = (x: NutritionDay, m: MealSlot) => x.meals.some((y) => y.meal === m);
  const side = sideLists(who, today, {
    logged: ate.length,
    proteinUnder: ate.filter((x) => (x.totals.protein_g ?? 0) < 60).length,
    proteinHit: ate.filter((x) => (x.totals.protein_g ?? 0) >= 150).length,
    snackMissed: last7.filter((x) => !has(x, "snack")).length,
    dinnerMissed: last7.filter((x) => !has(x, "dinner")).length,
    breakfastEarly: ate.filter((x) => x.meals.some((y) => y.meal === "breakfast" && y.at.slice(11, 16) < "09:00")).length,
    sodium: Math.round(get(today).totals.sodium_mg ?? 0),
  });
  const foods = [...new Map(Object.values(who === "elder" ? E : S).map((f) => [f.name, { name: f.name, unit: f.unit ?? "piece" }])).values()];

  return {
    subjectId: who === "elder" ? ELDER_ID : SELF_ID,
    today,
    day,
    range: opts.range,
    from,
    to,
    tracking: { level: "full", since: SINCE },
    conditions:
      who === "elder"
        ? [
            { key: "diabetes", label: "Diabetes", nutrients: ["added_sugar_g", "carbs_g"] },
            { key: "high_bp", label: "High BP", nutrients: ["sodium_mg"] },
          ]
        : [],
    targets: TARGETS[who],
    rules: RULES[who],
    days,
    calendar,
    week,
    averages: { d7: d7.out, d30: d30.out, d7Days: d7.n, d30Days: d30.n },
    counters: counters(who, empty && day === today),
    pantry: side.pantry,
    pending: empty ? [] : side.pending,
    noticed: empty ? side.noticed.filter((n) => n.kind !== "deviation") : side.noticed,
    shares: side.shares,
    foods,
    nextAsk: day !== today ? null : empty ? { meal: "breakfast", at: "09:00" } : who === "self" ? { meal: "dinner", at: "22:00" } : null,
  };
}
