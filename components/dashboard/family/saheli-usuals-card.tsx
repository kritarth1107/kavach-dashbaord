"use client";

import { Loader2, Repeat } from "lucide-react";
import { useEffect, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import { getCareOverview, stopFact, type CareFact } from "@/lib/care-memory-api";

const APP: Record<string, string> = {
  instamart: "Instamart",
  swiggy: "Swiggy",
  zepto: "Zepto",
  blinkit: "Blinkit",
  zomato: "Zomato",
  apollo: "Apollo",
};
const app = (p?: unknown) => (typeof p === "string" && p ? APP[p] || p.charAt(0).toUpperCase() + p.slice(1) : null);

/** A usual is a preference fact the care record keeps as preference:usual_<item> (trust plan A1: the old usuals store
 *  moved into the record, which the order picker reads). */
export const isUsual = (f: CareFact) => f.domain === "preference" && f.key.startsWith("preference:usual_") && f.status === "active";

/** What Saheli has learned about this person's regular orders, from the care record. */
export function SaheliUsualsCard({ recipientUserId, recipientName }: { recipientUserId: string; recipientName: string }) {
  const { activeFamilyId } = useFamily();
  const [usuals, setUsuals] = useState<CareFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!activeFamilyId) return;
    let alive = true;
    getCareOverview(activeFamilyId, recipientUserId)
      .then((o) => {
        if (!alive) return;
        setUsuals(o.facts.filter(isUsual));
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Couldn't load usuals"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [activeFamilyId, recipientUserId, tick]);

  const remove = async (f: CareFact) => {
    if (!activeFamilyId) return;
    setBusy(f.id);
    try {
      await stopFact(activeFamilyId, recipientUserId, { domain: f.domain, name: f.name, reason: "not a usual any more (caregiver)" });
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="panel-card mb-6 overflow-hidden" data-testid="saheli-usuals">
      <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-4">
        <Repeat className="h-4 w-4 text-primary" strokeWidth={2.25} />
        <div>
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">{recipientName}&apos;s usuals</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            What Saheli has learned about regular orders. Every order still needs a yes, a health check and the live price.
          </p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="px-5 py-4">
          {error && <p className="mb-2 text-[12px] text-red-600 dark:text-red-400">{error}</p>}
          {usuals.length === 0 ? (
            <p className="text-[13px] text-[var(--text-secondary)]">No usuals yet: Saheli learns them as orders are placed.</p>
          ) : (
            <ul className="divide-y divide-[var(--border-strong)] rounded-lg border border-[var(--border-strong)]">
              {usuals.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <p className="min-w-0 flex-1 text-[13px] text-[var(--text-primary)]">
                    {f.text}
                    {app(f.value?.partner) && <span className="ml-2 text-[11px] text-[var(--text-tertiary)]">{app(f.value?.partner)}</span>}
                  </p>
                  <button
                    type="button"
                    disabled={busy === f.id}
                    onClick={() => void remove(f)}
                    className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
