"use client";

import { Check, Loader2, Pencil, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import {
  DOMAIN_ORDER,
  DOMAIN_TITLE,
  getCareOverview,
  resolveFact,
  saveFact,
  SOURCE_LABEL,
  stopFact,
  type CareFact,
} from "@/lib/care-memory-api";

/** Facts that only the record's own screens edit (the reminder card, the medicine list, the setup). */
const NOT_HERE = new Set(["medicine", "naming", "language"]);
const isNone = (f: CareFact) => f.key.endsWith(":none");
/** Usual orders have their own card (SaheliUsualsCard). */
const isUsual = (f: CareFact) => f.key.startsWith("preference:usual_");

function groups(facts: CareFact[]): Array<{ domain: string; title: string; facts: CareFact[] }> {
  const by = new Map<string, CareFact[]>();
  for (const f of facts) {
    if (NOT_HERE.has(f.domain) || isNone(f) || isUsual(f)) continue;
    by.set(f.domain, [...(by.get(f.domain) ?? []), f]);
  }
  const order = [...DOMAIN_ORDER, ...[...by.keys()].filter((d) => !DOMAIN_ORDER.includes(d)).sort()];
  return order.filter((d) => by.has(d)).map((d) => ({ domain: d, title: DOMAIN_TITLE[d] ?? d, facts: by.get(d)! }));
}

/**
 * What Saheli has learned about this person, from her care record in the engine: the one memory she uses on WhatsApp
 * (trust plan A1; the old Mongo profile is retired). Proposals wait for a yes; anything can be fixed, and "Not true"
 * puts it on her never-use list, so she never says or learns it again.
 */
export function WhatSaheliLearnedCard({ recipientUserId, recipientName }: { recipientUserId: string; recipientName: string }) {
  const { activeFamilyId } = useFamily();
  const [facts, setFacts] = useState<CareFact[]>([]);
  const [pending, setPending] = useState<CareFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  const first = recipientName.split(" ")[0] || recipientName;

  useEffect(() => {
    if (!activeFamilyId) return;
    let alive = true;
    getCareOverview(activeFamilyId, recipientUserId)
      .then((o) => {
        if (!alive) return;
        setFacts(o.facts.filter((f) => f.status === "active"));
        setPending(o.pending ?? o.facts.filter((f) => f.status === "pending"));
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Couldn't load"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [activeFamilyId, recipientUserId, tick]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
      setError(null);
      setEditing(null);
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  };
  const fid = activeFamilyId || "";
  const shown = groups(facts);

  return (
    <section className="panel-card mb-6 overflow-hidden" data-testid="what-saheli-learned">
      <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-4">
        <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.25} />
        <div className="flex-1">
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">What Saheli learned about {recipientName}</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            From {first}&apos;s care record: the same memory Saheli uses on WhatsApp. Fix what isn&apos;t right; &ldquo;Not true&rdquo; means she never uses or learns it again.
          </p>
        </div>
        <Link href="/dashboard/saheli/memory" className="text-[12px] font-bold text-primary hover:underline">
          All memory
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-5 px-5 py-4">
          {error && <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>}

          {pending.length > 0 && (
            <div data-testid="learned-waiting">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Waiting for your yes</p>
              <ul className="space-y-2">
                {pending.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
                    <p className="min-w-0 flex-1 text-[13px] text-[var(--text-primary)]">
                      {f.text}
                      <span className="ml-2 text-[11px] text-[var(--text-tertiary)]">{SOURCE_LABEL[f.source] ?? f.source}</span>
                    </p>
                    <button
                      type="button"
                      disabled={busy === f.id}
                      onClick={() => void act(f.id, () => resolveFact(fid, recipientUserId, f.key, true))}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> Yes
                    </button>
                    <button
                      type="button"
                      disabled={busy === f.id}
                      onClick={() => void act(f.id, () => resolveFact(fid, recipientUserId, f.key, false))}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border-strong)] px-2 py-1 text-[11px] font-bold text-[var(--text-secondary)] disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> Not true
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {shown.length === 0 && pending.length === 0 ? (
            <p className="text-[13px] text-[var(--text-secondary)]" data-testid="learned-empty">
              Nothing learned yet. Saheli writes down what {first} and the family tell her, and shows it here.
            </p>
          ) : (
            shown.map((g) => (
              <div key={g.domain} data-testid={`learned-${g.domain}`}>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{g.title}</p>
                <ul className="divide-y divide-[var(--border-strong)] rounded-lg border border-[var(--border-strong)]">
                  {g.facts.map((f) => (
                    <li key={f.id} className="px-3 py-2">
                      {editing?.id === f.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={editing.text}
                            onChange={(e) => setEditing({ id: f.id, text: e.target.value })}
                            className="min-w-0 flex-1 rounded-md border border-[var(--border-strong)] bg-[var(--input-bg)] px-2 py-1 text-[13px]"
                            aria-label="Corrected sentence"
                          />
                          <button
                            type="button"
                            disabled={busy === f.id || editing.text.trim().length < 3}
                            onClick={() =>
                              void act(f.id, () =>
                                saveFact(fid, recipientUserId, { domain: f.domain, name: f.name, details: f.value ?? {}, sentence: editing.text.trim() }),
                              )
                            }
                            className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="text-[11px] text-[var(--text-tertiary)]">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start gap-3">
                          <p className="min-w-0 flex-1 text-[13px] text-[var(--text-primary)]">
                            {f.text}
                            <span className="ml-2 text-[11px] text-[var(--text-tertiary)]">{SOURCE_LABEL[f.source] ?? f.source}</span>
                          </p>
                          <button
                            type="button"
                            aria-label={`Fix: ${f.text}`}
                            disabled={busy === f.id}
                            onClick={() => setEditing({ id: f.id, text: f.text })}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
                          >
                            <Pencil className="h-3 w-3" /> Fix
                          </button>
                          <button
                            type="button"
                            aria-label={`Not true: ${f.text}`}
                            disabled={busy === f.id}
                            onClick={() => {
                              if (!window.confirm("Not true? Saheli will stop using it and never learn it again.")) return;
                              void act(f.id, () => stopFact(fid, recipientUserId, { domain: f.domain, name: f.name, reason: "not true (caregiver)", wrong: true }));
                            }}
                            className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            Not true
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="text-[11px] text-[var(--text-tertiary)]">Medicines, the name Saheli uses and the language are set on their own cards. None of this changes safety rules.</p>
        </div>
      )}
    </section>
  );
}
