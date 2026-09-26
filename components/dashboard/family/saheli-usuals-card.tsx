"use client";

import { Car, Loader2, Repeat, ThumbsDown, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getRecipientUsuals,
  removeRecipientUsualDecline,
  removeRecipientUsualItem,
  type RecipientUsuals,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { formatWhen } from "./morning-briefing-card";

const APP: Record<string, string> = {
  instamart: "Instamart",
  swiggy: "Swiggy",
  zepto: "Zepto",
  blinkit: "Blinkit",
  zomato: "Zomato",
  apollo: "Apollo",
};
const app = (p?: string | null) => (p ? APP[p] || p.charAt(0).toUpperCase() + p.slice(1) : "—");
const inr = (p: number | null) => (p ? `₹${Math.round(p / 100).toLocaleString("en-IN")}` : "—");
const every = (d: number | null, count: number) =>
  d ? `every ~${d < 1.5 ? "day" : `${Math.round(d)} days`}` : count > 1 ? `${count}× so far` : "once so far";
const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? " am" : " pm"}`;

/** What Saheli has learned about this elder's regular orders (family members only). */
export function SaheliUsualsCard({ recipientUserId, recipientName }: { recipientUserId: string; recipientName: string }) {
  const { activeFamilyId } = useFamily();
  const [data, setData] = useState<RecipientUsuals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!activeFamilyId) return;
    let alive = true;
    getRecipientUsuals(activeFamilyId, recipientUserId)
      .then(({ data }) => {
        if (!alive) return;
        setData(data ?? null);
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Couldn't load usuals"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [activeFamilyId, recipientUserId]);

  const act = async (id: string, fn: () => Promise<{ data?: { usuals: RecipientUsuals } }>) => {
    setBusy(id);
    try {
      const r = await fn();
      if (r.data?.usuals) setData(r.data.usuals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  };

  const empty = data && !data.items.length && !data.rides.length && !data.rejections.length;
  const prefs = data ? (Object.entries(data.preferredApp).filter(([, v]) => v) as Array<[string, string]>) : [];

  return (
    <section className="panel-card mb-6 overflow-hidden" data-testid="saheli-usuals">
      <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-4">
        <Repeat className="h-4 w-4 text-primary" strokeWidth={2.25} />
        <div>
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">{recipientName}&apos;s usuals</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            What Saheli has learned from orders and rides. Every order still needs her *confirm*, a health check and the live price.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="px-5 py-6 text-[13px] text-[var(--danger-text,#b91c1c)]">{error}</p>
      ) : empty || !data ? (
        <p className="px-5 py-6 text-[13px] text-[var(--text-secondary)]">
          Nothing learned yet — usuals appear after {recipientName} orders through Saheli on WhatsApp.
        </p>
      ) : (
        <div className="space-y-5 px-5 py-4">
          {data.items.length > 0 && (
            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Usual items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="text-[11px] uppercase text-[var(--text-secondary)]">
                    <tr>
                      <th className="py-1.5 pr-3 font-semibold">Item</th>
                      <th className="py-1.5 pr-3 font-semibold">App</th>
                      <th className="py-1.5 pr-3 font-semibold">Last price</th>
                      <th className="py-1.5 pr-3 font-semibold">How often</th>
                      <th className="py-1.5 pr-3 font-semibold">Last ordered</th>
                      <th className="py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((u) => {
                      const id = `i:${u.name}:${u.partner}`;
                      return (
                        <tr key={id} className="border-t border-[var(--border-strong)]">
                          <td className="py-2 pr-3">
                            <span className="font-semibold text-[var(--text-primary)]">{u.name}</span>
                            <span className="ml-1.5 text-[11px] text-[var(--text-secondary)]">
                              {u.key}
                              {u.placeNickname ? ` · to ${u.placeNickname}` : ""}
                            </span>
                          </td>
                          <td className="py-2 pr-3">{app(u.partner)}</td>
                          <td className="py-2 pr-3">{inr(u.pricePaise)}</td>
                          <td className="py-2 pr-3">{every(u.intervalDays, u.count)}</td>
                          <td className="py-2 pr-3">{formatWhen(u.lastAt)}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              disabled={busy === id}
                              onClick={() => {
                                if (!activeFamilyId || !window.confirm(`Forget "${u.name}" as a usual?`)) return;
                                void act(id, () => removeRecipientUsualItem(activeFamilyId, recipientUserId, u.name, u.partner));
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text,#b91c1c)]"
                              aria-label={`Remove ${u.name}`}
                            >
                              {busy === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(prefs.length > 0 || data.typicalHours.length > 0) && (
            <div className="flex flex-wrap gap-2 text-[12px]">
              {prefs.map(([cat, p]) => (
                <span key={cat} className="rounded-full border border-[var(--border-strong)] px-2.5 py-1">
                  <span className="text-[var(--text-secondary)]">{cat === "food" ? "Food" : cat === "grocery" ? "Groceries" : "Medicines"}:</span>{" "}
                  <span className="font-semibold">{app(p)}</span>
                </span>
              ))}
              {data.typicalHours.length > 0 && (
                <span className="rounded-full border border-[var(--border-strong)] px-2.5 py-1">
                  <span className="text-[var(--text-secondary)]">Usually orders around:</span>{" "}
                  <span className="font-semibold">{data.typicalHours.map(hourLabel).join(", ")}</span>
                </span>
              )}
            </div>
          )}

          {data.rides.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                <Car className="h-3.5 w-3.5" /> Frequent ride destinations
              </h3>
              <ul className="space-y-1 text-[13px]">
                {data.rides.map((r) => (
                  <li key={r.destination} className="flex justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">{r.destination}</span>
                    <span className="text-[var(--text-secondary)]">
                      {r.count}× · last {formatWhen(r.lastAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.rejections.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                <ThumbsDown className="h-3.5 w-3.5" /> Declined (Saheli won&apos;t re-offer these the same way)
              </h3>
              <ul className="space-y-1.5 text-[13px]">
                {[...data.rejections].reverse().map((d) => {
                  const id = `d:${d.item}:${d.at}`;
                  return (
                    <li key={id} className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">{d.item}</span>
                        {d.partner ? <span className="text-[var(--text-secondary)]"> · {app(d.partner)}</span> : null}
                        <div className="text-[12px] text-[var(--text-secondary)]">
                          “{d.reason}”{d.replacedWith ? ` → chose ${d.replacedWith}` : ""} · {formatWhen(d.at)}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy === id}
                        onClick={() => {
                          if (!activeFamilyId) return;
                          void act(id, () => removeRecipientUsualDecline(activeFamilyId, recipientUserId, d.item, d.at));
                        }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text,#b91c1c)]"
                        aria-label={`Remove decline for ${d.item}`}
                      >
                        {busy === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Remove
                      </button>
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
