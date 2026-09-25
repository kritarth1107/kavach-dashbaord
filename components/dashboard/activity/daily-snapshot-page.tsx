"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  BellRing,
  Car,
  CheckCircle2,
  HeartPulse,
  Loader2,
  MessageCircle,
  Mic,
  RefreshCw,
  ShoppingBag,
  AlarmClock,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityApiError,
  generateDailySnapshot,
  getActivity,
  getDailySnapshot,
  listDailySnapshots,
  type ActivityItem,
  type DailySnapshot,
} from "@/lib/activity-api";
import { cn } from "@/lib/utils";
import {
  AccessGate,
  ActivityHeader,
  CenteredState,
  RichText,
  dayKeyLabel,
  dayKeyParts,
  formatIstDateTime,
  formatIstTime,
  istDayKey,
  isValidDayKey,
  shiftDayKey,
  useNow,
  useRecipientSelection,
} from "./activity-shared";
import { TONE_CHIP, kindMeta } from "./activity-kinds";

const STRIP_DAYS = 14;
const POLL_MS = 5_000;
const POLL_MAX = 24; // ~2 minutes
/** Activity rows are kept ~120 days server-side. */
const HISTORY_DAYS = 120;

type SnapState = { key: string; snapshot: DailySnapshot | null; error: string; errorStatus: number };
type SideState = { key: string; alerts: ActivityItem[]; orders: ActivityItem[]; error: boolean };

const COUNT_TILES: Array<{ key: string; label: string; icon: typeof MessageCircle }> = [
  { key: "messages", label: "Messages", icon: MessageCircle },
  { key: "voiceNotes", label: "Voice notes", icon: Mic },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "rides", label: "Rides", icon: Car },
  { key: "reminders", label: "Reminders", icon: AlarmClock },
  { key: "healthFlags", label: "Health flags", icon: HeartPulse },
  { key: "nudges", label: "Nudges", icon: BellRing },
];

export function DailySnapshotPage() {
  const sel = useRecipientSelection();
  const { searchParams, setParams, familyId, selectedId } = sel;
  const now = useNow();
  const today = istDayKey(new Date(now));
  const rawDay = searchParams.get("day");
  const day = isValidDayKey(rawDay) && rawDay <= today ? rawDay : today;
  const minDay = shiftDayKey(today, -HISTORY_DAYS);

  const [reloadTick, setReloadTick] = useState(0);
  const snapKey = `${familyId}|${selectedId}|${day}|${reloadTick}`;
  const listKey = `${familyId}|${selectedId}|${reloadTick}`;

  const [snap, setSnap] = useState<SnapState | null>(null);
  const [list, setList] = useState<{ key: string; snapshots: DailySnapshot[] } | null>(null);
  const [side, setSide] = useState<SideState | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const reqRef = useRef(0);

  // Snapshot for the selected day
  useEffect(() => {
    if (!familyId || !selectedId) return;
    const reqId = ++reqRef.current;
    getDailySnapshot(familyId, selectedId, day)
      .then((snapshot) => {
        if (reqId === reqRef.current) setSnap({ key: snapKey, snapshot, error: "", errorStatus: 0 });
      })
      .catch((err: unknown) => {
        if (reqId !== reqRef.current) return;
        setSnap({
          key: snapKey,
          snapshot: null,
          error: err instanceof Error ? err.message : "Failed to load snapshot",
          errorStatus: err instanceof ActivityApiError ? err.status : 0,
        });
      });
  }, [familyId, selectedId, day, snapKey]);

  // Alerts + orders for the day (from the activity feed)
  useEffect(() => {
    if (!familyId || !selectedId) return;
    let cancelled = false;
    Promise.all([
      getActivity(familyId, selectedId, { day, kinds: ["health", "caregiver_alert"], limit: 20 }),
      getActivity(familyId, selectedId, {
        day,
        kinds: ["order_placed", "order_failed", "order_cancelled"],
        limit: 20,
      }),
    ])
      .then(([a, o]) => {
        if (!cancelled) setSide({ key: snapKey, alerts: a.items, orders: o.items, error: false });
      })
      .catch(() => {
        if (!cancelled) setSide({ key: snapKey, alerts: [], orders: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [familyId, selectedId, day, snapKey]);

  // Recent snapshots for the calendar strip
  useEffect(() => {
    if (!familyId || !selectedId) return;
    let cancelled = false;
    listDailySnapshots(familyId, selectedId, STRIP_DAYS)
      .then((snapshots) => {
        if (!cancelled) setList({ key: listKey, snapshots });
      })
      .catch(() => {
        if (!cancelled) setList({ key: listKey, snapshots: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [familyId, selectedId, listKey]);

  const current = snap && snap.key === snapKey ? snap : null;
  const loading = !!familyId && !!selectedId && !current;
  const snapshot = current?.snapshot ?? null;
  const sideData = side && side.key === snapKey ? side : null;
  const byDay = useMemo(() => {
    const m = new Map<string, DailySnapshot>();
    for (const s of list && list.key === listKey ? list.snapshots : []) m.set(s.dayKey, s);
    if (snapshot) m.set(snapshot.dayKey, snapshot);
    return m;
  }, [list, listKey, snapshot]);

  // Poll while the backend reports "generating"
  const pollCount = useRef(0);
  useEffect(() => {
    if (snapshot?.status !== "generating" || !familyId || !selectedId) {
      pollCount.current = 0;
      return;
    }
    if (pollCount.current >= POLL_MAX) return;
    const t = setTimeout(async () => {
      pollCount.current += 1;
      try {
        const next = await getDailySnapshot(familyId, selectedId, day);
        setSnap((prev) => (prev && prev.key === snapKey ? { ...prev, snapshot: next } : prev));
      } catch {
        /* keep polling on transient errors */
        setSnap((prev) => (prev ? { ...prev } : prev));
      }
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [snapshot, familyId, selectedId, day, snapKey]);

  const generate = useCallback(async () => {
    if (!familyId || !selectedId || generating) return;
    setGenerating(true);
    setGenError("");
    const key = snapKey;
    try {
      const next = await generateDailySnapshot(familyId, selectedId, day);
      setSnap((prev) => (prev && prev.key === key ? { ...prev, snapshot: next, error: "", errorStatus: 0 } : prev));
      if (next) {
        setList((prev) =>
          prev
            ? { ...prev, snapshots: [next, ...prev.snapshots.filter((s) => s.dayKey !== next.dayKey)] }
            : prev,
        );
      }
      if (next?.status === "failed") setGenError("Saheli couldn't write the summary this time. Please try again shortly.");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate snapshot");
    } finally {
      setGenerating(false);
    }
  }, [familyId, selectedId, generating, day, snapKey]);

  // Keep the selected day visible in the horizontally scrolling strip.
  const stripRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [day, selectedId]);

  const stripDays = useMemo(
    () => Array.from({ length: STRIP_DAYS }, (_, i) => shiftDayKey(today, -i)).reverse(),
    [today],
  );
  const busy = generating || snapshot?.status === "generating";
  const selectedName = sel.recipients.find((r) => r.userId === selectedId)?.name ?? "your care recipient";
  const timelineHref = `/dashboard/activity?recipient=${encodeURIComponent(selectedId ?? "")}&day=${day}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <AccessGate {...sel}>
        <ActivityHeader
          recipients={sel.recipients}
          selectedId={selectedId}
          onSelect={sel.select}
          subtitle="A short, AI-written summary of each day — highlights, mood and health mentions, orders and alerts."
          actions={
            <button
              type="button"
              onClick={() => void generate()}
              disabled={busy || loading || !!current?.error}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {busy ? "Generating…" : snapshot ? "Regenerate" : "Generate now"}
            </button>
          }
        />

        {/* Day strip */}
        <div className="panel-card px-3 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div ref={stripRef} className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {stripDays.map((d) => {
                const parts = dayKeyParts(d);
                const s = byDay.get(d);
                const active = d === day;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setParams({ day: d === today ? null : d })}
                    aria-pressed={active}
                    title={dayKeyLabel(d, today)}
                    className={cn(
                      "flex w-[52px] shrink-0 flex-col items-center rounded-xl py-2 transition-colors",
                      active ? "bg-primary text-white" : "hover:bg-[var(--surface)]",
                    )}
                  >
                    <span className={cn("text-[10px] font-semibold uppercase", active ? "text-white/80" : "text-[var(--text-tertiary)]")}>
                      {d === today ? "Today" : parts.weekday}
                    </span>
                    <span className={cn("text-[15px] font-extrabold", active ? "text-white" : "text-[var(--text-primary)]")}>
                      {parts.day}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 h-1.5 w-1.5 rounded-full",
                        !s
                          ? "bg-transparent"
                          : (s.concerns?.length ?? 0) > 0 || (s.counts?.healthFlags ?? 0) > 0
                            ? active ? "bg-white" : "bg-[var(--warning-text)]"
                            : s.status === "ready"
                              ? active ? "bg-white" : "bg-primary"
                              : active ? "bg-white/60" : "bg-[var(--text-tertiary)]",
                      )}
                    />
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
                onChange={(e) =>
                  isValidDayKey(e.target.value) && setParams({ day: e.target.value === today ? null : e.target.value })
                }
                className="w-[118px] bg-transparent text-[12px] outline-none [color-scheme:light] dark:[color-scheme:dark]"
                aria-label="Pick a day"
              />
            </label>
          </div>
        </div>

        {genError && (
          <div className="alert-error flex items-center gap-2 rounded-2xl px-4 py-3 text-[12.5px]">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {genError}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Snapshot card */}
          <div className="panel-card overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-strong)] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">{dayKeyLabel(day, today)}</h2>
              </div>
              {snapshot?.mood && snapshot.status === "ready" && (
                <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-bold capitalize text-primary">
                  Mood · {snapshot.mood}
                </span>
              )}
            </div>

            {loading ? (
              <SnapshotSkeleton />
            ) : current?.error ? (
              <CenteredState
                tone="error"
                icon={<WifiOff className="h-6 w-6" />}
                title={current.errorStatus === 404 ? "Snapshots aren't available yet" : "Couldn't load the snapshot"}
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
            ) : busy && (!snapshot || snapshot.status !== "ready") ? (
              <CenteredState
                icon={<Loader2 className="h-6 w-6 animate-spin" />}
                title="Writing the day's summary…"
                body="Saheli is reading through the day's activity. This can take up to half a minute."
              />
            ) : !snapshot ? (
              <CenteredState
                icon={<CalendarDays className="h-6 w-6" />}
                title="No snapshot for this day yet"
                body={
                  day === today
                    ? `Today's snapshot is written automatically around 9 PM IST. You can generate one now to see how ${selectedName}'s day is going.`
                    : "No summary was written for this day. Generate one from the day's activity."
                }
                action={
                  <button
                    type="button"
                    onClick={() => void generate()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Generate snapshot
                  </button>
                }
              />
            ) : snapshot.status === "failed" ? (
              <CenteredState
                tone="error"
                icon={<AlertTriangle className="h-6 w-6" />}
                title="The summary couldn't be generated"
                body={snapshot.summary || "Try generating it again in a couple of minutes."}
                action={
                  <button
                    type="button"
                    onClick={() => void generate()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </button>
                }
              />
            ) : snapshot.status === "empty" ? (
              <CenteredState
                icon={<CalendarDays className="h-6 w-6" />}
                title="A quiet day"
                body={snapshot.summary || `${selectedName} didn't interact with Saheli on this day.`}
              />
            ) : (
              <SnapshotBody snapshot={snapshot} />
            )}
          </div>

          {/* Side: alerts + orders */}
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

function SnapshotBody({ snapshot }: { snapshot: DailySnapshot }) {
  const highlights = snapshot.highlights ?? [];
  const concerns = snapshot.concerns ?? [];
  const counts = snapshot.counts ?? {};
  // counts.nudges (v1.1) may be missing on older snapshots — treat as 0.
  const hasCounts = Object.values(counts).some((v) => typeof v === "number");
  const tiles = COUNT_TILES.filter((t) => typeof counts[t.key] === "number" || (t.key === "nudges" && hasCounts));

  return (
    <div className="space-y-5 px-5 py-5">
      {snapshot.summary && (
        <p className="text-[14px] leading-relaxed text-[var(--text-primary)]">
          <RichText text={snapshot.summary} />
        </p>
      )}

      {concerns.length > 0 && (
        <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--warning-text)]">
            <AlertTriangle className="h-3.5 w-3.5" /> Worth a look
          </p>
          <ul className="mt-2 space-y-1.5">
            {concerns.map((c, i) => (
              <li key={i} className="text-[12.5px] leading-relaxed text-[var(--text-primary)]">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {highlights.length > 0 && (
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)]">Highlights</p>
          <ul className="mt-2 space-y-2">
            {highlights.map((h, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tiles.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {tiles.map((t) => {
            const Icon = t.icon;
            const value = counts[t.key] ?? 0;
            const flag = t.key === "healthFlags" && value > 0;
            return (
              <div
                key={t.key}
                className={cn(
                  "rounded-xl border px-2.5 py-2.5",
                  flag ? "border-[var(--danger-border)] bg-[var(--danger-bg)]" : "border-[var(--border)] bg-[var(--elevated-muted)]",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", flag ? "text-[var(--danger-text)]" : "text-[var(--text-tertiary)]")} />
                <p className={cn("mt-1 text-[18px] font-extrabold", flag ? "text-[var(--danger-text)]" : "text-[var(--text-primary)]")}>
                  {value}
                </p>
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">{t.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <p className="border-t border-[var(--border-strong)] pt-3 text-[10.5px] text-[var(--text-tertiary)]">
        {snapshot.generatedAt ? `Generated ${formatIstDateTime(snapshot.generatedAt)}` : "Generated"}
        {snapshot.source === "on_demand" ? " · on demand" : snapshot.source === "scheduled" ? " · nightly" : ""}
        {snapshot.model ? ` · ${snapshot.model}` : ""} · AI summary — check the timeline for exact details.
      </p>
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

function SnapshotSkeleton() {
  return (
    <div className="animate-pulse space-y-3 px-5 py-6" aria-busy="true">
      <div className="h-3.5 w-full rounded bg-[var(--surface)]" />
      <div className="h-3.5 w-11/12 rounded bg-[var(--surface)]" />
      <div className="h-3.5 w-4/5 rounded bg-[var(--surface)]" />
      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-[var(--surface)]" />
        ))}
      </div>
    </div>
  );
}
