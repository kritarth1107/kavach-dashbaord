"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alarm,
  CaretLeft,
  CaretRight,
  ChatCircle,
  CheckCircle,
  Heartbeat,
  Pill,
  ShoppingBag,
  Siren,
  Smiley,
  ForkKnife,
  WarningCircle,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { closeLoop, resolveFact, type CareEvent } from "@/lib/care-memory-api";
import { useCareOverview } from "@/components/dashboard/saheli/saheli-shared";
import { cn } from "@/lib/utils";
import { callName, possessive, usePerson } from "./person-context";
import { AllReminders, deliveryText, ReminderDetail, statusWord, undelivered, useAllReminders, useReminderDay } from "./reminders-panel";
import type { ReminderOccurrence } from "@/lib/reminders-api";
import { ConversationsToday } from "./conversations-today";
import { Panel, PanelTitle, PillTabs, SmallButton, Tag } from "./ui";

const IST = "Asia/Kolkata";
const HOUR_PX = 88;
const CARD_PX = 44; // a card is drawn this tall; cards closer than this in time sit side by side
const CHIP_PX = 24; // the small card of one time of a reminder that goes out many times a day
const MAX_COLS = 2;
const GROUP_MIN = 30; // same kind in the same lane within this many minutes becomes one card
const START_H = 0; // the whole day: reminders and doses after midnight show too
const END_H = 24;
const AHEAD_DAYS = 365; // future days open, so a reminder set for a date shows on that day

type LaneId = "medicines" | "reminders" | "saheli" | "health" | "orders";
const LANES: Array<{ id: LaneId; label: string; icon: PhosphorIcon }> = [
  { id: "medicines", label: "Medicines", icon: Pill },
  { id: "reminders", label: "Reminders", icon: Alarm },
  { id: "saheli", label: "Habits & chat", icon: ChatCircle },
  { id: "health", label: "Health", icon: Heartbeat },
  { id: "orders", label: "Orders & alerts", icon: ShoppingBag },
];
// the Reminders column is wider: a reminder is read by its words
const GRID_COLS = "grid-cols-[64px_minmax(130px,1fr)_minmax(190px,1.5fr)_repeat(3,minmax(120px,1fr))]";

/** A reminder Saheli set (not a medicine): the calendar shows its times from the reminder list, not these ledger rows. */
const isCustomReminderEvent = (e: CareEvent) => e.kind.startsWith("reminder") && String(e.payload?.scheduleId ?? "").startsWith("reminder:");

const HIDDEN = new Set(["import_done", "memory_extract", "note_rewritten", "probe", "dashboard_edit"]);

function lane(kind: string): LaneId {
  if (kind.startsWith("dose_") || kind.startsWith("reminder")) return "medicines";
  if (["vital", "symptom", "meal", "water", "sleep", "mood"].includes(kind)) return "health";
  if (kind.startsWith("task_") || kind.startsWith("alert_")) return "orders";
  return "saheli";
}

function eventLook(kind: string): { label: string; icon: PhosphorIcon; tone: "dark" | "accent" | "soft" | "plain" } {
  if (kind === "dose_taken") return { label: "Taken", icon: CheckCircle, tone: "dark" };
  if (kind.startsWith("dose_")) return { label: kind.slice(5).replace("_", " "), icon: WarningCircle, tone: "soft" };
  if (kind === "reminder_sent") return { label: "Reminder sent", icon: Alarm, tone: "plain" };
  if (kind === "reminder_failed") return { label: "Reminder failed", icon: Alarm, tone: "soft" };
  if (kind === "vital") return { label: "Reading", icon: Heartbeat, tone: "plain" };
  if (kind === "symptom") return { label: "Symptom", icon: Heartbeat, tone: "soft" };
  if (kind === "mood") return { label: "Mood", icon: Smiley, tone: "plain" };
  if (kind === "meal" || kind === "water") return { label: kind === "meal" ? "Meal" : "Water", icon: ForkKnife, tone: "plain" };
  if (kind === "alert_whatsapp") return { label: "You were alerted", icon: Siren, tone: "accent" };
  if (kind === "alert_dashboard") return { label: "Noted for you", icon: WarningCircle, tone: "plain" };
  if (kind.startsWith("task_")) return { label: `Order ${kind.slice(5)}`, icon: ShoppingBag, tone: "plain" };
  if (kind.startsWith("fact_")) return { label: "Care record", icon: CheckCircle, tone: "plain" };
  if (kind === "social") return { label: "Chat", icon: ChatCircle, tone: "plain" };
  // habits are good things, not reminders (founder 2026-10-13): what they did shows as done
  if (kind === "activity_done") return { label: "Done", icon: CheckCircle, tone: "dark" };
  if (kind === "activity_skipped") return { label: "Skipped", icon: WarningCircle, tone: "soft" };
  const t = kind.replace(/_/g, " ");
  return { label: t.charAt(0).toUpperCase() + t.slice(1), icon: ChatCircle, tone: "plain" };
}

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST });
const istMinutes = (iso: string) => {
  const t = new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const hm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const shift = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + n);
  return dayKey(d);
};
const top = (mins: number) => ((mins - START_H * 60) / 60) * HOUR_PX;

type Block = {
  id: string;
  lane: LaneId;
  start: number;
  title: string;
  sub?: string;
  look: ReturnType<typeof eventLook>;
  planned?: boolean;
  reminders?: string[];
  items?: Array<{ start: number; sub?: string }>;
  /** a Saheli reminder's time: opens the reminder */
  reminderId?: string;
  compact?: boolean;
  skipped?: boolean;
};

function reminderLook(o: Pick<ReminderOccurrence, "status" | "delivery">): ReturnType<typeof eventLook> {
  // sent but never delivered: a concern, not a check (audit 2026-10-14)
  if (undelivered(o)) return { label: "Sent, not delivered", icon: WarningCircle, tone: "soft" };
  if (o.status === "sent" || o.status === "done") return { label: statusWord(o.status), icon: CheckCircle, tone: "plain" };
  if (o.status === "failed" || o.status === "not_sent") return { label: statusWord(o.status), icon: WarningCircle, tone: "soft" };
  return { label: statusWord(o.status), icon: Alarm, tone: "plain" };
}
/** x / w: where the card sits across its lane (fractions); a many-times reminder's small card next to a full card gets a narrow strip. */
type Placed = Block & { y: number; col: number; cols: number; x: number; w: number; more?: Block[] };

const CHIP_SHARE = 0.24; // the width a small card takes when it shares its row with a full card

/** "… at 1:00 PM" / "… at 13:00" in a reminder summary → minutes since midnight. */
function reminderMinutes(text: string): number | null {
  const m = text.match(/at (\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + Number(m[2]);
}

/** Lay out one lane: each card at its own time; cards that would overlap share the row in columns. */
function layoutLane(items: Block[]): Placed[] {
  const out: Placed[] = [];
  let cluster: Array<Block & { y: number; col: number }> = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    if (!cluster.length) return;
    const cols = Math.min(MAX_COLS, Math.max(...cluster.map((c) => c.col)) + 1);
    const kept = cluster.filter((c) => c.col < MAX_COLS);
    // a small card and a full card side by side: the small one a narrow strip, the full one the rest (it has words to show)
    const chipCol = cols === 2 && kept.some((c) => c.compact) && kept.some((c) => !c.compact)
      ? (kept.filter((c) => c.compact).every((c) => c.col === 0) ? 0 : kept.filter((c) => c.compact).every((c) => c.col === 1) ? 1 : null)
      : null;
    const place = (c: (typeof kept)[number]): { x: number; w: number } => {
      if (chipCol === null) return { x: c.col / cols, w: 1 / cols };
      const narrow = c.col === chipCol;
      if (chipCol === 0) return narrow ? { x: 0, w: CHIP_SHARE } : { x: CHIP_SHARE, w: 1 - CHIP_SHARE };
      return narrow ? { x: 1 - CHIP_SHARE, w: CHIP_SHARE } : { x: 0, w: 1 - CHIP_SHARE };
    };
    const shown: Placed[] = kept.map((c) => ({ ...c, cols, ...place(c) }));
    // Anything past the last column is folded into the nearest card there as "+N".
    for (const h of cluster.filter((c) => c.col >= MAX_COLS)) {
      const lastCol = shown.filter((c) => c.col === cols - 1);
      const host = lastCol.reduce((best, c) => (Math.abs(c.y - h.y) < Math.abs(best.y - h.y) ? c : best), lastCol[0]);
      host.more = [...(host.more ?? []), h];
    }
    out.push(...shown);
    cluster = [];
    clusterEnd = -Infinity;
  };
  const height = (b: Block) => (b.compact ? CHIP_PX : CARD_PX);
  for (const b of [...items].sort((a, c) => a.start - c.start)) {
    const y = top(Math.max(b.start, START_H * 60));
    if (y >= clusterEnd) flush();
    const taken = new Set(cluster.filter((c) => c.y + height(c) > y).map((c) => c.col));
    let col = 0;
    while (taken.has(col)) col++;
    cluster.push({ ...b, y, col });
    clusterEnd = Math.max(clusterEnd, y + height(b));
  }
  flush();
  return out;
}

export function DayCalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { familyId, selectedId, selected } = usePerson();
  const today = dayKey(new Date());
  const lastDay = shift(today, AHEAD_DAYS);
  const raw = params.get("day");
  const day = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= lastDay ? raw : today;
  const { data, loading, error, reload } = useCareOverview(familyId, selectedId, day, day === today ? 30_000 : 0);
  const rem = useReminderDay(familyId, selectedId, day, day === today ? 30_000 : 0);
  const [view, setView] = useState<"day" | "all">("day");
  // the reminder open on the side, kept with its person: switching person closes it, so Skip / Stop never send one
  // person's reminder under another's id (audit 2026-10-14)
  const who = `${familyId}|${selectedId}`;
  const [pickedFor, setPickedFor] = useState<{ who: string; id: string } | null>(null);
  const picked = pickedFor?.who === who ? pickedFor.id : null;
  const setPicked = (id: string | null) => setPickedFor(id ? { who, id } : null);
  const [remTick, setRemTick] = useState(0);
  const all = useAllReminders(familyId, selectedId, remTick);
  const allReminders = all.rows;
  const remindersChanged = () => {
    rem.reload();
    setRemTick((n) => n + 1);
  };
  const [nowMins, setNowMins] = useState(() => istMinutes(new Date().toISOString()));
  const [busy, setBusy] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  /** Approve / Reject / Mark resolved: a failure says so under the item instead of vanishing. */
  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setActionErr(null);
    try {
      await fn();
    } catch {
      setActionErr(id);
    } finally {
      setBusy(null);
      reload();
    }
  };
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNowMins(istMinutes(new Date().toISOString())), 60_000);
    return () => clearInterval(t);
  }, []);
  // Scroll to the right hour once per day shown, not on every clock tick.
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (loading || scrolledFor.current === day) return;
    scrolledFor.current = day;
    const target = day === today ? Math.max(nowMins - 120, START_H * 60) : 7 * 60;
    scroller.current?.scrollTo({ top: top(target), behavior: "smooth" });
  }, [day, today, nowMins, loading]);

  const go = (d: string) => {
    const q = new URLSearchParams(params.toString());
    if (d === today) q.delete("day");
    else q.set("day", d);
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  const events: CareEvent[] = useMemo(() => (data?.events ?? []).filter((e) => !HIDDEN.has(e.kind) && !isCustomReminderEvent(e)), [data]);

  const blocks: Block[] = useMemo(() => {
    const out: Block[] = [];
    // The day's due doses and their status come from the engine (the same list as the Home card): a weekly medicine
    // shows only on its day, and "taken" comes from the dose records, not from matching names here.
    for (const d of data?.doses ?? []) {
      const [h, m] = d.time.split(":").map(Number);
      const start = h * 60 + m;
      const done = d.status === "taken";
      const missed = d.status === "missed" || d.status === "skipped";
      const past = day < today || (day === today && start < nowMins);
      // a dose they chose to skip reads "Skipped", as on Home
      const missedWord = d.status === "skipped" ? "Skipped" : "Missed";
      out.push({
        id: `plan:${d.id}`,
        lane: "medicines",
        start,
        title: d.name,
        sub: [d.dose, d.time].filter(Boolean).join(" · "),
        planned: !done,
        look: done
          ? { label: "Taken", icon: CheckCircle, tone: "dark" }
          : missed
            ? { label: missedWord, icon: WarningCircle, tone: "soft" }
            : past
              ? { label: "Not marked", icon: WarningCircle, tone: "soft" }
              : { label: "Scheduled", icon: Pill, tone: "plain" },
      });
    }
    const plans = out.filter((b) => b.id.startsWith("plan:"));
    for (const e of events) {
      if (e.kind === "dose_taken") continue; // shown on the scheduled block
      if (e.kind === "reminder_sent" || e.kind === "reminder_failed") {
        // A reminder belongs on its dose: same medicine, same dose time.
        const at = reminderMinutes(e.summary);
        const text = e.summary.toLowerCase();
        const host =
          plans.find((p) => at !== null && p.start === at && text.includes(p.title.toLowerCase().split(" ")[0])) ??
          plans.find((p) => at !== null && p.start === at);
        if (host) {
          const kind = (e.summary.split(":")[0] || "reminder").trim();
          host.reminders = [...(host.reminders ?? []), `${hm(istMinutes(e.at))} ${kind}${e.kind === "reminder_failed" ? " (failed)" : ""}`];
          continue;
        }
      }
      out.push({ id: `ev:${e.id}`, lane: lane(e.kind), start: istMinutes(e.at), title: eventLook(e.kind).label, sub: e.summary, look: eventLook(e.kind) });
    }
    // Each time of each Saheli reminder, in its own words, with what happened (sent, skipped, scheduled …).
    for (const o of rem.data?.occurrences ?? []) {
      const [h, m] = o.time.split(":").map(Number);
      out.push({
        id: `rem:${o.reminderId}@${o.time}`,
        lane: "reminders",
        start: h * 60 + m,
        title: o.text,
        sub: `${statusWord(o.status)}${deliveryText(o)} · ${o.schedule}`,
        look: reminderLook(o),
        planned: o.status === "scheduled",
        reminderId: o.reminderId,
        compact: o.many,
        skipped: o.status === "skipped" || o.status === "done",
      });
    }
    // A burst of the same kind (several chat messages, repeated reminders) becomes one card.
    const grouped: Block[] = [];
    for (const b of out.sort((x, y) => x.start - y.start)) {
      const prev = [...grouped].reverse().find((g) => g.lane === b.lane);
      const kindOf = (x: Block) => (x.id.startsWith("plan:") ? "plan" : x.title);
      if (prev && !b.id.startsWith("plan:") && !b.reminderId && !prev.reminderId && kindOf(prev) === kindOf(b) && b.start - prev.start <= GROUP_MIN) {
        prev.items = [...(prev.items ?? [{ start: prev.start, sub: prev.sub }]), { start: b.start, sub: b.sub }];
        prev.sub = `${prev.items.length} ${prev.title === "Chat" ? "messages" : "times"} · latest: ${b.sub ?? ""}`;
        continue;
      }
      grouped.push({ ...b });
    }
    return grouped;
  }, [events, data, rem.data, day, today, nowMins]);

  const placed = useMemo(() => LANES.flatMap((l) => layoutLane(blocks.filter((b) => b.lane === l.id))), [blocks]);

  const week = Array.from({ length: 7 }, (_, i) => shift(day, i - 3));
  const counts = {
    taken: blocks.filter((b) => b.lane === "medicines" && b.look.label === "Taken").length,
    planned: blocks.filter((b) => b.id.startsWith("plan:")).length,
    alerts: events.filter((e) => e.kind.startsWith("alert_")).length,
    readings: events.filter((e) => e.kind === "vital").length,
    remindersSent: (rem.data?.occurrences ?? []).filter((o) => o.status === "sent" && !undelivered(o)).length,
    remindersDue: (rem.data?.occurrences ?? []).filter((o) => o.status !== "skipped" && o.status !== "done").length,
  };
  const pickedReminder = picked
    ? (rem.data?.reminders ?? []).find((r) => r.reminderId === picked) ?? (allReminders ?? []).find((r) => r.reminderId === picked) ?? null
    : null;
  const personWord = selected?.self ? "You" : callName(selected);
  const confirmations = (data?.loops ?? []).filter((l) => l.kind === "confirm_fact");
  const following = (data?.loops ?? []).filter((l) => l.kind !== "confirm_fact");
  const label = new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: IST });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block font-light text-[var(--c-ink-3)]">{possessive(selected)}</span>
            <span className="block font-medium">Day</span>
          </h1>
          <p className="mt-2 text-[13px] text-[var(--c-ink-2)]">{label}</p>
        </div>
        {/* on a phone the week wraps under the arrows instead of running off the screen */}
        <div className="flex flex-wrap items-center gap-2 max-sm:justify-between">
          <button type="button" aria-label="Previous day" onClick={() => go(shift(day, -1))} className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)]">
            <CaretLeft size={16} />
          </button>
          <div className="flex gap-1 rounded-full bg-[var(--c-card)] p-1 max-sm:order-last max-sm:w-full max-sm:justify-between">
            {week.map((d) => {
              const dt = new Date(`${d}T12:00:00+05:30`);
              const on = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={d > lastDay}
                  onClick={() => go(d)}
                  className={cn(
                    "flex h-11 w-11 flex-col items-center justify-center rounded-full text-[11px] leading-tight transition-colors disabled:opacity-30 sm:w-12",
                    on ? "bg-[var(--c-solid)] text-white" : "hover:bg-[var(--c-frame)]",
                  )}
                >
                  <span className={cn(on ? "text-white/70" : "text-[var(--c-ink-3)]")}>{dt.toLocaleDateString("en-IN", { weekday: "narrow", timeZone: IST })}</span>
                  <span className="text-[13px] font-medium">{dt.toLocaleDateString("en-IN", { day: "numeric", timeZone: IST })}</span>
                  {d === today && !on && <span className="mt-0.5 h-1 w-1 rounded-full bg-[var(--c-accent)]" />}
                </button>
              );
            })}
          </div>
          <button type="button" aria-label="Next day" disabled={day >= lastDay} onClick={() => go(shift(day, 1))} className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)] disabled:opacity-30">
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      {familyId && selectedId && <ConversationsToday familyId={familyId} subjectId={selectedId} day={day} name={personWord} />}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel className="min-w-0 p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--c-line)] px-4 py-3">
            <PillTabs
              tabs={[
                { id: "day", label: "Day" },
                { id: "all", label: "All reminders" },
              ]}
              value={view}
              onChange={setView}
            />
            {view === "all" && <span className="text-[12px] text-[var(--c-ink-2)]">Everything Saheli will remind {personWord === "You" ? "you" : personWord} about</span>}
          </div>
          {view === "all" ? (
            <AllReminders
              key={who}
              rows={allReminders}
              error={all.error}
              onRetry={() => setRemTick((n) => n + 1)}
              today={today}
              familyId={familyId ?? ""}
              subjectId={selectedId ?? ""}
              onDone={remindersChanged}
              onPick={(r) => setPicked(r.reminderId)}
            />
          ) : (
          <>
          <div className={cn("grid border-b border-[var(--c-line)] px-2 py-3", GRID_COLS)}>
            <span />
            {LANES.map((l) => (
              <span key={l.id} className="flex items-center gap-2 px-2 text-[13px] font-medium">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--c-frame)]">
                  <l.icon size={15} />
                </span>
                {l.label}
              </span>
            ))}
          </div>
          <div ref={scroller} className="c-scroll relative h-[640px] overflow-auto">
            <div className={cn("relative grid min-w-[780px]", GRID_COLS)} style={{ height: (END_H - START_H) * HOUR_PX }}>
              <div className="relative">
                {Array.from({ length: END_H - START_H }, (_, i) => (
                  <span key={i} className="absolute right-3 -translate-y-1/2 text-[11px] tabular-nums text-[var(--c-ink-3)]" style={{ top: i * HOUR_PX }}>
                    {i === 0 ? "" : hm((START_H + i) * 60)}
                  </span>
                ))}
              </div>
              {LANES.map((l) => (
                <div key={l.id} className="relative border-l border-[var(--c-line)]">
                  {Array.from({ length: END_H - START_H }, (_, i) => (
                    <span key={i} className="absolute inset-x-0 border-t border-[var(--c-line)]/70" style={{ top: i * HOUR_PX }} />
                  ))}
                  {placed
                    .filter((b) => b.lane === l.id && b.compact)
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => b.reminderId && setPicked(b.reminderId)}
                        className={cn(
                          "absolute flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[8px] border border-dashed px-2 text-left text-[10.5px]",
                          b.look.tone === "soft" ? "border-transparent bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)]" : "border-[var(--c-line)] bg-[var(--c-frame)]/80 text-[var(--c-ink-2)]",
                          b.skipped && "line-through opacity-60",
                          !!picked && b.reminderId === picked && "ring-2 ring-[var(--c-accent)]",
                        )}
                        style={{ top: b.y + 2, height: CHIP_PX - 4, left: `calc(${b.x * 100}% + 4px)`, width: `calc(${b.w * 100}% - 8px)` }}
                        title={`${hm(b.start)} ${b.title}\n${b.sub ?? ""}`}
                      >
                        <span className="font-medium tabular-nums text-[var(--c-ink)]">{hm(b.start)}</span>
                        {b.w > 0.5 && <span className="truncate">{b.title}</span>}
                        {b.look.label === "Sent" ? <CheckCircle size={11} weight="fill" className="shrink-0 text-[var(--c-ok-ink)]" /> : b.planned ? <span className="shrink-0 text-[var(--c-accent-text)]">·</span> : null}
                      </button>
                    ))}
                  {placed
                    .filter((b) => b.lane === l.id && !b.compact)
                    .map((b) => (
                      <div
                        key={b.id}
                        role={b.reminderId ? "button" : undefined}
                        tabIndex={b.reminderId ? 0 : undefined}
                        onClick={b.reminderId ? () => setPicked(b.reminderId!) : undefined}
                        onKeyDown={b.reminderId ? (e) => (e.key === "Enter" || e.key === " ") && setPicked(b.reminderId!) : undefined}
                        className={cn(
                          "absolute overflow-hidden rounded-[12px] px-2.5 py-1.5",
                          b.reminderId && "cursor-pointer",
                          b.skipped && "opacity-60 [&_p:first-child]:line-through",
                          !!picked && b.reminderId === picked && "ring-2 ring-[var(--c-accent)]",
                          b.look.tone === "dark" && "bg-[var(--c-solid)] text-white",
                          b.look.tone === "accent" && "bg-[var(--c-accent)] text-[var(--c-accent-ink)]",
                          b.look.tone === "soft" && "bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)]",
                          b.look.tone === "plain" && (b.planned ? "c-hatch border border-[var(--c-line)] bg-[var(--c-frame)]" : "bg-[var(--c-frame)] shadow-[0_1px_0_rgba(0,0,0,0.04)]"),
                        )}
                        style={{
                          top: b.y + 1,
                          height: CARD_PX - 3,
                          left: `calc(${b.x * 100}% + 4px)`,
                          width: `calc(${b.w * 100}% - 8px)`,
                        }}
                        title={[
                          `${hm(b.start)} ${b.title}`,
                          b.sub,
                          b.reminders?.length ? `Reminders: ${b.reminders.join(", ")}` : "",
                          ...(b.items ?? []).map((it) => `${hm(it.start)} ${it.sub ?? ""}`),
                          ...(b.more ?? []).map((m) => `${hm(m.start)} ${m.title}: ${m.sub ?? ""}`),
                        ]
                          .filter(Boolean)
                          .join("\n")}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="truncate text-[12px] font-medium">
                            <span className="tabular-nums opacity-70">{hm(b.start)}</span> {b.title}
                          </p>
                          <span className="flex shrink-0 items-center gap-1">
                            {b.more?.length ? (
                              <span className="rounded-full bg-[var(--c-solid)] px-1.5 text-[10px] font-medium leading-4 text-white">+{b.more.length}</span>
                            ) : null}
                            <b.look.icon size={13} weight="fill" className="opacity-80" />
                          </span>
                        </div>
                        <p className={cn("truncate text-[10.5px]", b.look.tone === "plain" ? "text-[var(--c-ink-2)]" : "opacity-75")}>
                          {b.id.startsWith("plan:")
                            ? [b.look.label, b.sub?.split(" · ")[0], b.reminders?.length ? `${b.reminders.length} reminder${b.reminders.length > 1 ? "s" : ""} sent` : ""]
                                .filter(Boolean)
                                .join(" · ")
                            : b.sub}
                        </p>
                      </div>
                    ))}
                </div>
              ))}
              {day === today && nowMins >= START_H * 60 && (
                <div className="pointer-events-none absolute left-[56px] right-0 z-10 flex items-center" style={{ top: top(nowMins) }}>
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--c-accent)]" />
                  <span className="h-px flex-1 bg-[var(--c-accent)]" />
                </div>
              )}
            </div>
          </div>
          {/* a failed load says so, never "nothing on this day" (audit 2026-10-14) */}
          {error && !data && (
            <p className="border-t border-[var(--c-line)] px-5 py-4 text-[13px] text-[var(--c-ink-2)]">
              Couldn&apos;t load the medicines and events for this day.{" "}
              <button type="button" className="font-medium underline" onClick={reload}>
                Try again
              </button>
            </p>
          )}
          {rem.error && (
            <p className="border-t border-[var(--c-line)] px-5 py-4 text-[13px] text-[var(--c-ink-2)]">
              Couldn&apos;t load the reminders for this day.{" "}
              <button type="button" className="font-medium underline" onClick={rem.reload}>
                Try again
              </button>
            </p>
          )}
          {!loading && !!data && !!rem.data && blocks.length === 0 && (
            <p className="border-t border-[var(--c-line)] px-5 py-4 text-[13px] text-[var(--c-ink-2)]">
              Nothing on this day yet. Add medicines on the{" "}
              <Link className="underline" href="/dashboard/saheli/care">
                Medicines page
              </Link>{" "}
              and they appear here as scheduled blocks; reminders Saheli sets show in the Reminders column.
            </p>
          )}
          </>
          )}
        </Panel>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* marigold: Panel accent sets the dark accent ink; no white on it */}
            <Panel accent>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] opacity-80">Doses</p>
              <p className="c-num mt-3 text-[40px] leading-none">
                {data ? counts.taken : "–"}
                {data && <span className="opacity-60">/{counts.planned}</span>}
              </p>
            </Panel>
            <Panel>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-2)]">Reminders</p>
              {rem.error ? (
                <p className="mt-3 text-[12.5px] text-[var(--c-ink-2)]">
                  Couldn&apos;t load.{" "}
                  <button type="button" className="font-medium underline" onClick={rem.reload}>
                    Try again
                  </button>
                </p>
              ) : (
                <p className="c-num mt-3 text-[40px] leading-none">
                  {rem.data ? counts.remindersSent : "–"}
                  {rem.data && <span className="text-[var(--c-ink-3)]">/{counts.remindersDue}</span>}
                </p>
              )}
            </Panel>
          </div>
          {pickedReminder && familyId && selectedId && (
            <ReminderDetail
              key={`${who}|${pickedReminder.reminderId}`}
              reminder={pickedReminder}
              occurrences={rem.data?.occurrences ?? []}
              day={day}
              today={today}
              personWord={personWord}
              familyId={familyId}
              subjectId={selectedId}
              onDone={remindersChanged}
              onClose={() => setPicked(null)}
            />
          )}
          {confirmations.length > 0 && (
            <Panel>
              <PanelTitle title="Needs your OK" />
              <ul className="mt-3 space-y-2">
                {confirmations.map((l) => (
                  <li key={l.id} className="rounded-[16px] bg-[var(--c-frame)] p-3">
                    <p className="text-[13px] font-medium">{l.title}</p>
                    <div className="mt-2 flex gap-2">
                      <SmallButton dark disabled={busy === l.id} onClick={() => act(l.id, () => resolveFact(familyId!, selectedId!, String(l.detail?.key ?? ""), true))}>
                        Approve
                      </SmallButton>
                      <SmallButton disabled={busy === l.id} onClick={() => act(l.id, () => resolveFact(familyId!, selectedId!, String(l.detail?.key ?? ""), false))}>
                        Reject
                      </SmallButton>
                    </div>
                    {actionErr === l.id && <p className="mt-2 text-[12px] text-[var(--c-danger-ink)]">That didn&apos;t go through. Try again.</p>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel>
            <PanelTitle title="Saheli is following up" />
            {following.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--c-ink-3)]">{data ? "Nothing open." : error ? "Couldn't load." : "Loading…"}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {following.map((l) => (
                  <li key={l.id} className="rounded-[16px] bg-[var(--c-frame)] p-3">
                    <p className="text-[13px]">{l.title}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Tag tone="light">{l.wakeAt ? `checks ${new Date(l.wakeAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST })}` : "open"}</Tag>
                      <button
                        type="button"
                        disabled={busy === l.id}
                        className="text-[12px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)] disabled:opacity-40"
                        onClick={() => act(l.id, () => closeLoop(familyId!, selectedId!, l.id, "resolved by caregiver"))}
                      >
                        Mark resolved
                      </button>
                    </div>
                    {actionErr === l.id && <p className="mt-2 text-[12px] text-[var(--c-danger-ink)]">That didn&apos;t go through. Try again.</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel>
            <PanelTitle title="Legend" />
            <ul className="mt-3 space-y-2 text-[12px] text-[var(--c-ink-2)]">
              <li className="flex items-center gap-2">
                <span className="h-4 w-6 rounded-[6px] bg-[var(--c-solid)]" /> Dose taken
              </li>
              <li className="flex items-center gap-2">
                <span className="c-hatch h-4 w-6 rounded-[6px] border border-[var(--c-line)] bg-[var(--c-frame)]" /> Scheduled
              </li>
              <li className="flex items-center gap-2">
                <span className="h-4 w-6 rounded-[6px] bg-[var(--c-accent-soft)]" /> Missed, not marked or a concern
              </li>
              <li className="flex items-center gap-2">
                <span className="h-4 w-6 rounded-[6px] bg-[var(--c-accent)]" /> You were alerted
              </li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
