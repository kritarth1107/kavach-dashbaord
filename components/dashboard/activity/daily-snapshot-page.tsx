"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, HeartPulse, Loader2, RefreshCw, ShoppingBag, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getActivity, type ActivityItem } from "@/lib/activity-api";
import { getCareOverview } from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import {
  AccessGate,
  ActivityHeader,
  CenteredState,
  RichText,
  dayKeyLabel,
  dayKeyParts,
  formatIstTime,
  istDayKey,
  isValidDayKey,
  shiftDayKey,
  useNow,
  useRecipientSelection,
} from "./activity-shared";
import { TONE_CHIP, kindMeta } from "./activity-kinds";

const STRIP_DAYS = 14;
/** Activity rows are kept ~120 days server-side. */
const HISTORY_DAYS = 120;

type SideState = { key: string; alerts: ActivityItem[]; orders: ActivityItem[]; error: boolean };
type DiaryState = { key: string; byDay: Map<string, string>; error: string };

/** The diary Saheli's nightly dream keeps in the care record: lines "- YYYY-MM-DD: text" (trust plan A1: it replaced the
 *  old Gemini daily snapshot). */
function diaryByDay(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of body.split("\n")) {
    const m = raw.trim().match(/^-\s*(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
    if (m) out.set(m[1]!, m[2]!.trim());
  }
  return out;
}

/** Saheli's diary: one line about each day, written each night from the day's chats and care events in the care record. */
export function DailySnapshotPage() {
  const sel = useRecipientSelection();
  const { searchParams, setParams, familyId, selectedId } = sel;
  const now = useNow();
  const today = istDayKey(new Date(now));
  const rawDay = searchParams.get("day");
  const day = isValidDayKey(rawDay) && rawDay <= today ? rawDay : today;
  const minDay = shiftDayKey(today, -HISTORY_DAYS);
  const [reloadTick, setReloadTick] = useState(0);
  const diaryKey = `${familyId}|${selectedId}|${reloadTick}`;
  const sideKey = `${familyId}|${selectedId}|${day}`;
  const [diary, setDiary] = useState<DiaryState | null>(null);
  const [side, setSide] = useState<SideState | null>(null);

  useEffect(() => {
    if (!familyId || !selectedId) return;
    let cancelled = false;
    getCareOverview(familyId, selectedId)
      .then((o) => {
        const note = o.notes.find((n) => n.subjectId === selectedId && n.slug === "diary");
        if (!cancelled) setDiary({ key: diaryKey, byDay: diaryByDay(note?.body ?? ""), error: "" });
      })
      .catch((err: unknown) => {
        if (!cancelled) setDiary({ key: diaryKey, byDay: new Map(), error: err instanceof Error ? err.message : "Couldn't load the diary" });
      });
    return () => {
      cancelled = true;
    };
  }, [familyId, selectedId, diaryKey]);

  // Alerts + orders for the day (from the activity feed)
  useEffect(() => {
    if (!familyId || !selectedId) return;
    let cancelled = false;
    Promise.all([
      getActivity(familyId, selectedId, { day, kinds: ["health", "caregiver_alert"], limit: 20 }),
      getActivity(familyId, selectedId, { day, kinds: ["order_placed", "order_failed", "order_cancelled"], limit: 20 }),
    ])
      .then(([a, o]) => {
        if (!cancelled) setSide({ key: sideKey, alerts: a.items, orders: o.items, error: false });
      })
      .catch(() => {
        if (!cancelled) setSide({ key: sideKey, alerts: [], orders: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [familyId, selectedId, day, sideKey]);

  const current = diary && diary.key === diaryKey ? diary : null;
  const loading = !!familyId && !!selectedId && !current;
  const line = current?.byDay.get(day) ?? null;
  const sideData = side && side.key === sideKey ? side : null;

  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [day, selectedId]);
  const stripDays = useMemo(() => Array.from({ length: STRIP_DAYS }, (_, i) => shiftDayKey(today, -i)).reverse(), [today]);
  const selectedName = sel.recipients.find((r) => r.userId === selectedId)?.name ?? "your care recipient";
  const timelineHref = `/dashboard/activity?recipient=${encodeURIComponent(selectedId ?? "")}&day=${day}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <AccessGate {...sel}>
        <ActivityHeader
          recipients={sel.recipients}
          selectedId={selectedId}
          onSelect={sel.select}
          subtitle="Saheli's diary: one line about each day, written each night from the day's chats, reminders and care."
        />

        <div className="panel-card px-3 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div ref={stripRef} className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {stripDays.map((d) => {
                const parts = dayKeyParts(d);
                const has = current?.byDay.has(d);
                const active = d === day;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setParams({ day: d === today ? null : d })}
                    aria-pressed={active}
                    title={dayKeyLabel(d, today)}
                    className={cn("flex w-[52px] shrink-0 flex-col items-center rounded-xl py-2 transition-colors", active ? "bg-primary text-white" : "hover:bg-[var(--surface)]")}
                  >
                    <span className={cn("text-[10px] font-semibold uppercase", active ? "text-white/80" : "text-[var(--text-tertiary)]")}>
                      {d === today ? "Today" : parts.weekday}
                    </span>
                    <span className={cn("text-[15px] font-extrabold", active ? "text-white" : "text-[var(--text-primary)]")}>{parts.day}</span>
                    <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", !has ? "bg-transparent" : active ? "bg-white" : "bg-primary")} />
                  </button>
                );
              })}
            </div>
            <label className="theme-field flex h-9 shrink-0 items-center gap-1.5 self-start rounded-full px-3 text-[12px] font-semibold sm:self-auto">
              <CalendarDays className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <input
                type="date"
                value={day}
                min={minDay}
                max={today}
                onChange={(e) => isValidDayKey(e.target.value) && setParams({ day: e.target.value === today ? null : e.target.value })}
                className="w-[118px] bg-transparent text-[12px] outline-none [color-scheme:light] dark:[color-scheme:dark]"
                aria-label="Pick a day"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel-card overflow-hidden lg:col-span-2" data-testid="saheli-diary">
            <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-3.5">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">{dayKeyLabel(day, today)}</h2>
            </div>
            {loading ? (
              <CenteredState icon={<Loader2 className="h-6 w-6 animate-spin" />} title="Opening the diary…" body="" />
            ) : current?.error ? (
              <CenteredState
                tone="error"
                icon={<WifiOff className="h-6 w-6" />}
                title="Couldn't load the diary"
                body={current.error}
                action={
                  <button
                    type="button"
                    onClick={() => setReloadTick((t) => t + 1)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Try again
                  </button>
                }
              />
            ) : line ? (
              <p className="px-5 py-5 text-[14px] leading-relaxed text-[var(--text-primary)]">
                <RichText text={line} />
              </p>
            ) : (
              <CenteredState
                icon={<CalendarDays className="h-6 w-6" />}
                title="No diary line for this day"
                body={
                  day === today
                    ? `Saheli writes today's line tonight, after ${selectedName}'s day. The timeline shows what happened so far.`
                    : `Nothing was written for this day: a quiet day, or no chats with Saheli.`
                }
              />
            )}
          </div>

          <div className="space-y-4">
            <SideCard
              title="Health & alerts"
              icon={<HeartPulse className="h-4 w-4 text-[var(--danger-text)]" />}
              loading={!sideData}
              error={sideData?.error}
              items={sideData?.alerts ?? []}
              empty="No health mentions or alerts this day."
              alert
            />
            <SideCard
              title="Orders"
              icon={<ShoppingBag className="h-4 w-4 text-primary" />}
              loading={!sideData}
              error={sideData?.error}
              items={sideData?.orders ?? []}
              empty="No orders this day."
            />
            <Link
              href={timelineHref}
              className="panel-card flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:border-primary/30"
            >
              <div>
                <p className="text-[13px] font-bold text-[var(--text-primary)]">Full timeline</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">Every message, step and screenshot for this day</p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
          </div>
        </div>
      </AccessGate>
    </div>
  );
}

function SideCard({
  title,
  icon,
  loading,
  error,
  items,
  empty,
  alert,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  error?: boolean;
  items: ActivityItem[];
  empty: string;
  alert?: boolean;
}) {
  return (
    <div className={cn("panel-card overflow-hidden", alert && items.some((i) => i.severity === "error") && "border-[var(--danger-border)]")}>
      <div className="flex items-center justify-between border-b border-[var(--border-strong)] px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-[13px] font-extrabold text-[var(--text-primary)]">{title}</h3>
        </div>
        {!loading && items.length > 0 && (
          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">
            {items.length}
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="px-4 py-5 text-[12px] text-[var(--text-tertiary)]">Couldn&apos;t load this right now.</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-5 text-[12px] text-[var(--text-tertiary)]">{empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--border-strong)]">
          {items.map((it) => {
            const meta = kindMeta(it);
            const Icon = meta.icon;
            return (
              <li
                key={it.id}
                className={cn(
                  "flex gap-2.5 px-4 py-2.5",
                  it.severity === "error" && "bg-[var(--danger-bg)]",
                  it.severity === "warn" && "bg-[var(--warning-bg)]",
                )}
              >
                <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", TONE_CHIP[meta.tone])}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[12px] font-semibold leading-snug",
                      it.severity === "error" ? "text-[var(--danger-text)]" : "text-[var(--text-primary)]",
                    )}
                  >
                    {it.title}
                  </p>
                  <p className="text-[10.5px] text-[var(--text-tertiary)]">{formatIstTime(it.createdAt)} IST</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

