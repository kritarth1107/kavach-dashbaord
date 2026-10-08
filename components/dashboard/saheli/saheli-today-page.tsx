"use client";

import Link from "next/link";
import {
  AlarmClock,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  HeartPulse,
  Loader2,
  MessageCircleQuestion,
  Pill,
  ShoppingBag,
  Smile,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { closeLoop, resolveFact, type CareEvent, type OpenLoop } from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import {
  AccessGate,
  CenteredState,
  PageSpinner,
  dayKeyLabel,
  formatIstDateTime,
  formatIstTime,
  istDayKey,
  isValidDayKey,
  shiftDayKey,
  useNow,
  useRecipientSelection,
} from "../activity/activity-shared";
import { Banner, SaheliHeader, btnPrimary, btnSecondary, useAction, useCareOverview } from "./saheli-shared";

type Meta = { label: string; icon: LucideIcon; tone: "green" | "yellow" | "blue" | "purple" | "red" };

function eventMeta(kind: string): Meta {
  if (kind.startsWith("dose_taken")) return { label: "Dose taken", icon: Pill, tone: "green" };
  if (kind.startsWith("dose_")) return { label: `Dose ${kind.slice(5).replace("_", " ")}`, icon: Pill, tone: "yellow" };
  if (kind === "reminder_sent") return { label: "Reminder sent", icon: AlarmClock, tone: "blue" };
  if (kind === "reminder_failed") return { label: "Reminder not delivered", icon: AlarmClock, tone: "red" };
  if (kind === "vital") return { label: "Vital", icon: HeartPulse, tone: "purple" };
  if (kind === "symptom") return { label: "Symptom", icon: HeartPulse, tone: "yellow" };
  if (kind === "mood") return { label: "Mood", icon: Smile, tone: "blue" };
  if (kind === "meal" || kind === "water") return { label: kind === "meal" ? "Meal" : "Water", icon: Utensils, tone: "green" };
  if (kind === "alert_whatsapp") return { label: "Caregiver alerted (WhatsApp)", icon: AlertTriangle, tone: "red" };
  if (kind === "alert_dashboard") return { label: "Noted for you", icon: BellRing, tone: "yellow" };
  if (kind.startsWith("task_")) return { label: `Order/ride ${kind.slice(5).replace("_", " ")}`, icon: ShoppingBag, tone: "blue" };
  if (kind.startsWith("fact_")) return { label: `Care record ${kind.slice(5)}`, icon: CheckCircle2, tone: "green" };
  if (kind === "dashboard_edit") return { label: "Edited on dashboard", icon: CheckCircle2, tone: "green" };
  return { label: kind.replace(/_/g, " "), icon: CircleDot, tone: "blue" };
}

const HIDDEN = new Set(["import_done", "memory_extract", "note_rewritten", "probe"]);

function needsYou(loop: OpenLoop) {
  return loop.kind === "confirm_fact";
}

export function SaheliTodayPage() {
  const sel = useRecipientSelection();
  const { familyId, selectedId, searchParams, setParams } = sel;
  const now = useNow();
  const today = istDayKey(new Date(now));
  const raw = searchParams.get("day");
  const day = isValidDayKey(raw) && raw <= today ? raw : today;
  const { data, error, loading, reload } = useCareOverview(familyId, selectedId, day, day === today ? 30_000 : 0);
  const { busy, banner, run } = useAction();

  const events = (data?.events ?? []).filter((e) => !HIDDEN.has(e.kind)).slice().reverse();
  const confirmations = (data?.loops ?? []).filter(needsYou);
  const following = (data?.loops ?? []).filter((l) => !needsYou(l));
  const liveTasks = (data?.tasks ?? []).filter((t) => ["queued", "running", "needs_input", "awaiting_confirm"].includes(t.status));

  return (
    <AccessGate
      familyId={sel.familyId}
      loading={sel.loading}
      isCaregiver={sel.isCaregiver}
      isRecipient={sel.isRecipient}
      recipients={sel.recipients}
      error={sel.error}
    >
      <div className="space-y-4">
        <SaheliHeader
          recipients={sel.recipients}
          selectedId={selectedId}
          onSelect={sel.select}
          title={(n) => `${n}'s Day`}
          subtitle="What actually happened, from Saheli's ledger: reminders sent, doses, vitals, alerts, orders. Updates every 30 seconds."
          badges={{ "/dashboard/saheli/care": data?.pending.length, "/dashboard/saheli/tasks": liveTasks.length }}
          actions={
            <div className="flex items-center gap-1">
              <button type="button" className={btnSecondary} aria-label="Previous day" onClick={() => setParams({ day: shiftDayKey(day, -1) })}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-[12px] font-bold text-[var(--text-secondary)]">{dayKeyLabel(day, today)}</span>
              <button
                type="button"
                className={btnSecondary}
                aria-label="Next day"
                disabled={day >= today}
                onClick={() => setParams({ day: shiftDayKey(day, 1) === today ? null : shiftDayKey(day, 1) })}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          }
        />
        <Banner banner={banner} />
        {loading && !data ? (
          <PageSpinner />
        ) : error && !data ? (
          <div className="panel-card">
            <CenteredState tone="error" title="Couldn't load Saheli's memory" body={error} action={<button className={btnPrimary} onClick={reload}>Try again</button>} />
          </div>
        ) : data ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <section className="panel-card p-5">
              <h2 className="flex items-center gap-2.5 text-[14px] font-medium text-[var(--text-primary)]"><span className="h-[14px] w-[14px] shrink-0 rounded-[4px] bg-[var(--c-accent)]" aria-hidden />Timeline</h2>
              {events.length === 0 ? (
                <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">Nothing logged yet for this day: no reminders sent, no doses marked.</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {events.map((e) => (
                    <TimelineRow key={e.id} event={e} />
                  ))}
                </ol>
              )}
            </section>
            <aside className="space-y-4">
              {confirmations.length > 0 && (
                <section className="panel-card p-5">
                  <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--text-primary)]">
                    <AlertTriangle className="h-4 w-4 text-[var(--warning-text)]" /> Needs your OK
                  </h2>
                  <ul className="mt-3 space-y-3">
                    {confirmations.map((l) => {
                      const key = String(l.detail?.key ?? "");
                      return (
                        <li key={l.id} className="rounded-2xl bg-[var(--surface)] p-3">
                          <p className="text-[12px] font-semibold text-[var(--text-primary)]">{l.title}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              className={btnPrimary}
                              disabled={busy === l.id}
                              onClick={() => run(l.id, () => resolveFact(familyId!, selectedId!, key, true), "Approved. Saheli uses it from now on.").then(reload)}
                            >
                              {busy === l.id && <Loader2 className="h-3 w-3 animate-spin" />} Approve
                            </button>
                            <button
                              className={btnSecondary}
                              disabled={busy === l.id}
                              onClick={() => run(l.id, () => resolveFact(familyId!, selectedId!, key, false), "Rejected. Nothing changed.").then(reload)}
                            >
                              Reject
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
              {liveTasks.length > 0 && (
                <section className="panel-card p-5">
                  <h2 className="flex items-center gap-2.5 text-[14px] font-medium text-[var(--text-primary)]"><span className="h-[14px] w-[14px] shrink-0 rounded-[4px] bg-[var(--c-accent)]" aria-hidden />Orders & rides in progress</h2>
                  <ul className="mt-3 space-y-2">
                    {liveTasks.map((t) => (
                      <li key={t.id} className="text-[12px] text-[var(--text-secondary)]">
                        <span className="font-bold text-[var(--text-primary)]">{t.serviceLabel}</span> · {t.goal}
                        {t.inputNeeded && <span className="status-pill-pending ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold">needs {t.inputNeeded === "go" ? "go-ahead" : t.inputNeeded}</span>}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/dashboard/saheli/tasks?recipient=${selectedId}`} className="mt-3 inline-block text-[12px] font-bold text-primary">
                    Open orders & rides →
                  </Link>
                </section>
              )}
              <section className="panel-card p-5">
                <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--text-primary)]">
                  <MessageCircleQuestion className="h-4 w-4 text-primary" /> Saheli is following up on
                </h2>
                {following.length === 0 ? (
                  <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">Nothing open right now.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {following.map((l) => (
                      <li key={l.id} className="rounded-2xl bg-[var(--surface)] p-3">
                        <p className="text-[12px] font-semibold text-[var(--text-primary)]">{l.title}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                          {l.wakeAt ? `Checks again ${formatIstDateTime(l.wakeAt)}` : `Opened ${formatIstDateTime(l.createdAt)}`}
                          {l.rule === "alert_caregiver" ? " · tells you if no answer" : ""}
                        </p>
                        <button
                          className={cn(btnSecondary, "mt-2")}
                          disabled={busy === l.id}
                          onClick={() => run(l.id, () => closeLoop(familyId!, selectedId!, l.id, "resolved by caregiver"), "Closed.").then(reload)}
                        >
                          Mark resolved
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </AccessGate>
  );
}

function TimelineRow({ event }: { event: CareEvent }) {
  const meta = eventMeta(event.kind);
  const Icon = meta.icon;
  return (
    <li className="flex gap-3">
      <span className={cn(`icon-chip-${meta.tone}`, "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl")}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[12px] font-bold text-[var(--text-primary)]">{meta.label}</p>
          <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">{formatIstTime(event.at)}</span>
        </div>
        {event.summary && <p className="mt-0.5 break-words text-[12px] leading-relaxed text-[var(--text-secondary)]">{event.summary}</p>}
      </div>
    </li>
  );
}
