"use client";

import {
  ArrowCounterClockwise,
  CaretLeft,
  CaretRight,
  ChartLineUp,
  CopySimple,
  FilePdf,
  ForkKnife,
  LinkSimple,
  Package,
  Plus,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { INPUT, LABEL, SideDrawer, useLoad } from "./care-kit";
import { ErrorNote, OnWhatsApp, PageHeading } from "./feature-kit";
import {
  Beads,
  ConfidenceLegend,
  Counter,
  DIARY_COLS,
  DiaryColumnHeads,
  DiaryTotal,
  IconBtn,
  MAIN_MEALS,
  MEAL_LABEL,
  MEAL_ORDER,
  MealEntry,
  MonthCalendar,
  NotLogged,
  NutrientTable,
  SummaryBar,
  WeekChart,
  addFood,
  changeEntry,
  clockOf,
  confirmEaten,
  dayDate,
  fmtDayLong,
  getNutrition,
  num,
  revokeShare,
  shareWithDoctor,
  shiftDay,
  targetState,
  undoChange,
  type MealAction,
  type MealSlot,
  type NutrientKey,
  type NutritionDay,
  type NutritionMeal,
  type NutritionView,
  type Nutrients,
  type PendingMeal,
} from "./nutrition-kit";
import { callName, possessive, usePerson } from "./person-context";
import { ServiceLogo } from "./service-logo";
import { Panel, PanelTitle, PillTabs, SmallButton } from "./ui";

type ViewId = "day" | "week" | "month";
const RANGE: Record<ViewId, 1 | 7 | 30> = { day: 1, week: 7, month: 30 };
type SummaryKey = NutrientKey | "water_glasses";
const SUMMARY_KEYS: SummaryKey[] = ["energy_kcal", "protein_g", "carbs_g", "fat_g", "fibre_g", "water_glasses"];

const relDay = (iso: string, today: string) => {
  const k = dayDate(iso.slice(0, 10)).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  if (k === today) return "today";
  if (k === shiftDay(today, -1)) return "yesterday";
  return fmtDayLong(k, { weekday: "short", day: "numeric", month: "short" });
};

/** Daily average over the days that have anything logged. */
function average(days: NutritionDay[]) {
  const logged = days.filter((d) => d.meals.length);
  const out: Partial<Record<SummaryKey, number | null>> = {};
  const all: Nutrients = {};
  if (!logged.length) return { values: out, all, logged };
  const keys = new Set<NutrientKey>();
  logged.forEach((d) => (Object.keys(d.totals) as NutrientKey[]).forEach((k) => keys.add(k)));
  keys.forEach((k) => (all[k] = logged.reduce((n, d) => n + (d.totals[k] ?? 0), 0) / logged.length));
  SUMMARY_KEYS.forEach((k) => (out[k] = k === "water_glasses" ? logged.reduce((n, d) => n + d.water.glasses, 0) / logged.length : (all[k] ?? null)));
  return { values: out, all, logged };
}

export function NutritionPage() {
  const { familyId, selectedId, selected, isCaregiver } = usePerson();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = (["day", "week", "month"].includes(params.get("view") ?? "") ? params.get("view") : "day") as ViewId;
  const asked = params.get("day");
  const self = Boolean(selected?.self);
  const name = callName(selected);
  const them = self ? "you" : name || "them";

  const setParams = useCallback(
    (next: { view?: ViewId; day?: string | null }) => {
      const q = new URLSearchParams(params.toString());
      if (next.view === "day") q.delete("view");
      else if (next.view) q.set("view", next.view);
      if (next.day === null) q.delete("day");
      else if (next.day) q.set("day", next.day);
      router.replace(`${pathname}?${q}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const key = familyId && selectedId ? `${familyId}:${selectedId}:${view}:${asked ?? ""}` : null;
  const load = useCallback(() => getNutrition(familyId as string, selectedId as string, RANGE[view], asked), [familyId, selectedId, view, asked]);
  const { data, error, loading, reload, update } = useLoad<NutritionView>(key, load);

  const [adding, setAdding] = useState<{ meal: MealSlot; time: string } | null>(null);
  const [editing, setEditing] = useState<NutritionMeal | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [flash, setFlash] = useState("");

  const day = data?.day ?? asked ?? "";
  const today = data?.today ?? "";
  const pick = (d: string, v: ViewId = "day") => setParams({ view: v, day: d === today ? null : d });

  const onAction = async (a: MealAction, meal: NutritionMeal) => {
    if (!familyId || !selectedId) return;
    if (a === "edit" || a === "move") return setEditing(meal);
    if (a === "add") return setAdding({ meal: meal.meal, time: clockOf(meal.at) });
    try {
      if (a === "delete") {
        if (!window.confirm(`Remove ${MEAL_LABEL[meal.meal].toLowerCase()} from ${fmtDayLong(day, { day: "numeric", month: "short" })}? You can undo it.`)) return;
        await Promise.all(meal.items.map((it) => changeEntry(familyId, selectedId, it.id, { deleted: true })));
        setFlash(`${MEAL_LABEL[meal.meal]} removed. Undo it from Saheli on WhatsApp or the meal menu.`);
      } else {
        await undoChange(familyId, selectedId, `meal:${meal.id}`);
        setFlash(`Last change to ${MEAL_LABEL[meal.meal].toLowerCase()} undone.`);
      }
      reload();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : "Couldn't save");
    }
  };

  return (
    // data marks (dots, beads, bars, meters) are jade; on the dark surface a lighter step of it keeps 3:1
    <div className="space-y-4 [--n-mark:var(--c-solid)] dark:[--n-mark:#3d9a83]">
      <PageHeading
        light={possessive(selected)}
        dark="Food & nutrition"
        sub={
          self
            ? "What you ate, as you told Saheli. The numbers sit in the margin, with how sure each one is."
            : `What ${name || "they"} ate, as Saheli heard it. The numbers sit in the margin, with how sure each one is.`
        }
        right={
          <div className="flex flex-wrap items-center gap-2.5">
            <PillTabs<ViewId>
              value={view}
              onChange={(v) => setParams({ view: v })}
              tabs={[
                { id: "day", label: "Day" },
                { id: "week", label: "Week" },
                { id: "month", label: "Month" },
              ]}
            />
            <button
              type="button"
              onClick={() => setAdding({ meal: "snack", time: "" })}
              className="inline-flex h-11 items-center gap-3 rounded-full bg-[var(--c-solid)] pl-5 pr-1.5 text-[14px] font-medium text-[var(--c-on-solid)] transition-opacity hover:opacity-90"
            >
              Add food
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--c-frame)] text-[var(--c-ink)]">
                <Plus size={15} weight="bold" />
              </span>
            </button>
          </div>
        }
      />

      {flash && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">
          {flash}
          <button type="button" onClick={() => setFlash("")} className="shrink-0 text-[12px] font-medium underline-offset-2 hover:underline">
            OK
          </button>
        </p>
      )}
      {error && !loading && <ErrorNote>{error}</ErrorNote>}

      {!data ? (
        loading || !error ? (
          <div className="space-y-4" aria-busy>
            <div className="h-[200px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_372px]">
              <div className="h-[560px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
              <div className="h-[560px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
            </div>
          </div>
        ) : null
      ) : data.tracking.level === "off" ? (
        <Panel>
          <PanelTitle title="Food tracking is off" />
          <p className="mt-2 max-w-[560px] text-[13px] text-[var(--c-ink-2)]">
            Saheli isn&apos;t keeping a food diary for {them}. Turn it back on from Settings, or tell Saheli &ldquo;start tracking food again&rdquo;.
          </p>
        </Panel>
      ) : (
        <>
          <Band data={data} view={view} name={name} self={self} onPick={(d) => pick(d, view)} />

          <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_372px]", loading && "opacity-60 transition-opacity")}>
            <div className="min-w-0">
              {view === "day" && (
                <DiaryPanel
                  data={data}
                  name={name}
                  self={self}
                  menu={menu}
                  onMenu={setMenu}
                  onAction={onAction}
                  onAdd={(meal, time) => setAdding({ meal, time })}
                />
              )}
              {view === "week" && <WeekPanel data={data} onPick={(d) => pick(d)} onAdd={(d) => pick(d)} />}
              {view === "month" && <MonthPanel data={data} onPick={(d) => pick(d)} />}
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Panel>
                <MonthCalendar
                  days={data.calendar}
                  selected={day}
                  today={today}
                  range={view === "week" ? { from: data.from, to: data.to } : null}
                  onPick={(d) => pick(d, view === "month" ? "day" : view)}
                  onMonth={(dir) => {
                    const first = data.calendar[0]?.day ?? day;
                    const target = dir < 0 ? shiftDay(first, -1) : shiftDay(data.calendar[data.calendar.length - 1].day, 1);
                    pick(target > today ? today : target, view);
                  }}
                />
              </Panel>
              <Panel>
                <PanelTitle title="Counts" right={<span className="text-[11.5px] text-[var(--c-ink-2)]">{view === "day" ? "today against usual" : "this week against usual"}</span>} />
                <div className="mt-3">
                  {data.counters.map((c) => (
                    <Counter key={c.key} c={c} mode={view === "day" ? "day" : "week"} rule={data.rules.find((r) => r.counter === c.key)} />
                  ))}
                </div>
              </Panel>
              <Panel className="md:col-span-2 xl:col-span-1">
                <PanelTitle title="Last 7 days" right={<ChartLineUp size={17} className="text-[var(--c-ink-2)]" />} />
                <div className="mt-4">
                  <WeekChart
                    week={data.week}
                    kcal={data.targets.find((t) => t.nutrient === "energy_kcal" && t.status === "active")}
                    protein={data.targets.find((t) => t.nutrient === "protein_g" && t.status === "active")}
                    selected={day}
                    onPick={(d) => pick(d)}
                  />
                </div>
              </Panel>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_372px]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
              <Panel>
                <PanelTitle
                  title="Nutrients against targets"
                  right={<span className="text-[11.5px] text-[var(--c-ink-2)]">{view === "day" ? fmtDayLong(day, { weekday: "short", day: "numeric", month: "short" }) : "daily averages"}</span>}
                />
                <div className="mt-3">
                  <NutrientTable
                    now={view === "day" ? (data.days[0]?.totals ?? {}) : average(data.days).all}
                    nowLabel={view === "day" ? (day === today ? "Today" : "This day") : view === "week" ? "This week" : "This month"}
                    view={data}
                  />
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-[var(--c-ink-2)]">
                  {data.conditions.length
                    ? `Shown first for ${self ? "your" : `${name}'s`} ${data.conditions.map((c) => c.label.replace(/^./, (ch) => ch.toLowerCase())).join(" and ")}. `
                    : ""}
                  Targets are whatever {self ? "you or your care team" : "the family or the care team"} set; rows without one are tracked without judgement. Numbers only, not
                  medical advice.
                </p>
              </Panel>
              <NoticedPanel data={data} self={self} onUndo={async (id, target) => {
                if (!familyId || !selectedId) return;
                update((d) => ({ ...d, noticed: d.noticed.filter((n) => n.id !== id) }));
                await undoChange(familyId, selectedId, target).catch(() => reload());
              }} />
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 md:grid-cols-2 xl:grid-cols-1">
              <PendingPanel
                pending={data.pending}
                name={name}
                self={self}
                today={today}
                onAnswer={async (p, answer) => {
                  if (!familyId || !selectedId) return;
                  await confirmEaten(familyId, selectedId, p.id, answer);
                  reload();
                }}
              />
              <PantryPanel data={data} self={self} name={name} />
              {isCaregiver && <SharePanel data={data} name={name} self={self} />}
            </div>
          </div>
        </>
      )}

      <OnWhatsApp>
        {self ? (
          <>tell Saheli &ldquo;had 2 rotis and dal for lunch&rdquo;, send a photo of the plate, or ask &ldquo;how much protein today?&rdquo;</>
        ) : (
          <>tell Saheli &ldquo;{name || "Maa"} had 2 rotis and dal for lunch&rdquo;, or ask &ldquo;how many eggs did {name || "Maa"} eat this week?&rdquo;</>
        )}
      </OnWhatsApp>

      <AddFoodDrawer
        open={Boolean(adding)}
        preset={adding}
        foods={data?.foods ?? []}
        day={day}
        whose={self ? "your" : `${name}'s`}
        onClose={() => setAdding(null)}
        onSave={async (body) => {
          if (!familyId || !selectedId) return;
          await addFood(familyId, selectedId, body);
          setAdding(null);
          setFlash(`Saved to ${self ? "your" : `${name}'s`} diary. Saheli works out the numbers in a moment.`);
          reload();
        }}
      />
      <EditMealDrawer
        meal={editing}
        onClose={() => setEditing(null)}
        onSave={async (changes) => {
          if (!familyId || !selectedId) return;
          await Promise.all(changes.map((c) => changeEntry(familyId, selectedId, c.id, c.set)));
          setEditing(null);
          setFlash("Changes saved. Undo them from the meal menu.");
          reload();
        }}
      />
    </div>
  );
}

/* ── the band: the date and the slim summary bar ────────────────────────── */

function Band({ data, view, name, self, onPick }: { data: NutritionView; view: ViewId; name: string; self: boolean; onPick: (day: string) => void }) {
  const isToday = data.day === data.today;
  const dayData = data.days[0];
  const logged = view === "day" && dayData ? MAIN_MEALS.filter((m) => dayData.meals.some((x) => x.meal === m)) : [];
  const avg = useMemo(() => average(data.days), [data.days]);
  const step = view === "day" ? 1 : view === "week" ? 7 : 30;
  const values: Partial<Record<SummaryKey, number | null>> =
    view === "day" ? { ...Object.fromEntries(SUMMARY_KEYS.map((k) => [k, k === "water_glasses" ? (dayData?.water.glasses ?? 0) : (dayData?.totals[k as NutrientKey] ?? null)])) } : avg.values;
  const hitDays =
    view === "day"
      ? undefined
      : Object.fromEntries(
          SUMMARY_KEYS.map((k) => {
            const t = data.targets.find((x) => x.nutrient === k && x.status === "active");
            const hit = t ? avg.logged.filter((d) => ["met", "within"].includes(targetState(k === "water_glasses" ? d.water.glasses : d.totals[k as NutrientKey], t))).length : 0;
            return [k, { hit, of: avg.logged.length }];
          }),
        );

  let big: string;
  let line1: string;
  let line2: string;
  if (view === "day") {
    big = String(Number(data.day.slice(8, 10)));
    line1 = fmtDayLong(data.day, { weekday: "long" });
    line2 = `${fmtDayLong(data.day, { month: "long", year: "numeric" })}${isToday ? " · Today" : data.day === shiftDay(data.today, -1) ? " · Yesterday" : ""}`;
  } else if (view === "week") {
    big = `${Number(data.from.slice(8, 10))}–${Number(data.to.slice(8, 10))}`;
    line1 = data.from.slice(5, 7) === data.to.slice(5, 7) ? fmtDayLong(data.to, { month: "long" }) : `${fmtDayLong(data.from, { month: "short" })} – ${fmtDayLong(data.to, { month: "short" })}`;
    line2 = `Week · ${avg.logged.length} of 7 days logged`;
  } else {
    big = fmtDayLong(data.day, { month: "long" });
    line1 = fmtDayLong(data.day, { year: "numeric" });
    line2 = `Month · ${avg.logged.length} days logged`;
  }

  return (
    <Panel className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <IconBtn label={view === "day" ? "Previous day" : view === "week" ? "Previous week" : "Previous month"} onClick={() => onPick(shiftDay(data.day, -step))}>
            <CaretLeft size={15} weight="bold" />
          </IconBtn>
          <div className="flex items-end gap-3">
            <span className={cn("c-num whitespace-nowrap font-light leading-[0.82] tracking-[-0.05em]", big.length > 3 ? "text-[38px] sm:text-[58px]" : "text-[48px] sm:text-[58px]")}>{big}</span>
            <div className="pb-0.5 leading-tight">
              <p className="text-[16px] font-medium sm:text-[17px]">{line1}</p>
              <p className="text-[12.5px] text-[var(--c-ink-2)]">{line2}</p>
            </div>
          </div>
          <IconBtn
            label={view === "day" ? "Next day" : view === "week" ? "Next week" : "Next month"}
            onClick={() => onPick(shiftDay(data.day, step) > data.today ? data.today : shiftDay(data.day, step))}
            disabled={data.day >= data.today}
          >
            <CaretRight size={15} weight="bold" />
          </IconBtn>
          {!isToday && (
            <SmallButton onClick={() => onPick(data.today)} className="ml-1">
              Today
            </SmallButton>
          )}
        </div>
        {view === "day" && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-[var(--c-ink-2)]">
            <span className="flex items-center gap-2">
              <span className="flex gap-1" aria-hidden>
                {MAIN_MEALS.map((m) => (
                  <span key={m} title={MEAL_LABEL[m]} className={cn("h-2 w-2 rounded-full", logged.includes(m) ? "bg-[var(--n-mark)]" : "border border-[var(--c-ink-2)]")} />
                ))}
              </span>
              <span>
                <b className="font-medium text-[var(--c-ink)]">{logged.length} of 4</b> meals logged
              </span>
            </span>
            {isToday && data.nextAsk && (
              <span>
                Saheli asks {self ? "you" : name} about {MEAL_LABEL[data.nextAsk.meal].toLowerCase()} at {data.nextAsk.at}
              </span>
            )}
          </div>
        )}
      </div>
      <SummaryBar values={values} targets={data.targets} hitDays={hitDays} />
    </Panel>
  );
}

/* ── day: the diary page ────────────────────────────────────────────────── */

function DiaryPanel({
  data,
  name,
  self,
  menu,
  onMenu,
  onAction,
  onAdd,
}: {
  data: NutritionView;
  name: string;
  self: boolean;
  menu: string | null;
  onMenu: (id: string | null) => void;
  onAction: (a: MealAction, meal: NutritionMeal) => void;
  onAdd: (meal: MealSlot, time: string) => void;
}) {
  const d = data.days[0];
  const rows = useMemo(() => {
    if (!d) return [];
    // in the order of the day: meals at their time, a missing one at its usual time; "through the day" closes the page
    type Row = { kind: "meal"; meal: NutritionMeal; at: string } | { kind: "missing"; m: NutritionDay["missing"][number]; at: string };
    const fallback: Record<MealSlot, string> = { breakfast: "08:00", lunch: "13:00", snack: "16:30", dinner: "20:00", other: "99:99" };
    const list: Row[] = [
      ...d.meals.map((meal) => ({ kind: "meal" as const, meal, at: meal.meal === "other" ? "99:99" : clockOf(meal.at) })),
      ...d.missing.map((m) => ({ kind: "missing" as const, m, at: m.usual ?? fallback[m.meal] })),
    ];
    return list.sort((a, b) => a.at.localeCompare(b.at) || MEAL_ORDER.indexOf(a.kind === "meal" ? a.meal.meal : a.m.meal) - MEAL_ORDER.indexOf(b.kind === "meal" ? b.meal.meal : b.m.meal));
  }, [d]);
  const empty = !d || d.meals.length === 0;
  const isToday = data.day === data.today;
  const pendingFor = (id: string | null) => data.pending.find((p) => p.id === id);

  return (
    <Panel className="flex h-full flex-col p-2 sm:p-5">
      <div className="px-2 sm:px-0">
        <PanelTitle title={self ? "Your diary" : `${name}'s diary`} right={<ConfidenceLegend />} />
      </div>
      <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-[18px] bg-[var(--c-frame)] pb-1">
        <DiaryColumnHeads left={fmtDayLong(data.day, { day: "numeric", month: "short" })} />
        {empty && (
          <div className={cn(DIARY_COLS, "border-b border-[var(--c-line)]")}>
            <div className="border-r border-[color-mix(in_srgb,var(--c-accent)_70%,transparent)]" />
            <div className="col-span-3 px-3 py-5 sm:px-5">
              <p className="text-[15px] font-medium">{isToday ? "Not logged yet" : "Nothing logged this day"}</p>
              <p className="mt-1 max-w-[520px] text-[13px] leading-relaxed text-[var(--c-ink-2)]">
                {isToday
                  ? `${data.nextAsk ? `Saheli asks ${self ? "you" : name} about ${MEAL_LABEL[data.nextAsk.meal].toLowerCase()} at ${data.nextAsk.at} if she hasn't heard by then. ` : ""}Add a meal here, or tell her on WhatsApp in a line or a photo.`
                  : `Add what ${self ? "you" : name} ate from memory; it saves as an estimate unless you know the amounts.`}
              </p>
            </div>
          </div>
        )}
        {rows.map((r) =>
          r.kind === "meal" ? (
            <MealEntry key={r.meal.id} meal={r.meal} onAction={onAction} menuOpen={menu === r.meal.id} onMenu={(o) => onMenu(o ? r.meal.id : null)} />
          ) : (
            <NotLogged
              key={`miss-${r.m.meal}`}
              m={r.m}
              onAdd={() => onAdd(r.m.meal, r.m.usual ?? "")}
              note={(() => {
                const p = pendingFor(r.m.pendingId);
                return p ? `A ${p.serviceLabel} order came at ${clockOf(p.deliveredAt)}. Did ${self ? "you" : name} eat it? Answer below.` : null;
              })()}
              onNote={() => document.getElementById("did-they-eat")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            />
          ),
        )}
        {empty ? null : (
          <DiaryTotal
            label="Day total"
            kcal={d.totals.energy_kcal}
            protein={d.totals.protein_g}
            aside={`${d.meals.reduce((n, m) => n + m.items.length, 0)} items · water ${d.water.glasses} ${d.water.glasses === 1 ? "glass" : "glasses"}`}
          />
        )}
        <div className="flex flex-1 items-end justify-center px-4 pb-3 pt-5">
          <button
            type="button"
            onClick={() => onAdd("other", "")}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-[var(--c-ink-2)] transition-colors hover:bg-[var(--c-card)] hover:text-[var(--c-ink)]"
          >
            <Plus size={13} weight="bold" /> Add something else to {fmtDayLong(data.day, { day: "numeric", month: "short" })}
          </button>
        </div>
      </div>
    </Panel>
  );
}

/* ── week: seven days at a glance ───────────────────────────────────────── */

function WeekPanel({ data, onPick, onAdd }: { data: NutritionView; onPick: (day: string) => void; onAdd: (day: string) => void }) {
  const days = [...data.days].sort((a, b) => a.day.localeCompare(b.day));
  const avg = average(days);
  return (
    <Panel className="flex h-full flex-col p-2 sm:p-5">
      <div className="px-2 sm:px-0">
        <PanelTitle title="The week at a glance" right={<span className="hidden text-[11.5px] text-[var(--c-ink-2)] sm:inline">tap a day to open its page</span>} />
      </div>
      <div className="mt-4 overflow-hidden rounded-[18px] bg-[var(--c-frame)] pb-1">
        <DiaryColumnHeads left="Day" />
        {days.map((d) => {
          const future = d.day > data.today;
          return (
            <div key={d.day} className={DIARY_COLS}>
              <button
                type="button"
                onClick={() => onPick(d.day)}
                disabled={future}
                aria-label={`Open ${fmtDayLong(d.day, { weekday: "long", day: "numeric", month: "long" })}`}
                className="flex flex-col items-end justify-start border-b border-r border-[var(--c-line)] border-r-[color-mix(in_srgb,var(--c-accent)_70%,transparent)] pr-2 pt-3 text-right transition-colors hover:bg-[var(--c-card)] sm:pr-4"
              >
                <span className={cn("c-num text-[24px] font-light leading-none sm:text-[30px]", d.day === data.today && "font-normal")}>{Number(d.day.slice(8, 10))}</span>
                <span className="mt-1 text-[11px] text-[var(--c-ink-2)]">{d.day === data.today ? "Today" : fmtDayLong(d.day, { weekday: "short" })}</span>
              </button>
              <div className="min-w-0 border-b border-[var(--c-line)] p-2 sm:p-2.5">
                {/* phones: one line per meal; wider screens: four cards side by side */}
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-1.5 lg:grid-cols-4">
                  {MAIN_MEALS.map((slot) => {
                    const meals = d.meals.filter((m) => m.meal === slot);
                    const head = (time: string | null) => (
                      <span className="flex w-[50px] shrink-0 flex-col text-[10.5px] leading-tight text-[var(--c-ink-2)] sm:w-full sm:flex-row sm:items-center sm:justify-between sm:gap-1 sm:text-[11px]">
                        <span className="font-medium">{MEAL_LABEL[slot]}</span>
                        {time && <span className="c-num">{time}</span>}
                      </span>
                    );
                    if (!meals.length) {
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => onAdd(d.day)}
                          disabled={future}
                          className="flex min-w-0 items-center gap-2 rounded-[10px] border border-dashed border-[var(--c-line)] px-2 py-1.5 text-left sm:min-h-[74px] sm:flex-col sm:items-start sm:justify-between sm:gap-0 sm:rounded-[12px] sm:px-2.5 sm:py-2"
                        >
                          {head(null)}
                          <span className="text-[12px] text-[var(--c-ink-2)]">{future ? "" : "Not logged"}</span>
                        </button>
                      );
                    }
                    const items = meals.flatMap((m) => m.items);
                    const kcal = meals.reduce((n, m) => n + (m.totals.energy_kcal ?? 0), 0);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => onPick(d.day)}
                        className="flex min-w-0 items-center gap-2 rounded-[10px] bg-[var(--c-card)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--c-line)] sm:min-h-[74px] sm:flex-col sm:items-stretch sm:gap-0 sm:rounded-[12px] sm:px-2.5 sm:py-2"
                      >
                        {head(clockOf(meals[0].at))}
                        <span className="line-clamp-2 min-w-0 flex-1 text-[12.5px] leading-snug sm:mt-0.5 sm:flex-none">
                          {items.map((it) => it.name).join(", ").replace(/^./, (c) => c.toUpperCase())}
                        </span>
                        <span className="c-num hidden shrink-0 text-[11px] text-[var(--c-ink-2)] sm:mt-auto sm:block sm:pt-1">{num(kcal)} kcal</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="c-num flex items-start justify-end border-b border-l border-[var(--c-line)] pr-2.5 pt-3.5 text-[14px] font-medium tabular-nums sm:pr-3.5">{d.meals.length ? num(d.totals.energy_kcal) : "—"}</div>
              <div className="c-num flex items-start justify-end border-b border-l border-[var(--c-line)] pr-2.5 pt-3.5 text-[14px] font-medium tabular-nums sm:pr-3.5">{d.meals.length ? num(d.totals.protein_g, 1) : "—"}</div>
            </div>
          );
        })}
        <DiaryTotal label="Daily average" kcal={avg.all.energy_kcal} protein={avg.all.protein_g} aside={`${avg.logged.length} of 7 days logged`} />
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 px-1 pt-4 sm:grid-cols-4 sm:px-0">
        {MAIN_MEALS.map((slot) => {
          const got = days.filter((d) => d.day <= data.today && d.meals.some((m) => m.meal === slot));
          const of = days.filter((d) => d.day <= data.today).length;
          return (
            <div key={slot} className="rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-medium">{MEAL_LABEL[slot]}</span>
                <span className="text-[11.5px] text-[var(--c-ink-2)]">
                  <b className="c-num text-[16px] font-normal text-[var(--c-ink)]">{got.length}</b> / {of} days
                </span>
              </p>
              <span className="mt-2 flex gap-[3px]" aria-hidden>
                {days.map((d) => (
                  <span key={d.day} className={cn("h-[6px] flex-1 rounded-full", d.meals.some((m) => m.meal === slot) ? "bg-[var(--n-mark)]" : "bg-[var(--c-line)]")} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ── month: the bigger calendar ─────────────────────────────────────────── */

function MonthPanel({ data, onPick }: { data: NutritionView; onPick: (day: string) => void }) {
  const kcalT = data.targets.find((t) => t.nutrient === "energy_kcal" && t.status === "active");
  const lead = data.calendar.length ? (dayDate(data.calendar[0].day).getUTCDay() + 6) % 7 : 0;
  const byDay = new Map(data.days.map((d) => [d.day, d]));
  return (
    <Panel className="h-full p-3 sm:p-5">
      <div className="px-2 sm:px-0">
        <PanelTitle title="The month" right={<span className="text-[11.5px] text-[var(--c-ink-2)]">kcal and protein each day · tap to open</span>} />
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
          <span key={w} className="pb-1 text-center text-[11px] font-medium text-[var(--c-ink-2)]">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {data.calendar.map((c) => {
          const d = byDay.get(c.day);
          const future = c.day > data.today;
          const st = targetState(c.kcal, kcalT);
          return (
            <button
              key={c.day}
              type="button"
              disabled={future || !c.tracked}
              onClick={() => onPick(c.day)}
              className={cn(
                "flex min-h-[64px] flex-col justify-between rounded-[12px] p-1.5 text-left transition-colors sm:min-h-[88px] sm:p-2",
                c.day === data.day ? "bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : future || !c.tracked ? "bg-transparent text-[var(--c-ink-3)]" : "bg-[var(--c-frame)] hover:bg-[var(--c-line)]",
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="c-num text-[12px] font-medium">{Number(c.day.slice(8))}</span>
                {!future && c.tracked && (
                  <span className="hidden gap-[2px] sm:flex" aria-hidden>
                    {MAIN_MEALS.map((m) => (
                      <span key={m} className={cn("h-[4px] w-[4px] rounded-full", c.logged.includes(m) ? (c.day === data.day ? "bg-[var(--c-accent-ink)]" : "bg-[var(--n-mark)]") : "bg-[var(--c-ink-3)] opacity-40")} />
                    ))}
                  </span>
                )}
              </span>
              {!future && c.tracked && c.kcal ? (
                <span>
                  <span className="c-num block text-[13px] leading-none sm:text-[17px]">{num(c.kcal)}</span>
                  <span className={cn("mt-0.5 hidden text-[10.5px] sm:block", c.day === data.day ? "" : "text-[var(--c-ink-2)]")}>
                    {d ? `${num(d.totals.protein_g)} g protein` : st === "within" || st === "met" ? "in target" : "kcal"}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

/* ── below the day ──────────────────────────────────────────────────────── */

function PendingPanel({ pending, name, self, today, onAnswer }: { pending: PendingMeal[]; name: string; self: boolean; today: string; onAnswer: (p: PendingMeal, a: "yes" | "part" | "no") => Promise<void> }) {
  const [done, setDone] = useState<Record<string, string>>({});
  return (
    <Panel id="did-they-eat">
      <PanelTitle title={self ? "Did you eat it?" : `Did ${name} eat it?`} right={pending.length ? <span className="text-[11.5px] text-[var(--c-ink-2)]">{pending.length} waiting</span> : null} />
      <p className="mt-1 text-[12px] text-[var(--c-ink-2)]">Delivered meals go into the diary only after a yes.</p>
      {pending.length === 0 ? (
        <p className="mt-4 rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3 text-[13px] text-[var(--c-ink-2)]">Nothing waiting. Ordered meals show here when they arrive.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pending.map((p) => (
            <li key={p.id} className="rounded-[16px] bg-[var(--c-frame)] p-3">
              <div className="flex items-start gap-3">
                <ServiceLogo service={p.service} label={p.serviceLabel} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium leading-snug">{p.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--c-ink-2)]">
                    {p.serviceLabel} · came {relDay(p.deliveredAt, today)} at {clockOf(p.deliveredAt)}
                    {p.kcal ? ` · about ${num(p.kcal)} kcal, ${num(p.protein)} g protein` : ""}
                  </p>
                  {p.askedAt && !self && (
                    <p className="mt-0.5 text-[11.5px] text-[var(--c-ink-2)]">
                      Saheli asked {name} at {clockOf(p.askedAt)}; no answer yet.
                    </p>
                  )}
                </div>
              </div>
              {done[p.id] ? (
                <p className="mt-2.5 text-[12.5px] font-medium text-[var(--c-ok-ink)]">{done[p.id]}</p>
              ) : (
                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { a: "yes", label: "Yes, all" },
                      { a: "part", label: "Part" },
                      { a: "no", label: "No" },
                    ] as const
                  ).map((b) => (
                    <button
                      key={b.a}
                      type="button"
                      onClick={async () => {
                        setDone((x) => ({ ...x, [p.id]: b.a === "no" ? "Noted: not eaten. Nothing added." : b.a === "part" ? "Saved as part eaten. Change the amount in the diary." : "Saved to the diary." }));
                        await onAnswer(p, b.a).catch(() => setDone((x) => ({ ...x, [p.id]: "" })));
                      }}
                      className={cn(
                        "h-9 rounded-full text-[12.5px] font-medium transition-colors",
                        b.a === "yes" ? "bg-[var(--c-solid)] text-[var(--c-on-solid)] hover:opacity-90" : "border border-[var(--c-line)] bg-[var(--c-frame)] hover:bg-[var(--c-card)]",
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function PantryPanel({ data, self, name }: { data: NutritionView; self: boolean; name: string }) {
  return (
    <Panel>
      <PanelTitle title="At home" right={<Package size={17} className="text-[var(--c-ink-2)]" />} />
      <p className="mt-1 text-[12px] text-[var(--c-ink-2)]">Groceries from orders. They wait here until someone eats them.</p>
      {data.pantry.length === 0 ? (
        <p className="mt-4 rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3 text-[13px] text-[var(--c-ink-2)]">Nothing yet. Food from grocery orders shows here.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--c-line)] rounded-[16px] bg-[var(--c-frame)] px-3.5">
          {data.pantry.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              {p.service ? <ServiceLogo service={p.service} label={p.serviceLabel ?? undefined} size={28} /> : <span className="h-7 w-7 rounded-[8px] bg-[var(--c-card)]" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{p.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Beads count={p.count} of={p.of} />
                  {p.bestBefore && (
                    <span className="whitespace-nowrap rounded-full bg-[var(--c-warn-soft)] px-1.5 py-[1px] text-[10.5px] font-medium text-[var(--c-warn-ink)]">
                      use by {fmtDayLong(p.bestBefore, { weekday: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
              <p className="shrink-0 text-right leading-tight">
                <span className="c-num text-[17px]">{p.count}</span>
                <span className="block text-[11px] text-[var(--c-ink-2)]">{p.of ? `of ${p.of} ${p.unit}` : `${p.unit} left`}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11.5px] text-[var(--c-ink-2)]">
        Saheli counts down as {self ? "you tell her what you ate" : `${name} eats`}. Tell her &ldquo;{self ? "I" : name} had 2 bananas&rdquo; or &ldquo;the milk is finished&rdquo;.
      </p>
    </Panel>
  );
}

function NoticedPanel({ data, self, onUndo }: { data: NutritionView; self: boolean; onUndo: (id: string, target: string) => void }) {
  const icon = { deviation: WarningCircle, pattern: ChartLineUp, learned: Sparkle } as const;
  return (
    <Panel>
      <PanelTitle title="What Saheli noticed" right={<Sparkle size={17} className="text-[var(--c-ink-2)]" />} />
      <p className="mt-1 text-[12px] text-[var(--c-ink-2)]">From the logs only. Saheli doesn&apos;t give diet advice; anything she learned can be undone.</p>
      {data.noticed.length === 0 ? (
        <p className="mt-4 rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3 text-[13px] text-[var(--c-ink-2)]">Nothing stands out yet. Patterns show after a few days of logging.</p>
      ) : (
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {data.noticed.map((n) => {
            const Icon = icon[n.kind];
            return (
              <li key={n.id} className="flex items-start gap-3 rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    n.kind === "deviation" ? "bg-[var(--c-danger-soft)] text-[var(--c-danger-ink)]" : n.kind === "learned" ? "bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)]" : "bg-[var(--c-card)] text-[var(--c-ink)]",
                  )}
                >
                  <Icon size={14} weight={n.kind === "pattern" ? "regular" : "fill"} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug">{n.text}</p>
                  <p className="mt-1 text-[11px] text-[var(--c-ink-2)]">
                    {n.kind === "learned" ? `Learned ${relDay(n.at, data.today)} · Saheli uses this from now on` : n.kind === "deviation" ? `${relDay(n.at, data.today)}, ${clockOf(n.at)} · strict target` : `${relDay(n.at, data.today)} · from ${self ? "your" : "the"} logs`}
                  </p>
                </div>
                {n.undoTarget && (
                  <button
                    type="button"
                    onClick={() => onUndo(n.id, n.undoTarget as string)}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-[var(--c-line)] px-2.5 text-[11.5px] font-medium hover:bg-[var(--c-card)]"
                  >
                    <ArrowCounterClockwise size={12} weight="bold" /> Undo
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function SharePanel({ data, name, self }: { data: NutritionView; name: string; self: boolean }) {
  const { familyId, selectedId } = usePerson();
  const [days, setDays] = useState<"7" | "14" | "30">("14");
  const [busy, setBusy] = useState<"pdf" | "link" | null>(null);
  const [shares, setShares] = useState(data.shares);
  const [note, setNote] = useState("");
  const live = shares.filter((s) => !s.revokedAt);
  const make = async (kind: "pdf" | "link") => {
    if (!familyId || !selectedId) return;
    setBusy(kind);
    setNote("");
    try {
      const r = await shareWithDoctor(familyId, selectedId, { kind, days: Number(days) });
      if (kind === "pdf" && r?.url) window.open(r.url, "_blank", "noopener");
      if (kind === "link" && r?.share) setShares((s) => [r.share as (typeof s)[number], ...s]);
      setNote(kind === "pdf" ? "The PDF is ready." : "Link made. It stops working in 7 days.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't make it");
    } finally {
      setBusy(null);
    }
  };
  return (
    <Panel>
      <PanelTitle title="Share with doctor" right={<span className="text-[11.5px] text-[var(--c-ink-2)]">only when you choose</span>} />
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--c-ink-2)]">
        What {self ? "you" : name} ate, the numbers with how sure each one is, and the targets with who set them. Read-only, no phone numbers.
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="px-1 text-[12px] font-medium text-[var(--c-ink-2)]">Last</span>
        <PillTabs<"7" | "14" | "30">
          value={days}
          onChange={setDays}
          tabs={[
            { id: "7", label: "7 days" },
            { id: "14", label: "14 days" },
            { id: "30", label: "30 days" },
          ]}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void make("pdf")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--c-solid)] text-[13px] font-medium text-[var(--c-on-solid)] hover:opacity-90 disabled:opacity-50"
        >
          <FilePdf size={16} weight="bold" /> {busy === "pdf" ? "Making…" : "Make a PDF"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void make("link")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] text-[13px] font-medium hover:bg-[var(--c-card)] disabled:opacity-50"
        >
          <LinkSimple size={16} weight="bold" /> {busy === "link" ? "Making…" : "Make a link"}
        </button>
      </div>
      {note && <p className="mt-2 text-[12px] text-[var(--c-ink-2)]">{note}</p>}
      {live.length > 0 && (
        <ul className="mt-3 space-y-2">
          {live.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-[16px] bg-[var(--c-frame)] px-3.5 py-2.5">
              <LinkSimple size={16} className="shrink-0 text-[var(--c-ink-2)]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">
                  {s.forName ? `For ${s.forName}` : "Doctor link"} · {s.days} days
                </p>
                <p className="truncate text-[11px] text-[var(--c-ink-2)]">
                  Opened {s.opens} {s.opens === 1 ? "time" : "times"} · ends {fmtDayLong(s.expiresAt.slice(0, 10), { day: "numeric", month: "short" })}
                </p>
              </div>
              <button
                type="button"
                aria-label="Copy link"
                title="Copy link"
                onClick={() => void navigator.clipboard?.writeText(s.url).then(() => setNote("Link copied."))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)]"
              >
                <CopySimple size={14} />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!familyId || !selectedId) return;
                  setShares((x) => x.map((y) => (y.id === s.id ? { ...y, revokedAt: new Date().toISOString() } : y)));
                  await revokeShare(familyId, selectedId, s.id).catch(() => setShares(data.shares));
                }}
                className="h-8 shrink-0 rounded-full px-2.5 text-[12px] font-medium text-[var(--c-danger-ink)] hover:bg-[var(--c-danger-wash)]"
              >
                Stop
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── drawers ────────────────────────────────────────────────────────────── */

const UNITS = ["piece", "katori", "plate", "roti", "cup", "glass", "bowl", "tsp", "tbsp", "g", "ml", "slice", "scoop", "pack"];

function AddFoodDrawer({
  open,
  preset,
  foods,
  day,
  whose,
  onClose,
  onSave,
}: {
  open: boolean;
  preset: { meal: MealSlot; time: string } | null;
  foods: Array<{ name: string; unit: string }>;
  day: string;
  whose: string;
  onClose: () => void;
  onSave: (body: { name: string; quantity: number; unit: string; meal: MealSlot; eatenAt: string }) => Promise<void>;
}) {
  return (
    <SideDrawer open={open} onClose={onClose} top="Add" bottom="food" label="Add food">
      {open && preset && <AddFoodForm key={`${preset.meal}-${preset.time}`} preset={preset} foods={foods} day={day} whose={whose} onSave={onSave} onClose={onClose} />}
    </SideDrawer>
  );
}

function AddFoodForm({
  preset,
  foods,
  day,
  whose,
  onSave,
  onClose,
}: {
  preset: { meal: MealSlot; time: string };
  foods: Array<{ name: string; unit: string }>;
  day: string;
  whose: string;
  onSave: (body: { name: string; quantity: number; unit: string; meal: MealSlot; eatenAt: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [f, setF] = useState({ name: "", quantity: "1", unit: "piece", meal: preset.meal, time: preset.time || "13:00" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pickFood = (n: string) => {
    const known = foods.find((x) => x.name.toLowerCase() === n.toLowerCase());
    setF((s) => ({ ...s, name: n, unit: known?.unit ?? s.unit }));
  };
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.name.trim() || !(Number(f.quantity) > 0)) return setErr("Add what was eaten and how much.");
        setBusy(true);
        setErr("");
        try {
          await onSave({ name: f.name.trim(), quantity: Number(f.quantity), unit: f.unit, meal: f.meal, eatenAt: `${day}T${f.time}:00+05:30` });
        } catch (x) {
          setErr(x instanceof Error ? x.message : "Couldn't save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-[13px] text-[var(--c-ink-2)]">Goes into {whose} diary for {fmtDayLong(day, { weekday: "long", day: "numeric", month: "long" })}.</p>
      <label className="block">
        <span className={LABEL}>What was eaten</span>
        <input className={INPUT} list="kv-foods" value={f.name} onChange={(e) => pickFood(e.target.value)} placeholder="Poha, dal, boiled egg…" autoComplete="off" />
        <datalist id="kv-foods">
          {foods.map((x) => (
            <option key={x.name} value={x.name} />
          ))}
        </datalist>
      </label>
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <label className="block">
          <span className={LABEL}>How much</span>
          <input className={INPUT} type="number" min="0" step="0.5" inputMode="decimal" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        </label>
        <label className="block">
          <span className={LABEL}>Unit</span>
          <select className={INPUT} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <span className={LABEL}>Meal</span>
        <div className="flex flex-wrap gap-1.5">
          {MEAL_ORDER.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={f.meal === m}
              onClick={() => setF({ ...f, meal: m })}
              className={cn("h-9 rounded-full border px-3.5 text-[13px]", f.meal === m ? "border-transparent bg-[var(--c-solid)] text-[var(--c-on-solid)]" : "border-[var(--c-line)] bg-[var(--c-frame)]")}
            >
              {MEAL_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
      <label className="block w-[160px]">
        <span className={LABEL}>Time</span>
        <input className={INPUT} type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
      </label>
      <p className="flex items-start gap-2 rounded-[14px] bg-[var(--c-card)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">
        <ForkKnife size={15} className="mt-[2px] shrink-0" />
        Saheli looks up the numbers (pack label first, then trusted food tables) and marks it &ldquo;Said&rdquo;. Send a photo of the pack on WhatsApp for exact numbers.
      </p>
      {err && <ErrorNote>{err}</ErrorNote>}
      <div className="flex justify-end gap-2 pt-2">
        <SmallButton onClick={onClose}>Cancel</SmallButton>
        <SmallButton dark type="submit" disabled={busy} className="px-5">
          {busy ? "Saving…" : "Save"}
        </SmallButton>
      </div>
    </form>
  );
}

function EditMealDrawer({ meal, onClose, onSave }: { meal: NutritionMeal | null; onClose: () => void; onSave: (changes: Array<{ id: string; set: { quantity?: number; deleted?: boolean } }>) => Promise<void> }) {
  return (
    <SideDrawer open={Boolean(meal)} onClose={onClose} top="Change" bottom={meal ? MEAL_LABEL[meal.meal].toLowerCase() : ""} label="Change meal">
      {meal && <EditMealForm key={meal.id} meal={meal} onSave={onSave} onClose={onClose} />}
    </SideDrawer>
  );
}

function EditMealForm({ meal, onSave, onClose }: { meal: NutritionMeal; onSave: (changes: Array<{ id: string; set: { quantity?: number; deleted?: boolean } }>) => Promise<void>; onClose: () => void }) {
  const [rows, setRows] = useState(meal.items.map((it) => ({ id: it.id, name: it.name, unit: it.unit, quantity: String(it.quantity ?? ""), deleted: false, was: it.quantity })));
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-[var(--c-ink-2)]">Every change is kept, so it can be undone. Saheli works the numbers out again.</p>
      {rows.map((r, i) => (
        <div key={r.id} className={cn("flex items-center gap-3 rounded-[16px] bg-[var(--c-card)] px-3.5 py-2.5", r.deleted && "opacity-50")}>
          <input
            aria-label={`Amount of ${r.name}`}
            className={cn(INPUT, "h-10 w-[76px] px-3")}
            type="number"
            min="0"
            step="0.5"
            value={r.quantity}
            disabled={r.deleted}
            onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, quantity: e.target.value } : y)))}
          />
          <span className="min-w-0 flex-1 truncate text-[13.5px]">
            {r.unit ? `${r.unit} ` : ""}
            {r.name}
          </span>
          <button
            type="button"
            onClick={() => setRows((x) => x.map((y, j) => (j === i ? { ...y, deleted: !y.deleted } : y)))}
            className="shrink-0 text-[12px] font-medium text-[var(--c-danger-ink)] hover:underline"
          >
            {r.deleted ? "Keep" : "Remove"}
          </button>
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-3">
        <SmallButton onClick={onClose}>Cancel</SmallButton>
        <SmallButton
          dark
          disabled={busy}
          className="px-5"
          onClick={async () => {
            setBusy(true);
            const changes = rows
              .filter((r) => r.deleted || Number(r.quantity) !== r.was)
              .map((r) => ({ id: r.id, set: r.deleted ? { deleted: true } : { quantity: Number(r.quantity) } }));
            await onSave(changes).finally(() => setBusy(false));
          }}
        >
          {busy ? "Saving…" : "Save changes"}
        </SmallButton>
      </div>
    </div>
  );
}
