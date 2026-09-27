"use client";

import { AlertCircle, BookHeart, CheckCircle2, Clock3, Hourglass, Loader2, PackageCheck, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import {
  decideSaheliApproval,
  dismissSaheliTask,
  forgetSaheliWhy,
  getDelegateSummary,
  updateSaheliPermissions,
  type DelegateSummary,
  type DelegateTask,
  type PermissionPatch,
} from "@/lib/delegate-api";
import { SaheliPermissionsView } from "./saheli-permissions-card";

const when = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff >= 0 && diff < 60) return `${Math.max(1, Math.round(diff))}m ago`;
  if (diff < 0 && diff > -720) return `in ${Math.round(-diff / 60) || 1}h`;
  return d.toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
};
const OUTCOME: Record<string, { label: string; tone: string }> = {
  arrived: { label: "Arrived", tone: "bg-emerald-100 text-emerald-800" },
  started: { label: "Started ✓", tone: "bg-emerald-100 text-emerald-800" },
  reached: { label: "Reached safely", tone: "bg-emerald-100 text-emerald-800" },
  not_arrived: { label: "Not arrived", tone: "bg-amber-100 text-amber-800" },
  wrong_item: { label: "Wrong item", tone: "bg-rose-100 text-rose-800" },
  damaged: { label: "Damaged", tone: "bg-rose-100 text-rose-800" },
  not_started: { label: "Not started yet", tone: "bg-amber-100 text-amber-800" },
  doctor_stopped: { label: "Doctor stopped it", tone: "bg-slate-200 text-slate-700" },
  cancelled: { label: "Cancelled", tone: "bg-slate-100 text-slate-600" },
  unanswered: { label: "No reply", tone: "bg-slate-100 text-slate-600" },
  resumed: { label: "Resumed", tone: "bg-sky-100 text-sky-800" },
  declined: { label: "She said leave it", tone: "bg-slate-100 text-slate-600" },
  placed: { label: "Ordered", tone: "bg-emerald-100 text-emerald-800" },
  approved: { label: "You approved", tone: "bg-emerald-100 text-emerald-800" },
  denied: { label: "You said no", tone: "bg-slate-100 text-slate-600" },
  expired: { label: "Expired", tone: "bg-slate-100 text-slate-500" },
};
const STAGE: Record<string, string> = { delivery: "Did it arrive?", started: "Has she started it?", ride: "Did she reach?" };
const WHY_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "current", tone: "bg-emerald-50 text-emerald-700" },
  stopped: { label: "stopped", tone: "bg-slate-200 text-slate-700" },
  paused: { label: "paused", tone: "bg-amber-50 text-amber-700" },
};

/** Store SKU names carry pack details in brackets — keep the part people say. */
const tidy = (s: string | null | undefined) => (s || "").replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
/** "*confirm*" → bold confirm (WhatsApp-style emphasis in Saheli's wording). */
const rich = (s: string) => s.split(/\*(.+?)\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));

function Pill({ label, tone }: { label: string; tone: string }) {
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>{label}</span>;
}

function WhyLine({ why }: { why: string | null }) {
  if (!why) return null;
  return <p className="mt-0.5 text-[12px] italic text-[var(--text-secondary)]">Why: {why}</p>;
}

/** Open loops Saheli is carrying for her: approvals, unfinished tasks, delivery / medicine checks, and why things matter. */
const REASON_LABEL: Record<string, string> = {
  category_off: "Switched off in permissions",
  store_off: "Store not allowed",
  over_limit: "Above your spend limit",
};

export function SaheliDelegateView({
  recipientName,
  data,
  busy,
  onDecide,
  onDismiss,
  onForget,
}: {
  recipientName: string;
  data: DelegateSummary;
  busy?: string | null;
  onDecide?: (t: DelegateTask, d: "approve" | "deny") => void;
  onDismiss?: (t: DelegateTask) => void;
  onForget?: (whyId: string) => void;
}) {
  const nothing = !data.approvals.length && !data.openTasks.length && !data.followups.length && !data.whys.length && !data.recent.length;
  return (
    <section className="panel-card mb-6 overflow-hidden" data-testid="saheli-delegate">
      <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-4">
        <PackageCheck className="h-4 w-4 text-primary" strokeWidth={2.25} />
        <div className="flex-1">
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">What Saheli is following up for {recipientName}</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Unfinished orders she&apos;ll pick up where {recipientName} left off, deliveries she&apos;ll check on, and why each one matters.
          </p>
        </div>
      </div>
      {nothing ? (
        <p className="px-5 py-6 text-[13px] text-[var(--text-secondary)]">Nothing open right now. After an order, Saheli checks it arrived and notes why it mattered here.</p>
      ) : (
        <div className="divide-y divide-[var(--border-strong)]">
          {data.approvals.length > 0 && (
            <div className="bg-amber-50/60 px-5 py-4" data-testid="delegate-approvals">
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-amber-800">
                <AlertCircle className="h-3.5 w-3.5" /> Needs your OK
              </h3>
              <ul className="space-y-3">
                {data.approvals.map((t) => (
                  <li key={t.taskId} className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{t.approval?.detail || t.title}</p>
                      <p className="text-[11.5px] text-[var(--text-secondary)]">
                        {REASON_LABEL[t.approval?.reason || ""] || "Outside what Saheli can do"} · asked {when(t.createdAt)}
                      </p>
                      <WhyLine why={t.why} />
                    </div>
                    {onDecide && (
                      <div className="flex gap-2">
                        <button type="button" disabled={busy === t.taskId} onClick={() => onDecide(t, "approve")} className="rounded-md bg-emerald-600 px-3 py-1 text-[12px] font-bold text-white disabled:opacity-50">
                          {busy === t.taskId ? "…" : "Approve"}
                        </button>
                        <button type="button" disabled={busy === t.taskId} onClick={() => onDecide(t, "deny")} className="rounded-md border border-[var(--border-strong)] bg-white px-3 py-1 text-[12px] font-bold text-[var(--text-primary)] disabled:opacity-50">
                          Not now
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-amber-900/70">Approving lets Saheli offer it to {recipientName} again. She still sees the price and types confirm; cash on delivery only.</p>
            </div>
          )}

          {data.openTasks.length > 0 && (
            <div className="px-5 py-4" data-testid="delegate-open-tasks">
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                <Hourglass className="h-3.5 w-3.5" /> Unfinished — Saheli will offer to finish
              </h3>
              <ul className="space-y-2.5">
                {data.openTasks.map((t) => (
                  <li key={t.taskId} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[var(--text-primary)]">
                        <b>{tidy(t.title)}</b>
                        {t.whereStopped && <span className="text-[var(--text-secondary)]"> · stopped when {rich(t.whereStopped)}</span>}
                        {t.byCaregiver && <span className="text-[var(--text-secondary)]"> · your own chat</span>}
                      </p>
                      <p className="text-[11.5px] text-[var(--text-secondary)]">
                        Left {when(t.lastActiveAt)}
                        {t.resumeOfferedAt ? ` · offered to resume ${when(t.resumeOfferedAt)}` : ""}
                        {t.nudgedAt ? ` · reminded ${when(t.nudgedAt)}` : ""} · clears {when(t.expiresAt)}
                      </p>
                      <WhyLine why={t.why} />
                    </div>
                    {onDismiss && (
                      <button type="button" title="Drop this task" disabled={busy === t.taskId} onClick={() => onDismiss(t)} className="rounded p-1 text-[var(--text-secondary)] hover:bg-slate-100">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.followups.length > 0 && (
            <div className="px-5 py-4" data-testid="delegate-followups">
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                <Clock3 className="h-3.5 w-3.5" /> Checking on
              </h3>
              <ul className="space-y-2.5">
                {data.followups.map((t) => (
                  <li key={t.taskId} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[var(--text-primary)]">
                        <b>{tidy(t.item)}</b>
                        {t.partner && <span className="text-[var(--text-secondary)]"> · {t.partner}</span>}
                        <span className="text-[var(--text-secondary)]"> · {STAGE[t.stage || "delivery"] || "Follow-up"}</span>
                      </p>
                      <p className="text-[11.5px] text-[var(--text-secondary)]">
                        {t.status === "asked" ? `Asked ${when(t.askedAt)}${t.askCount > 1 ? " (twice)" : ""}, waiting for her reply` : `Will ask ${when(t.dueAt)}`}
                        {t.outcome === "not_arrived" ? " · wasn't there when she last checked" : ""}
                      </p>
                      {t.lastSaheliLine && t.status === "asked" && <p className="mt-0.5 text-[12px] text-[var(--text-primary)]">“{t.lastSaheliLine}”</p>}
                      <WhyLine why={t.why} />
                    </div>
                    {onDismiss && (
                      <button type="button" title="Stop checking" disabled={busy === t.taskId} onClick={() => onDismiss(t)} className="rounded p-1 text-[var(--text-secondary)] hover:bg-slate-100">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.whys.length > 0 && (
            <div className="px-5 py-4" data-testid="delegate-whys">
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                <BookHeart className="h-3.5 w-3.5" /> Why it matters — Saheli remembers
              </h3>
              <ul className="space-y-3">
                {data.whys.map((y) => (
                  <li key={y.whyId} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--text-primary)]">
                        <b>{tidy(y.subject)}</b>
                        <Pill {...(WHY_STATUS[y.status] || WHY_STATUS.active)} />
                        {y.importance === "high" && <Pill label="important" tone="bg-rose-50 text-rose-700" />}
                      </p>
                      <p className="text-[12.5px] text-[var(--text-primary)]">{y.reason}</p>
                      {y.updates.length > 0 && (
                        <ul className="mt-1 space-y-0.5 border-l-2 border-[var(--border-strong)] pl-2">
                          {y.updates.slice(0, 3).map((u, i) => (
                            <li key={i} className="text-[11.5px] text-[var(--text-secondary)]">
                              {when(u.at)} · {u.note}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {onForget && (
                      <button type="button" title="Forget this" disabled={busy === y.whyId} onClick={() => onForget(y.whyId)} className="rounded p-1 text-[var(--text-secondary)] hover:bg-slate-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.recent.length > 0 && (
            <div className="px-5 py-4" data-testid="delegate-recent">
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                <CheckCircle2 className="h-3.5 w-3.5" /> What actually happened
              </h3>
              <ul className="space-y-1.5">
                {data.recent.slice(0, 8).map((t) => {
                  const key = t.kind === "approval" ? t.status : t.outcome || t.status;
                  const o = OUTCOME[key] || { label: key.replace(/_/g, " "), tone: "bg-slate-100 text-slate-600" };
                  return (
                    <li key={t.taskId} className="flex items-start gap-2 text-[12.5px]">
                      <Pill {...o} />
                      <span className="flex-1 text-[var(--text-primary)]">
                        {t.kind === "approval" ? t.approval?.detail || t.title : tidy(t.item || t.title)}
                        {t.outcomeNote && <span className="text-[var(--text-secondary)]"> — {t.outcomeNote}</span>}
                      </span>
                      <span className="shrink-0 text-[11px] text-[var(--text-secondary)]">{when(t.resolvedAt || t.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Loads the delegate summary once and renders both cards (permissions + follow-ups / why memory). */
export function SaheliDelegateCards({ recipientUserId, recipientName }: { recipientUserId: string; recipientName: string }) {
  const { activeFamilyId } = useFamily();
  const [data, setData] = useState<DelegateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fid = activeFamilyId || "";

  const load = useCallback(async () => {
    if (!fid) return;
    try {
      setData(await getDelegateSummary(fid, recipientUserId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load");
    } finally {
      setLoading(false);
    }
  }, [fid, recipientUserId]);

  useEffect(() => {
    if (!fid) return;
    let alive = true;
    getDelegateSummary(fid, recipientUserId)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Couldn't load"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fid, recipientUserId]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <section className="panel-card mb-6 flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
      </section>
    );
  }
  if (!data) return error ? <p className="mb-6 text-[12px] text-rose-700">Saheli follow-ups: {error}</p> : null;

  const onPatch = (patch: PermissionPatch, key: string) =>
    run(key, async () => {
      const next = await updateSaheliPermissions(fid, recipientUserId, patch);
      if (next?.permissions) setData(next);
    });

  return (
    <>
      <SaheliDelegateView
        recipientName={recipientName}
        data={data}
        busy={busy}
        onDecide={(t, d) => run(t.taskId, () => decideSaheliApproval(fid, t.taskId, d))}
        onDismiss={(t) => run(t.taskId, () => dismissSaheliTask(fid, t.taskId))}
        onForget={(whyId) => run(whyId, () => forgetSaheliWhy(fid, recipientUserId, whyId))}
      />
      <SaheliPermissionsView key={data.permissions.updatedAt || "p"} recipientName={recipientName} perms={data.permissions} onPatch={onPatch} busyKey={busy} error={error} />
    </>
  );
}
