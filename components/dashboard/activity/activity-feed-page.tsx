"use client";

import Link from "next/link";
import {
  AlertOctagon,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getActivity, type ActivityItem } from "@/lib/activity-api";
import { cn } from "@/lib/utils";
import {
  AccessGate,
  ActivityHeader,
  CenteredState,
  RichText,
  dayKeyLabel,
  formatIstDateTime,
  formatIstTime,
  humanize,
  istDayKey,
  isValidDayKey,
  relativeTime,
  shiftDayKey,
  useNow,
  useRecipientSelection,
} from "./activity-shared";
import {
  FILTERS,
  ORDER_KINDS,
  TERMINAL_ORDER_KINDS,
  TONE_CHIP,
  isFilterKey,
  kindMeta,
  screenshotOf,
  severityCardClass,
  str,
  strList,
  type FilterKey,
} from "./activity-kinds";

const PAGE_SIZE = 50;
/** Order-related events closer together than this are shown as one order run. */
const ORDER_GROUP_GAP_MS = 45 * 60_000;

type Entry =
  | { type: "event"; key: string; item: ActivityItem }
  | { type: "order"; key: string; items: ActivityItem[] /* newest first */ };

type FeedState = {
  key: string;
  items: ActivityItem[];
  nextBefore: string | null;
  hasMore: boolean;
  error: string;
  errorStatus: number;
};

function partnerOf(item: ActivityItem): string | null {
  const fromData = str(item.data?.partner);
  if (fromData) return fromData.toLowerCase();
  const confirm = item.data?.confirm as Record<string, unknown> | undefined;
  const fromConfirm = confirm ? str(confirm.partner) : null;
  if (fromConfirm) return fromConfirm.toLowerCase();
  if (item.kind === "diag" || item.kind === "order_interrupt") return null;
  const idx = item.title.indexOf(":");
  return idx > 0 && idx < 32 ? item.title.slice(0, idx).trim().toLowerCase() : null;
}

function partnerLabel(items: ActivityItem[]): string | null {
  for (const it of items) {
    if (it.kind === "diag" || it.kind === "order_interrupt") continue;
    const idx = it.title.indexOf(":");
    if (idx > 0 && idx < 32) return it.title.slice(0, idx).trim();
    const p = str(it.data?.partner);
    if (p) return humanize(p);
  }
  return null;
}

/** Presentation-only grouping of consecutive order events into one expandable run. */
function buildEntries(items: ActivityItem[]): Entry[] {
  const entries: Entry[] = [];
  let group: ActivityItem[] | null = null;

  const flush = () => {
    if (group?.length) entries.push({ type: "order", key: `order-${group[0].id}`, items: group });
    group = null;
  };

  for (const item of items) {
    if (!ORDER_KINDS.has(item.kind)) {
      flush();
      entries.push({ type: "event", key: item.id, item });
      continue;
    }
    if (group) {
      const current: ActivityItem[] = group;
      const oldest = current[current.length - 1];
      const gap = new Date(oldest.createdAt).getTime() - new Date(item.createdAt).getTime();
      const p = partnerOf(item);
      const gp = current.map(partnerOf).find(Boolean) ?? null;
      const sameRun =
        gap <= ORDER_GROUP_GAP_MS &&
        oldest.dayKey === item.dayKey &&
        !(TERMINAL_ORDER_KINDS.has(item.kind) && current.some((g) => TERMINAL_ORDER_KINDS.has(g.kind))) &&
        !(p && gp && p !== gp);
      if (!sameRun) flush();
    }
    if (!group) group = [];
    (group as ActivityItem[]).push(item);
  }
  flush();
  return entries;
}

export function ActivityFeedPage() {
  const sel = useRecipientSelection();
  const { searchParams, setParams, familyId, selectedId } = sel;
  const now = useNow();

  const rawDay = searchParams.get("day");
  const day = isValidDayKey(rawDay) ? rawDay : null;
  const rawFilter = searchParams.get("type");
  const filter: FilterKey = isFilterKey(rawFilter) ? rawFilter : "all";
  const kinds = FILTERS.find((f) => f.key === filter)?.kinds ?? null;
  const today = istDayKey(new Date(now));

  const [reloadTick, setReloadTick] = useState(0);
  const queryKey = `${familyId}|${selectedId}|${day ?? ""}|${filter}|${reloadTick}`;
  const [feed, setFeed] = useState<FeedState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  const requestRef = useRef(0);

  useEffect(() => {
    if (!familyId || !selectedId) return;
    const reqId = ++requestRef.current;
    getActivity(familyId, selectedId, { day: day ?? undefined, kinds: kinds ?? undefined, limit: PAGE_SIZE })
      .then((page) => {
        if (reqId !== requestRef.current) return;
        setFeed({ key: queryKey, ...page, error: "", errorStatus: 0 });
        setMoreError("");
      })
      .catch((err: unknown) => {
        if (reqId !== requestRef.current) return;
        const status = (err as { status?: number })?.status ?? 0;
        setFeed({
          key: queryKey,
          items: [],
          nextBefore: null,
          hasMore: false,
          error: err instanceof Error ? err.message : "Failed to load activity",
          errorStatus: status,
        });
      });
    // kinds derives from filter, which is part of queryKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const current = feed && feed.key === queryKey ? feed : null;
  const loading = !!familyId && !!selectedId && !current;

  const loadMore = useCallback(async () => {
    if (!current || !current.hasMore || !current.nextBefore || loadingMore || !familyId || !selectedId) return;
    const reqId = requestRef.current;
    setLoadingMore(true);
    setMoreError("");
    try {
      const page = await getActivity(familyId, selectedId, {
        day: day ?? undefined,
        kinds: kinds ?? undefined,
        before: current.nextBefore,
        limit: PAGE_SIZE,
      });
      if (reqId !== requestRef.current) return;
      setFeed((prev) => {
        if (!prev || prev.key !== current.key) return prev;
        const seen = new Set(prev.items.map((i) => i.id));
        return {
          ...prev,
          items: [...prev.items, ...page.items.filter((i) => !seen.has(i.id))],
          nextBefore: page.nextBefore,
          hasMore: page.hasMore,
        };
      });
    } catch (err) {
      setMoreError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [current, loadingMore, familyId, selectedId, day, kinds]);

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !current?.hasMore || moreError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [current?.hasMore, loadMore, moreError]);

  const items = useMemo(() => current?.items ?? [], [current]);
  const byDay = useMemo(() => {
    const groups: Array<{ dayKey: string; entries: Entry[] }> = [];
    const buckets = new Map<string, ActivityItem[]>();
    for (const it of items) {
      const k = it.dayKey || istDayKey(new Date(it.createdAt));
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(it);
    }
    for (const [dayKey, list] of buckets) groups.push({ dayKey, entries: buildEntries(list) });
    return groups;
  }, [items]);

  const alerts = useMemo(
    () => items.filter((i) => i.severity === "error" || (i.severity === "warn" && (i.kind === "health" || i.kind === "caregiver_alert"))),
    [items],
  );

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const jumpTo = (id: string) => {
    const el = document.getElementById(`act-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(id);
      setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 2200);
    }
  };

  const [lightbox, setLightbox] = useState<string | null>(null);
  const selectedName = sel.recipients.find((r) => r.userId === selectedId)?.name ?? "your care recipient";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <AccessGate {...sel}>
        <ActivityHeader
          recipients={sel.recipients}
          selectedId={selectedId}
          onSelect={sel.select}
          subtitle="Chats, voice notes, orders with every step, rides, reminders and health mentions — logged here instead of on WhatsApp."
          actions={
            <button
              type="button"
              onClick={() => setReloadTick((t) => t + 1)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          }
        />

        {/* Filters */}
        <div className="panel-card flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setParams({ type: f.key === "all" ? null : f.key })}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  filter === f.key
                    ? f.key === "alerts"
                      ? "bg-[var(--danger-text)] text-white"
                      : "bg-primary text-white"
                    : "theme-chip hover:border-primary/40",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setParams({ day: null })}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                !day ? "bg-primary-light text-primary" : "theme-chip hover:border-primary/40",
              )}
            >
              Latest
            </button>
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => setParams({ day: shiftDayKey(day ?? today, -1) })}
              className="flex h-8 w-8 items-center justify-center rounded-full theme-chip hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="theme-field flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold">
              <CalendarDays className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <input
                type="date"
                value={day ?? ""}
                max={today}
                onChange={(e) => setParams({ day: isValidDayKey(e.target.value) ? e.target.value : null })}
                className="w-[118px] bg-transparent text-[12px] outline-none [color-scheme:light] dark:[color-scheme:dark]"
                aria-label="Pick a day"
              />
            </label>
            <button
              type="button"
              aria-label="Next day"
              disabled={!day || day >= today}
              onClick={() => day && setParams({ day: shiftDayKey(day, 1) })}
              className="flex h-8 w-8 items-center justify-center rounded-full theme-chip hover:text-primary disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Alerts banner */}
        {!loading && alerts.length > 0 && (
          <div className="rounded-[20px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-[var(--danger-text)]" />
              <p className="text-[13px] font-extrabold text-[var(--danger-text)]">
                {alerts.length} health {alerts.length === 1 ? "alert" : "alerts"} {day ? `on ${dayKeyLabel(day, today)}` : "in recent activity"}
              </p>
            </div>
            <ul className="mt-2 space-y-1">
              {alerts.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(a.id)}
                    className="flex w-full items-baseline gap-2 text-left text-[12px] text-[var(--danger-text)] hover:underline"
                  >
                    <span className="shrink-0 font-semibold tabular-nums">{formatIstDateTime(a.createdAt)}</span>
                    <span className="truncate opacity-90">{a.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timeline */}
        {loading ? (
          <FeedSkeleton />
        ) : current?.error ? (
          <div className="panel-card">
            <CenteredState
              tone="error"
              icon={<WifiOff className="h-6 w-6" />}
              title={current.errorStatus === 404 ? "Activity isn't available yet" : "Couldn't load activity"}
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
          </div>
        ) : items.length === 0 ? (
          <div className="panel-card">
            <CenteredState
              icon={<Inbox className="h-6 w-6" />}
              title={day ? `Nothing logged on ${dayKeyLabel(day, today)}` : "No activity yet"}
              body={
                filter !== "all"
                  ? "No events match this filter. Try “All”."
                  : `When ${selectedName} chats with Saheli on WhatsApp, orders something or mentions how they feel, it appears here.`
              }
            />
          </div>
        ) : (
          <div className="space-y-6">
            {byDay.map((group) => (
              <section key={group.dayKey}>
                <div className="sticky top-[64px] z-10 -mx-1 mb-2 flex items-center justify-between bg-[var(--main-surface)]/90 px-1 py-2 backdrop-blur">
                  <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    {dayKeyLabel(group.dayKey, today)}
                  </h2>
                  <Link
                    href={`/dashboard/activity/snapshot?recipient=${encodeURIComponent(selectedId ?? "")}&day=${group.dayKey}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> Day snapshot
                  </Link>
                </div>
                <ol className="relative space-y-2.5 pl-11 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-[var(--border-strong)]">
                  {group.entries.map((entry) =>
                    entry.type === "event" ? (
                      <EventRow
                        key={entry.key}
                        item={entry.item}
                        now={now}
                        highlighted={highlightId === entry.item.id}
                      />
                    ) : (
                      <OrderRun
                        key={entry.key}
                        items={entry.items}
                        now={now}
                        highlightId={highlightId}
                        onOpenImage={setLightbox}
                      />
                    ),
                  )}
                </ol>
              </section>
            ))}

            <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-4">
              {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {moreError && <p className="text-[12px] text-[var(--danger-text)]">{moreError}</p>}
              {current?.hasMore && !loadingMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] hover:border-primary/40 hover:text-primary"
                >
                  {moreError ? "Retry" : "Load older activity"}
                </button>
              ) : (
                !current?.hasMore && (
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    {day ? "That's everything for this day." : "You're all caught up."}
                  </p>
                )
              )}
            </div>
          </div>
        )}
      </AccessGate>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Browser screenshot" className="max-h-[90vh] max-w-full rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TimeStamp({ iso, now }: { iso: string; now: number }) {
  return (
    <time
      dateTime={iso}
      title={formatIstDateTime(iso)}
      className="shrink-0 text-right text-[11px] leading-tight text-[var(--text-tertiary)]"
    >
      <span className="block font-semibold tabular-nums text-[var(--text-secondary)]">{formatIstTime(iso)} IST</span>
      <span className="block">{relativeTime(iso, now)}</span>
    </time>
  );
}

function EventRow({ item, now, highlighted }: { item: ActivityItem; now: number; highlighted: boolean }) {
  const meta = kindMeta(item);
  const Icon = meta.icon;
  const detail = str(item.detail);
  const [expanded, setExpanded] = useState(false);
  const long = !!detail && detail.length > 280;
  const badges: string[] = [];
  const category = str(item.data?.category);
  if (item.kind === "health" && category) badges.push(humanize(category));
  if (item.kind === "health" && item.data?.deduped === true) badges.push("Repeat · alert already sent");
  if (item.kind === "caregiver_alert") {
    const urgency = str(item.data?.urgency);
    if (urgency) badges.push(`${humanize(urgency)} urgency`);
    if (item.data?.whatsapp === true) badges.push("WhatsApp sent");
  }
  const mood = str(item.data?.mood);
  if (item.kind === "mood" && mood) badges.push(humanize(mood));
  if (item.kind === "ride") {
    const provider = str(item.data?.provider);
    if (provider) badges.push(humanize(provider));
  }
  if (item.kind === "reminder") {
    const status = str(item.data?.status);
    if (status) badges.push(humanize(status));
  }
  const from = item.kind === "ride" ? str(item.data?.from) : null;
  const to = item.kind === "ride" ? str(item.data?.to) : null;
  const isAlert = item.severity !== "info";

  return (
    <li id={`act-${item.id}`} className="relative scroll-mt-28">
      <span
        className={cn(
          "absolute -left-11 top-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-xl ring-4 ring-[var(--main-surface)]",
          TONE_CHIP[meta.tone],
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 transition-shadow",
          severityCardClass(item.severity),
          item.severity === "error" && "border-l-4 border-l-[var(--danger-text)]",
          highlighted && "ring-2 ring-primary",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                item.severity === "error"
                  ? "text-[var(--danger-text)]"
                  : item.severity === "warn"
                    ? "text-[var(--warning-text)]"
                    : "text-[var(--text-tertiary)]",
              )}
            >
              {meta.label}
            </p>
            <p
              className={cn(
                "mt-0.5 text-[13.5px] font-bold leading-snug",
                item.severity === "error" ? "text-[var(--danger-text)]" : "text-[var(--text-primary)]",
              )}
            >
              {item.title}
            </p>
          </div>
          <TimeStamp iso={item.createdAt} now={now} />
        </div>

        {(from || to) && (
          <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
            {from ?? "—"} <span className="text-[var(--text-tertiary)]">→</span> {to ?? "—"}
          </p>
        )}

        {detail && (
          <div
            className={cn(
              "mt-1.5 text-[12.5px] leading-relaxed",
              isAlert ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
              item.kind === "voice_note" && "italic",
            )}
          >
            <RichText
              text={item.kind === "voice_note" ? `“${detail}”` : long && !expanded ? `${detail.slice(0, 280).trimEnd()}…` : detail}
            />
            {long && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="ml-1 text-[11px] font-semibold not-italic text-primary hover:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  item.severity === "error"
                    ? "status-pill-rejected"
                    : item.severity === "warn"
                      ? "status-pill-pending"
                      : "theme-chip",
                )}
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function orderOutcome(items: ActivityItem[]) {
  const terminal = items.find((i) => TERMINAL_ORDER_KINDS.has(i.kind));
  if (terminal?.kind === "order_placed") {
    const status = str(terminal.data?.status);
    return {
      label: status === "placed_unverified" ? "Placed · awaiting confirmation" : "Placed",
      className: "status-pill-success",
      tone: "green" as const,
    };
  }
  if (terminal?.kind === "order_failed") return { label: "Stopped", className: "status-pill-rejected", tone: "red" as const };
  if (terminal?.kind === "order_cancelled") return { label: "Cancelled", className: "theme-chip", tone: "gray" as const };
  if (items.some((i) => i.kind === "order_confirm_card"))
    return { label: "Waiting for confirmation", className: "status-pill-pending", tone: "amber" as const };
  return { label: "In progress", className: "status-pill-pending", tone: "blue" as const };
}

function OrderRun({
  items,
  now,
  highlightId,
  onOpenImage,
}: {
  items: ActivityItem[];
  now: number;
  highlightId: string | null;
  onOpenImage: (src: string) => void;
}) {
  const newest = items[0];
  const oldest = items[items.length - 1];
  const outcome = orderOutcome(items);
  const partner = partnerLabel(items);
  const confirm = items.find((i) => i.kind === "order_confirm_card")?.data?.confirm as
    | Record<string, unknown>
    | undefined;
  const placed = items.find((i) => i.kind === "order_placed");
  const failed = items.find((i) => i.kind === "order_failed");
  const confirmItems = strList(confirm?.items);
  const total = str(placed?.data?.totalLabel) ?? str(confirm?.totalLabel);
  const address = str(confirm?.addressLabel);
  const orderIds = strList(placed?.data?.orderIds);
  const failureReason = str(failed?.data?.failureReason);
  const screenshots = items.filter((i) => screenshotOf(i));
  const hasHighlight = !!highlightId && items.some((i) => i.id === highlightId);
  const [open, setOpen] = useState(outcome.tone === "red");
  const expanded = open || hasHighlight;
  const steps = [...items].reverse();
  const hasError = items.some((i) => i.severity === "error");

  return (
    <li id={`act-${newest.id}`} className="relative scroll-mt-28">
      <span
        className={cn(
          "absolute -left-11 top-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-xl ring-4 ring-[var(--main-surface)]",
          TONE_CHIP[outcome.tone],
        )}
      >
        <ShoppingBag className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border",
          hasError || outcome.tone === "red"
            ? "border-[var(--danger-border)]"
            : "border-[var(--border)]",
          "bg-[var(--card)]",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Order</p>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", outcome.className)}>
                {outcome.label}
              </span>
            </div>
            <p className="mt-0.5 text-[13.5px] font-bold leading-snug text-[var(--text-primary)]">
              {confirmItems.length ? confirmItems.join(", ") : partner ? `Order on ${partner}` : newest.title}
            </p>
            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
              {[partner, total, placed ? "Cash on delivery" : null, address].filter(Boolean).join(" · ")}
              {orderIds.length > 0 && (
                <span className="text-[var(--text-tertiary)]"> · #{orderIds.join(", #")}</span>
              )}
            </p>
            {failureReason && (
              <p className="mt-1 text-[12px] font-semibold text-[var(--danger-text)]">{humanize(failureReason)}</p>
            )}
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
              {expanded ? "Hide" : "Show"} {items.length} step{items.length === 1 ? "" : "s"}
              {screenshots.length > 0 && ` · ${screenshots.length} screenshot${screenshots.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <TimeStamp iso={newest.createdAt} now={now} />
            {oldest.id !== newest.id && (
              <span className="text-[10px] text-[var(--text-tertiary)]">started {formatIstTime(oldest.createdAt)}</span>
            )}
          </div>
        </button>

        {expanded && (
          <ol className="border-t border-[var(--border-strong)] bg-[var(--elevated-muted)] px-4 py-3">
            {steps.map((step, idx) => {
              const meta = kindMeta(step);
              const shot = screenshotOf(step);
              const stage = str(step.data?.stage);
              const intent = str(step.data?.intent);
              const url = step.kind === "diag" ? str(step.data?.url) : null;
              const detail = str(step.detail);
              return (
                <li
                  key={step.id}
                  id={`act-${step.id}`}
                  className={cn(
                    "relative flex gap-3 pb-3 pl-5 last:pb-0",
                    highlightId === step.id && "rounded-lg ring-2 ring-primary",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1.5 h-2 w-2 rounded-full",
                      meta.tone === "red"
                        ? "bg-[var(--danger-text)]"
                        : meta.tone === "green"
                          ? "bg-primary"
                          : meta.tone === "amber"
                            ? "bg-[var(--warning-text)]"
                            : "bg-[var(--text-tertiary)]",
                    )}
                  />
                  {idx < steps.length - 1 && (
                    <span className="absolute bottom-0 left-[3.5px] top-4 w-px bg-[var(--border-strong)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                        {step.kind === "order_step" && stage ? humanize(stage) : step.title}
                        {step.kind === "order_interrupt" && intent && (
                          <span className="ml-1.5 rounded-full bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">
                            {humanize(intent)}
                          </span>
                        )}
                        {step.kind === "diag" && (
                          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                            diagnostics{stage ? ` · ${humanize(stage)}` : ""}
                          </span>
                        )}
                      </p>
                      <time
                        dateTime={step.createdAt}
                        title={formatIstDateTime(step.createdAt)}
                        className="shrink-0 text-[10.5px] tabular-nums text-[var(--text-tertiary)]"
                      >
                        {formatIstTime(step.createdAt)}
                      </time>
                    </div>
                    {detail && (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                        <RichText text={detail} />
                      </p>
                    )}
                    {url && <p className="mt-0.5 truncate font-mono text-[10.5px] text-[var(--text-tertiary)]">{url}</p>}
                    {shot && (
                      <button
                        type="button"
                        onClick={() => onOpenImage(shot)}
                        className="mt-2 block overflow-hidden rounded-lg border border-[var(--border-strong)] transition-opacity hover:opacity-90"
                        aria-label="Open screenshot"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shot} alt={`Screenshot: ${step.title}`} className="max-h-48 w-auto" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </li>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-2.5 pl-11" aria-busy="true" aria-label="Loading activity">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="relative">
          <span className="absolute -left-11 top-2.5 h-[34px] w-[34px] animate-pulse rounded-xl bg-[var(--surface)]" />
          <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="h-2.5 w-20 rounded bg-[var(--surface)]" />
            <div className="mt-2 h-3.5 w-2/3 rounded bg-[var(--surface)]" />
            <div className="mt-2 h-3 w-5/6 rounded bg-[var(--surface)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
