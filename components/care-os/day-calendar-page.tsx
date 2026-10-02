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
import { closeLoop, resolveFact, type CareEvent, type CareFact } from "@/lib/care-memory-api";
import { useCareOverview } from "@/components/dashboard/saheli/saheli-shared";
import { cn } from "@/lib/utils";
import { possessive, usePerson } from "./person-context";
import { Panel, PanelTitle, SmallButton, Tag } from "./ui";

const IST = "Asia/Kolkata";
const HOUR_PX = 64;
const START_H = 5;
const END_H = 24;

type LaneId = "medicines" | "saheli" | "health" | "orders";
const LANES: Array<{ id: LaneId; label: string; icon: PhosphorIcon }> = [
  { id: "medicines", label: "Medicines", icon: Pill },
  { id: "saheli", label: "Saheli & chat", icon: ChatCircle },
  { id: "health", label: "Health", icon: Heartbeat },
  { id: "orders", label: "Orders & alerts", icon: ShoppingBag },
];

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

type Block = { id: string; lane: LaneId; start: number; title: string; sub?: string; look: ReturnType<typeof eventLook>; planned?: boolean };

export function DayCalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { familyId, selectedId, selected } = usePerson();
  const today = dayKey(new Date());
  const raw = params.get("day");
  const day = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today ? raw : today;
  const { data, loading, reload } = useCareOverview(familyId, selectedId, day, day === today ? 30_000 : 0);
  const [nowMins, setNowMins] = useState(() => istMinutes(new Date().toISOString()));
  const [busy, setBusy] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNowMins(istMinutes(new Date().toISOString())), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const target = day === today ? Math.max(nowMins - 120, START_H * 60) : 7 * 60;
    scroller.current?.scrollTo({ top: top(target), behavior: "smooth" });
  }, [day, today, nowMins, loading]);

  const go = (d: string) => {
    const q = new URLSearchParams(params.toString());
    if (d === today) q.delete("day");
    else q.set("day", d);
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  const events: CareEvent[] = useMemo(() => (data?.events ?? []).filter((e) => !HIDDEN.has(e.kind)), [data]);
  const meds: CareFact[] = useMemo(() => (data?.facts ?? []).filter((f) => f.domain === "medicine" && f.status === "active"), [data]);

  const blocks: Block[] = useMemo(() => {
    const out: Block[] = [];
    const takenNames = events.filter((e) => e.kind.startsWith("dose_")).map((e) => e.summary.toLowerCase());
    for (const f of meds) {
      const v = f.value as { name?: string; dose?: string; times?: string[] };
      const nm = v.name || f.name.replace(/_/g, " ");
      for (const t of v.times ?? []) {
        const [h, m] = t.split(":").map(Number);
        const start = h * 60 + m;
        const first = nm.toLowerCase().split(" ")[0];
        const done = takenNames.some((s) => s.includes(first));
        const past = day < today || (day === today && start < nowMins);
        out.push({
          id: `plan:${f.key}@${t}`,
          lane: "medicines",
          start,
          title: nm,
          sub: [v.dose, t].filter(Boolean).join(" · "),
          planned: !done,
          look: done ? { label: "Taken", icon: CheckCircle, tone: "dark" } : past ? { label: "Not marked", icon: WarningCircle, tone: "soft" } : { label: "Scheduled", icon: Pill, tone: "plain" },
        });
      }
    }
    for (const e of events) {
      if (e.kind === "dose_taken") continue; // shown on the scheduled block
      out.push({ id: `ev:${e.id}`, lane: lane(e.kind), start: istMinutes(e.at), title: eventLook(e.kind).label, sub: e.summary, look: eventLook(e.kind) });
    }
    return out.sort((a, b) => a.start - b.start);
  }, [events, meds, day, today, nowMins]);

  // Stack blocks that would overlap in the same lane.
  const placed = useMemo(() => {
    const lastEnd: Record<string, number> = {};
    return blocks.map((b) => {
      const y = Math.max(top(Math.max(b.start, START_H * 60)), lastEnd[b.lane] ?? -Infinity);
      lastEnd[b.lane] = y + 58;
      return { ...b, y };
    });
  }, [blocks]);

  const week = Array.from({ length: 7 }, (_, i) => shift(day, i - 3));
  const counts = {
    taken: blocks.filter((b) => b.lane === "medicines" && b.look.label === "Taken").length,
    planned: blocks.filter((b) => b.id.startsWith("plan:")).length,
    alerts: events.filter((e) => e.kind.startsWith("alert_")).length,
    readings: events.filter((e) => e.kind === "vital").length,
  };
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
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous day" onClick={() => go(shift(day, -1))} className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)]">
            <CaretLeft size={16} />
          </button>
          <div className="flex gap-1 rounded-full bg-[var(--c-card)] p-1">
            {week.map((d) => {
              const dt = new Date(`${d}T12:00:00+05:30`);
              const on = d === day;
              const future = d > today;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={future}
                  onClick={() => go(d)}
                  className={cn(
                    "flex h-11 w-11 flex-col items-center justify-center rounded-full text-[11px] leading-tight transition-colors disabled:opacity-30 sm:w-12",
                    on ? "bg-[var(--c-ink)] text-white" : "hover:bg-[var(--c-frame)]",
                  )}
                >
                  <span className={cn(on ? "text-white/70" : "text-[var(--c-ink-3)]")}>{dt.toLocaleDateString("en-IN", { weekday: "narrow", timeZone: IST })}</span>
                  <span className="text-[13px] font-medium">{dt.toLocaleDateString("en-IN", { day: "numeric", timeZone: IST })}</span>
                  {d === today && !on && <span className="mt-0.5 h-1 w-1 rounded-full bg-[var(--c-accent)]" />}
                </button>
              );
            })}
          </div>
          <button type="button" aria-label="Next day" disabled={day >= today} onClick={() => go(shift(day, 1))} className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)] disabled:opacity-30">
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel className="min-w-0 p-0">
          <div className="grid grid-cols-[64px_repeat(4,minmax(150px,1fr))] border-b border-[var(--c-line)] px-2 py-3">
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
            <div className="relative grid min-w-[680px] grid-cols-[64px_repeat(4,minmax(150px,1fr))]" style={{ height: (END_H - START_H) * HOUR_PX }}>
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
                    .filter((b) => b.lane === l.id)
                    .map((b) => (
                      <div
                        key={b.id}
                        className={cn(
                          "absolute inset-x-1.5 overflow-hidden rounded-[14px] px-3 py-2",
                          b.look.tone === "dark" && "bg-[var(--c-ink)] text-white",
                          b.look.tone === "accent" && "bg-[var(--c-accent)] text-white",
                          b.look.tone === "soft" && "bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)]",
                          b.look.tone === "plain" && (b.planned ? "c-hatch border border-[var(--c-line)] bg-[var(--c-frame)]" : "bg-[var(--c-frame)] shadow-[0_1px_0_rgba(0,0,0,0.04)]"),
                        )}
                        style={{ top: b.y + 2, minHeight: 54 }}
                        title={b.sub}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12.5px] font-medium">{b.title}</p>
                          <b.look.icon size={14} weight="fill" className="shrink-0 opacity-80" />
                        </div>
                        <p className={cn("mt-0.5 truncate text-[11px]", b.look.tone === "plain" ? "text-[var(--c-ink-2)]" : "opacity-75")}>
                          {b.id.startsWith("plan:") ? `${b.look.label} · ${b.sub}` : `${hm(b.start)} · ${b.sub}`}
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
          {!loading && blocks.length === 0 && (
            <p className="border-t border-[var(--c-line)] px-5 py-4 text-[13px] text-[var(--c-ink-2)]">
              Nothing on this day yet. Add medicines on the{" "}
              <Link className="underline" href="/dashboard/saheli/care">
                Medicines page
              </Link>{" "}
              and they appear here as scheduled blocks.
            </p>
          )}
        </Panel>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Panel accent>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Doses</p>
              <p className="c-num mt-3 text-[40px] leading-none text-white">
                {counts.taken}
                <span className="text-white/60">/{counts.planned}</span>
              </p>
            </Panel>
            <Panel>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-2)]">Readings</p>
              <p className="c-num mt-3 text-[40px] leading-none">{counts.readings}</p>
            </Panel>
          </div>
          {confirmations.length > 0 && (
            <Panel>
              <PanelTitle title="Needs your OK" />
              <ul className="mt-3 space-y-2">
                {confirmations.map((l) => (
                  <li key={l.id} className="rounded-[16px] bg-[var(--c-frame)] p-3">
                    <p className="text-[13px] font-medium">{l.title}</p>
                    <div className="mt-2 flex gap-2">
                      <SmallButton
                        dark
                        disabled={busy === l.id}
                        onClick={async () => {
                          setBusy(l.id);
                          await resolveFact(familyId!, selectedId!, String(l.detail?.key ?? ""), true).catch(() => undefined);
                          setBusy(null);
                          reload();
                        }}
                      >
                        Approve
                      </SmallButton>
                      <SmallButton
                        disabled={busy === l.id}
                        onClick={async () => {
                          setBusy(l.id);
                          await resolveFact(familyId!, selectedId!, String(l.detail?.key ?? ""), false).catch(() => undefined);
                          setBusy(null);
                          reload();
                        }}
                      >
                        Reject
                      </SmallButton>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel>
            <PanelTitle title="Saheli is following up" />
            {following.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--c-ink-3)]">Nothing open.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {following.map((l) => (
                  <li key={l.id} className="rounded-[16px] bg-[var(--c-frame)] p-3">
                    <p className="text-[13px]">{l.title}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Tag tone="light">{l.wakeAt ? `checks ${new Date(l.wakeAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST })}` : "open"}</Tag>
                      <button
                        type="button"
                        className="text-[12px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]"
                        onClick={async () => {
                          await closeLoop(familyId!, selectedId!, l.id, "resolved by caregiver").catch(() => undefined);
                          reload();
                        }}
                      >
                        Mark resolved
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel>
            <PanelTitle title="Legend" />
            <ul className="mt-3 space-y-2 text-[12px] text-[var(--c-ink-2)]">
              <li className="flex items-center gap-2">
                <span className="h-4 w-6 rounded-[6px] bg-[var(--c-ink)]" /> Dose taken
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
