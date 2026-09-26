"use client";

import { AlertTriangle, Check, Eye, HeartPulse, Loader2, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  confirmProfileFact,
  dismissProfileItem,
  editProfileFact,
  getRecipientProfile,
  rejectProfileFact,
  setCareActionStatus,
  setProfileRetention,
  type RecipientProfile,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { formatWhen } from "./morning-briefing-card";

const CATEGORY: Record<string, string> = {
  health: "Health",
  wellbeing: "Pain, sleep & appetite",
  mood: "Mood & company",
  medicines: "Medicines",
  routine: "Routine",
  people: "Family & people",
  cognition: "Memory cues",
  comfort: "What comforts her",
  communication: "What works when talking",
  preferences: "Food & shopping",
};
const ACTION: Record<string, { label: string; tone: string }> = {
  follow_up: { label: "Follow up", tone: "bg-sky-100 text-sky-800" },
  reminder: { label: "Gentle reminder", tone: "bg-emerald-100 text-emerald-800" },
  company: { label: "Keep company", tone: "bg-violet-100 text-violet-800" },
  offer: { label: "Offer (she decides)", tone: "bg-amber-100 text-amber-800" },
  caregiver_suggestion: { label: "For you", tone: "bg-rose-100 text-rose-800" },
};
const UNUSUAL: Record<string, string> = {
  repeat_order: "Repeated order",
  bulk_quantity: "Large quantity",
  large_spend: "Large spend",
  risky_meds: "Medicine order paused",
  odd_hours: "Odd hours",
  order_change: "Change in orders",
  confusion: "Possible confusion",
  mood_drop: "Mood drop",
  meds_missed: "Medicines missed",
  scam: "Possible scam",
  other: "Pattern change",
};
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const pct = (v: number | null | undefined) => (v == null ? "—" : `${v}%`);

/** What Saheli has learned about her (care first), tomorrow's care actions, unusual activity, progress. */
export function WhatSaheliLearnedCard({ recipientUserId, recipientName }: { recipientUserId: string; recipientName: string }) {
  const { activeFamilyId } = useFamily();
  const [data, setData] = useState<RecipientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    if (!activeFamilyId) return;
    let alive = true;
    getRecipientProfile(activeFamilyId, recipientUserId)
      .then(({ data }) => alive && (setData(data ?? null), setError(null)))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Couldn't load"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [activeFamilyId, recipientUserId]);

  const act = async (id: string, fn: () => Promise<{ data?: RecipientProfile }>) => {
    setBusy(id);
    try {
      const r = await fn();
      if (r.data) setData(r.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  };
  const fid = activeFamilyId || "";
  const m = data?.metrics?.[data.metrics.length - 1];
  const factCount = data?.groups.reduce((n, g) => n + g.facts.length, 0) ?? 0;
  const forHer = (data?.careActions || []).filter((a) => a.audience === "elder");
  const forYou = (data?.careActions || []).filter((a) => a.audience === "caregiver");

  return (
    <section className="panel-card mb-6 overflow-hidden" data-testid="what-saheli-learned">
      <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-4">
        <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.25} />
        <div className="flex-1">
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">What Saheli learned about {recipientName}</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Learned each night from her chats, reminders and routine. Confirm what&apos;s right, fix or delete what isn&apos;t. Deleted items are never re-learned. None of this changes safety rules.
          </p>
        </div>
        {data?.lastReflection && <span className="text-[11px] text-[var(--text-secondary)]">Updated {formatWhen(data.lastReflection.at)}</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
        </div>
      ) : !data || (!factCount && !data.careActions.length && !data.unusual.length) ? (
        <p className="px-5 py-6 text-[13px] text-[var(--text-secondary)]">
          Nothing learned yet. After a few days of chatting, Saheli will note her health, routine and what she enjoys here.
        </p>
      ) : (
        <div className="divide-y divide-[var(--border-strong)]">
          {data.unusual.length > 0 && (
            <div className="px-5 py-4" data-testid="unusual-activity">
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" /> Unusual activity
              </h3>
              <ul className="space-y-2">
                {data.unusual.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-[13px]">
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${a.tier === "whatsapp" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
                      {a.tier === "whatsapp" ? (a.status === "queued" ? "WhatsApp at 8 am" : "WhatsApp sent") : "Dashboard only"}
                    </span>
                    <span className="flex-1 text-[var(--text-primary)]">
                      <b>{UNUSUAL[a.category] || a.category}</b> · {a.text}
                      <span className="ml-1 text-[11px] text-[var(--text-secondary)]">({Math.round(a.confidence * 100)}% · {formatWhen(a.at)})</span>
                    </span>
                    <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Dismiss" disabled={busy === a.id} onClick={() => act(a.id, () => dismissProfileItem(fid, recipientUserId, "alerts", a.id))}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.careActions.length > 0 && (
            <div className="px-5 py-4" data-testid="care-actions">
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                <HeartPulse className="h-3.5 w-3.5" /> Care plan for today
              </h3>
              <ul className="space-y-2">
                {[...forYou, ...forHer].map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-[13px]">
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${ACTION[a.kind]?.tone || "bg-slate-100"}`}>{ACTION[a.kind]?.label || a.kind}</span>
                    <span className="flex-1">
                      <span className="text-[var(--text-primary)]">{a.text}</span>
                      {a.say && <span className="block text-[12px] italic text-[var(--text-secondary)]">Saheli will say: “{a.say}”</span>}
                      <span className="block text-[11px] text-[var(--text-secondary)]">Why: {a.why}{a.status === "used" ? " · sent" : ""}</span>
                    </span>
                    {a.status === "planned" && (
                      <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Skip this" disabled={busy === a.id} onClick={() => act(a.id, () => setCareActionStatus(fid, recipientUserId, a.id, "dismissed"))}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-[var(--text-secondary)]">Offers are only offers: Saheli never orders or books anything unless she asks and confirms.</p>
            </div>
          )}

          {data.groups.map((g) => (
            <div key={g.category} className="px-5 py-3">
              <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{CATEGORY[g.category] || g.category}</h3>
              <ul className="space-y-1.5">
                {g.facts.map((f) => (
                  <li key={f.id} className="flex items-start gap-2 text-[13px]">
                    {editing?.id === f.id ? (
                      <form
                        className="flex flex-1 gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const t = editing.text.trim();
                          if (t) void act(f.id, () => editProfileFact(fid, recipientUserId, f.id, t)).then(() => setEditing(null));
                        }}
                      >
                        <input className="flex-1 rounded border border-[var(--border-strong)] px-2 py-1 text-[13px]" value={editing.text} onChange={(e) => setEditing({ id: f.id, text: e.target.value })} autoFocus />
                        <button type="submit" className="text-primary"><Check className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
                      </form>
                    ) : (
                      <>
                        <span className="flex-1 text-[var(--text-primary)]">
                          {f.text}
                          <span className="ml-1.5 text-[11px] text-[var(--text-secondary)]">
                            {f.status === "learned" ? `${Math.round(f.confidence * 100)}% sure` : f.status === "caregiver_confirmed" ? "✓ confirmed" : "✎ edited by family"} · {day(f.lastConfirmed)}
                          </span>
                        </span>
                        {f.status === "learned" && (
                          <button title="Confirm" className="text-emerald-600" disabled={busy === f.id} onClick={() => act(f.id, () => confirmProfileFact(fid, recipientUserId, f.id))}>
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button title="Edit" className="text-[var(--text-secondary)]" onClick={() => setEditing({ id: f.id, text: f.text })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button title="Delete (never re-learn)" className="text-rose-600" disabled={busy === f.id} onClick={() => act(f.id, () => rejectProfileFact(fid, recipientUserId, f.id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {data.deviations.length > 0 && (
            <div className="px-5 py-3" data-testid="deviations">
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                <Eye className="h-3.5 w-3.5" /> Watching (vs her usual)
              </h3>
              <ul className="space-y-1">
                {data.deviations.slice(0, 4).map((d) => (
                  <li key={d.id} className="flex items-start gap-2 text-[13px] text-[var(--text-primary)]">
                    <span className="flex-1">{d.text} <span className="text-[11px] text-[var(--text-secondary)]">{d.dayKey}</span></span>
                    <button title="Dismiss" className="text-[var(--text-secondary)]" onClick={() => act(d.id, () => dismissProfileItem(fid, recipientUserId, "deviations", d.id))}><X className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
              {!data.baselineWhatsAppReady && (
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Learning her usual pattern ({data.baselineDays}/7 days) — pattern changes stay on the dashboard until then.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 px-5 py-4 text-center sm:grid-cols-5" data-testid="progress-metrics">
            {[
              ["Reminder replies", pct(m?.nudgeReplyRate)],
              ["Medicines taken", pct(m?.adherence)],
              ["First-card orders", pct(m?.firstCardSuccess)],
              ["Corrections", pct(m?.correctionRate)],
              ["Family edits", pct(m?.caregiverEditRate)],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[16px] font-extrabold text-[var(--text-primary)]">{v}</div>
                <div className="text-[11px] text-[var(--text-secondary)]">{k} · this week</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-[12px] text-[var(--text-secondary)]">
            <span>Keep what Saheli learns for</span>
            <select
              className="rounded border border-[var(--border-strong)] bg-transparent px-1.5 py-0.5"
              value={data.retentionDays}
              disabled={busy === "retention"}
              onChange={(e) => act("retention", () => setProfileRetention(fid, recipientUserId, Number(e.target.value)))}
            >
              {[30, 90, 180, 365, 730].map((d) => (
                <option key={d} value={d}>{d < 365 ? `${d} days` : d === 365 ? "1 year" : "2 years"}</option>
              ))}
            </select>
            <span>· visible only to this family{data.rejectedCount ? ` · ${data.rejectedCount} deleted item(s) won't be re-learned` : ""}</span>
          </div>
        </div>
      )}
      {error && <p className="border-t border-[var(--border-strong)] px-5 py-2 text-[12px] text-rose-600">{error}</p>}
    </section>
  );
}
