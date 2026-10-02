"use client";

import { History, Loader2, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DOMAIN_ORDER,
  DOMAIN_TITLE,
  SOURCE_LABEL,
  getFactHistory,
  resolveFact,
  saveFact,
  stopFact,
  type CareFact,
} from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import { AccessGate, CenteredState, PageSpinner, formatIstDateTime, useRecipientSelection } from "../activity/activity-shared";
import { Banner, SaheliHeader, btnDanger, btnPrimary, btnSecondary, useAction, useCareOverview } from "./saheli-shared";

type Draft = {
  domain: string;
  name: string;
  sentence: string;
  dose: string;
  times: string;
  foodTiming: string;
  callAs: string;
  avoid: string;
  editingKey?: string;
};

const EMPTY: Draft = { domain: "medicine", name: "", sentence: "", dose: "", times: "", foodTiming: "", callAs: "", avoid: "", editingKey: undefined };

const FOOD = [
  ["", "Any time"],
  ["before_food", "Before food"],
  ["after_food", "After food"],
  ["with_food", "With food"],
  ["empty_stomach", "Empty stomach"],
] as const;

function parseTimes(text: string): string[] | null {
  const parts = text.split(/[,\s]+/).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const m = p.match(/^(\d{1,2}):(\d{2})$/);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
    out.push(`${m[1].padStart(2, "0")}:${m[2]}`);
  }
  return [...new Set(out)].sort();
}

function draftFrom(f: CareFact): Draft {
  const v = f.value as { name?: string; dose?: string; times?: string[]; food_timing?: string; avoid?: string[] };
  return {
    callAs: f.domain === "naming" ? (v.name ?? "") : "",
    avoid: f.domain === "naming" ? (v.avoid ?? []).join(", ") : "",
    domain: f.domain,
    name: (v.name as string) || f.name.replace(/_/g, " "),
    sentence: f.text,
    dose: v.dose ?? "",
    times: (v.times ?? []).join(", "),
    foodTiming: v.food_timing ?? "",
    editingKey: f.key,
  };
}

export function SaheliCarePage() {
  const sel = useRecipientSelection();
  const { familyId, selectedId } = sel;
  const { data, error, loading, reload } = useCareOverview(familyId, selectedId);
  const { busy, banner, run } = useAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [history, setHistory] = useState<{ key: string; versions: CareFact[] } | null>(null);

  const grouped = useMemo(() => {
    const g = new Map<string, CareFact[]>();
    for (const f of data?.facts ?? []) {
      if (f.status !== "active") continue;
      g.set(f.domain, [...(g.get(f.domain) ?? []), f]);
    }
    return DOMAIN_ORDER.filter((d) => g.has(d)).map((d) => [d, g.get(d)!] as const);
  }, [data]);
  const pending = data?.pending ?? [];
  const activeByKey = useMemo(() => new Map((data?.facts ?? []).filter((f) => f.status === "active").map((f) => [f.key, f])), [data]);

  async function submit() {
    if (!draft || !familyId || !selectedId) return;
    const details: Record<string, unknown> = {};
    if (draft.domain === "medicine") {
      const times = parseTimes(draft.times);
      if (!times) {
        await run("form", () => Promise.reject(new Error("Times must look like 08:30, 21:00 (24-hour).")));
        return;
      }
      Object.assign(details, { name: draft.name.trim(), dose: draft.dose.trim() || undefined, times, food_timing: draft.foodTiming || undefined });
    } else if (draft.domain === "allergy") {
      details.allergen = draft.name.trim();
    } else if (draft.domain === "naming") {
      details.name = draft.callAs.trim() || undefined;
      details.avoid = draft.avoid.split(",").map((w) => w.trim()).filter(Boolean);
    }
    const name = draft.domain === "naming" && !draft.editingKey ? "address_as" : draft.name.trim();
    const sentence =
      draft.sentence.trim() ||
      (draft.domain === "naming"
        ? [draft.callAs.trim() && `Call them ${draft.callAs.trim()}`, draft.avoid.trim() && `never "${draft.avoid.trim()}"`].filter(Boolean).join(", ")
        : draft.domain === "medicine"
        ? `${draft.name.trim()}${draft.dose ? ` ${draft.dose.trim()}` : ""} at ${parseTimes(draft.times)?.join(", ") || "no set time"}`
        : draft.name.trim());
    const ok = await run(
      "form",
      () => saveFact(familyId, selectedId, { domain: draft.domain, name, details, sentence }),
      draft.domain === "medicine" ? "Saved. Reminders follow these times from now on." : "Saved. Saheli uses it from her next message.",
    );
    if (ok) {
      setDraft(null);
      reload();
    }
  }

  async function openHistory(key: string) {
    if (!familyId || !selectedId) return;
    await run(`h:${key}`, async () => setHistory({ key, versions: await getFactHistory(familyId, selectedId, key) }));
  }

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
          title={(n) => `${n}'s care record`}
          subtitle="What Saheli treats as true: medicines, allergies, diet, naming and family rules. Every change keeps its history and where it came from."
          badges={{ "/dashboard/saheli/care": pending.length }}
          actions={
            <button type="button" className={btnPrimary} onClick={() => setDraft({ ...EMPTY })}>
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          }
        />
        <Banner banner={banner} />

        {draft && (
          <section className="panel-card p-5" aria-label="Edit care record">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">{draft.editingKey ? "Change" : "Add to the care record"}</h2>
              <button type="button" aria-label="Close" onClick={() => setDraft(null)} className="text-[var(--text-tertiary)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                Type
                <select
                  className="theme-field mt-1 w-full"
                  value={draft.domain}
                  disabled={Boolean(draft.editingKey)}
                  onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
                >
                  {DOMAIN_ORDER.map((d) => (
                    <option key={d} value={d}>
                      {DOMAIN_TITLE[d]}
                    </option>
                  ))}
                </select>
              </label>
              {draft.domain === "naming" ? (
                <>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                    Call them
                    <input className="theme-field mt-1 w-full" value={draft.callAs} placeholder="Leela ji" onChange={(e) => setDraft({ ...draft, callAs: e.target.value })} />
                  </label>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] sm:col-span-2">
                    Never call them (comma separated)
                    <input className="theme-field mt-1 w-full" value={draft.avoid} placeholder="maa, aunty" onChange={(e) => setDraft({ ...draft, avoid: e.target.value })} />
                  </label>
                </>
              ) : (
              <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                {draft.domain === "medicine" ? "Medicine" : draft.domain === "allergy" ? "Allergic to" : "Name"}
                <input
                  className="theme-field mt-1 w-full"
                  value={draft.name}
                  disabled={Boolean(draft.editingKey)}
                  placeholder={draft.domain === "medicine" ? "Metformin" : draft.domain === "naming" ? "address_as" : ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              )}
              {draft.domain === "medicine" && (
                <>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                    Dose
                    <input className="theme-field mt-1 w-full" value={draft.dose} placeholder="500 mg" onChange={(e) => setDraft({ ...draft, dose: e.target.value })} />
                  </label>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                    Times (24-hour, IST)
                    <input className="theme-field mt-1 w-full" value={draft.times} placeholder="08:30, 21:00" onChange={(e) => setDraft({ ...draft, times: e.target.value })} />
                  </label>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                    Food timing
                    <select className="theme-field mt-1 w-full" value={draft.foodTiming} onChange={(e) => setDraft({ ...draft, foodTiming: e.target.value })}>
                      {FOOD.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label className="text-[11px] font-bold text-[var(--text-secondary)] sm:col-span-2">
                In one sentence {draft.domain === "medicine" || draft.domain === "naming" ? "(optional)" : ""}
                <input
                  className="theme-field mt-1 w-full"
                  value={draft.sentence}
                  placeholder={draft.domain === "naming" ? "Call her Leela ji, never 'maa'" : "What Saheli should know"}
                  onChange={(e) => setDraft({ ...draft, sentence: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={
                  busy === "form" ||
                  (draft.domain === "naming"
                    ? !draft.callAs.trim() && !draft.avoid.trim()
                    : !draft.name.trim() || (draft.domain !== "medicine" && !draft.sentence.trim()))
                }
                onClick={submit}
              >
                {busy === "form" && <Loader2 className="h-3 w-3 animate-spin" />} Save
              </button>
              <button type="button" className={btnSecondary} onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </section>
        )}

        {loading && !data ? (
          <PageSpinner />
        ) : error && !data ? (
          <div className="panel-card">
            <CenteredState tone="error" title="Couldn't load the care record" body={error} />
          </div>
        ) : data ? (
          <>
            {pending.length > 0 && (
              <section className="panel-card p-5">
                <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--text-primary)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--warning-text)]" /> Waiting for your OK
                </h2>
                <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                  Changes to medicines, allergies or conditions that came from a chat do not take effect until a caregiver approves.
                </p>
                <ul className="mt-3 space-y-3">
                  {pending.map((f) => {
                    const current = activeByKey.get(f.key);
                    return (
                      <li key={f.id} className="rounded-2xl bg-[var(--surface)] p-3">
                        <p className="text-[12px] font-bold text-[var(--text-primary)]">{f.text}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                          {SOURCE_LABEL[f.source] ?? f.source} · {formatIstDateTime(f.recordedAt)}
                          {current ? ` · now: ${current.text}` : " · new"}
                          {f.note ? ` · ${f.note}` : ""}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            className={btnPrimary}
                            disabled={busy === f.id}
                            onClick={() => run(f.id, () => resolveFact(familyId!, selectedId!, f.key, true), "Approved.").then(reload)}
                          >
                            Approve
                          </button>
                          <button
                            className={btnSecondary}
                            disabled={busy === f.id}
                            onClick={() => run(f.id, () => resolveFact(familyId!, selectedId!, f.key, false), "Rejected. The record is unchanged.").then(reload)}
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

            {grouped.length === 0 ? (
              <div className="panel-card">
                <CenteredState
                  title="Nothing saved yet"
                  body="Add medicines, allergies and diet here, or tell Saheli on WhatsApp. She never guesses what is not on this record."
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {grouped.map(([domain, facts]) => (
                  <section key={domain} className={cn("panel-card p-5", (domain === "medicine" || domain === "allergy") && "md:col-span-2")}>
                    <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">{DOMAIN_TITLE[domain] ?? domain}</h2>
                    <ul className="mt-3 divide-y divide-[var(--border)]">
                      {facts.map((f) => (
                        <li key={f.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-[13px] font-semibold text-[var(--text-primary)]">{f.text}</p>
                            <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                              {SOURCE_LABEL[f.source] ?? f.source}
                              {f.source === "elder_said" && !f.confirmedBy ? " · not confirmed" : ""} · since {formatIstDateTime(f.validFrom)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <button className={btnSecondary} aria-label="History" disabled={busy === `h:${f.key}`} onClick={() => openHistory(f.key)}>
                              <History className="h-3.5 w-3.5" />
                            </button>
                            <button className={btnSecondary} aria-label="Change" onClick={() => setDraft(draftFrom(f))}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className={btnDanger}
                              aria-label="Remove"
                              disabled={busy === `s:${f.id}`}
                              onClick={() => {
                                if (!window.confirm(`Remove "${f.text}"? It stays in the history.`)) return;
                                void run(
                                  `s:${f.id}`,
                                  () => stopFact(familyId!, selectedId!, { domain: f.domain, name: f.name, reason: "removed by caregiver" }),
                                  f.domain === "medicine" ? "Removed. Its reminders are switched off." : "Removed.",
                                ).then(reload);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </>
        ) : null}

        {history && (
          <div role="dialog" aria-modal="true" aria-label="History" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHistory(null)}>
            <div className="theme-modal w-full max-w-lg rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">History</h2>
                <button type="button" aria-label="Close" onClick={() => setHistory(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-3">
                {history.versions
                  .slice()
                  .reverse()
                  .map((v) => (
                    <li key={v.id} className="rounded-2xl bg-[var(--surface)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-bold text-[var(--text-primary)]">{v.text}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            v.status === "active" ? "status-pill-success" : v.status === "pending" ? "status-pill-pending" : "status-pill-rejected",
                          )}
                        >
                          {v.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                        {SOURCE_LABEL[v.source] ?? v.source} · {formatIstDateTime(v.validFrom)}
                        {v.validTo ? ` → ${formatIstDateTime(v.validTo)}` : " → now"}
                        {v.note ? ` · ${v.note}` : ""}
                      </p>
                    </li>
                  ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </AccessGate>
  );
}
