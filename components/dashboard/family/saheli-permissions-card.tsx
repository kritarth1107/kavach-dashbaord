"use client";

import { Bike, Check, Loader2, Lock, Pill, ShieldCheck, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import type { DelegatePermissions, PermissionPatch } from "@/lib/delegate-api";

const day = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300"} ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${on ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

const CATS: { key: "groceries" | "food" | "medicines" | "rides"; label: string; hint: string; storeCat: string; Icon: typeof Pill }[] = [
  { key: "groceries", label: "Order groceries", hint: "Cash on delivery, after she types confirm", storeCat: "grocery", Icon: ShoppingBasket },
  { key: "food", label: "Order food", hint: "Cash on delivery, after she types confirm", storeCat: "food", Icon: UtensilsCrossed },
  { key: "medicines", label: "Order medicines", hint: "Always shows the medicine and asks her to confirm", storeCat: "pharmacy", Icon: Pill },
  { key: "rides", label: "Book rides", hint: "Shows pickup, drop and fare first", storeCat: "ride", Icon: Bike },
];
const CHECKS: { key: "deliveryFollowUps" | "medicineStartCheck" | "resumeNudges"; label: string; hint: string }[] = [
  { key: "deliveryFollowUps", label: "Check that orders arrived", hint: "A short 'Did it arrive? 🙂' after the delivery time" },
  { key: "medicineStartCheck", label: "Check new medicines were started", hint: "'Have you started it?' once it arrives" },
  { key: "resumeNudges", label: "Remind about unfinished orders", hint: "One gentle reminder for an important order she left halfway" },
];

/** "What Saheli can do for Amma": per-family authorisations, caregiver-editable where safe; locked rules shown, never editable. */
export function SaheliPermissionsView({
  recipientName,
  perms,
  onPatch,
  busyKey,
  error,
}: {
  recipientName: string;
  perms: DelegatePermissions;
  onPatch?: (patch: PermissionPatch, key: string) => void;
  busyKey?: string | null;
  error?: string | null;
}) {
  const [limit, setLimit] = useState<string>(perms.spendSoftLimitInr == null ? "" : String(perms.spendSoftLimitInr));
  const canEdit = Boolean(onPatch);
  const busy = (k: string) => busyKey === k;

  return (
    <section className="panel-card mb-6 overflow-hidden" data-testid="saheli-permissions">
      <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-4">
        <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={2.25} />
        <div className="flex-1">
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">What Saheli can do for {recipientName}</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Saheli only acts inside these. Anything outside, she asks {recipientName} to wait and asks you here first.
          </p>
        </div>
        {perms.updatedAt && <span className="text-[11px] text-[var(--text-secondary)]">Changed {day(perms.updatedAt)}</span>}
      </div>

      {error && <p className="border-b border-[var(--border-strong)] bg-rose-50 px-5 py-2 text-[12px] text-rose-700">{error}</p>}

      <div className="grid gap-0 divide-y divide-[var(--border-strong)] md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="px-5 py-4">
          <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Allowed</h3>
          <ul className="space-y-3">
            {CATS.map(({ key, label, hint, storeCat, Icon }) => {
              const stores = perms.stores.filter((s) => s.category === storeCat);
              return (
                <li key={key}>
                  <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
                      <p className="text-[11.5px] text-[var(--text-secondary)]">{perms[key] ? hint : "Off: Saheli asks you first"}</p>
                    </div>
                    {busy(key) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Toggle label={label} on={perms[key]} disabled={!canEdit} onChange={(v) => onPatch?.({ [key]: v }, key)} />}
                  </div>
                  {perms[key] && stores.length > 0 && (
                    <div className="ml-6.5 mt-1.5 flex flex-wrap gap-1.5 pl-[26px]">
                      {stores.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          disabled={!canEdit || busy(`store:${s.key}`)}
                          onClick={() => onPatch?.({ stores: { [s.key]: !s.allowed } }, `store:${s.key}`)}
                          title={s.allowed ? `Click to stop ${s.label}` : `Click to allow ${s.label}`}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                            s.allowed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-400 line-through"
                          }`}
                        >
                          {s.allowed && <Check className="mr-0.5 inline h-3 w-3" />}
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 rounded-lg bg-[var(--surface-muted,#f8fafc)] px-3 py-2.5">
            <label className="text-[12.5px] font-semibold text-[var(--text-primary)]" htmlFor="soft-limit">
              Ask me before orders above
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[13px] text-[var(--text-secondary)]">₹</span>
              <input
                id="soft-limit"
                inputMode="numeric"
                disabled={!canEdit}
                value={limit}
                placeholder="no limit"
                onChange={(e) => setLimit(e.target.value.replace(/[^\d]/g, ""))}
                className="w-24 rounded-md border border-[var(--border-strong)] bg-white px-2 py-1 text-[13px]"
              />
              {canEdit && (
                <button
                  type="button"
                  disabled={busy("limit") || limit === (perms.spendSoftLimitInr == null ? "" : String(perms.spendSoftLimitInr))}
                  onClick={() => onPatch?.({ spendSoftLimitInr: limit ? Number(limit) : null }, "limit")}
                  className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-40"
                >
                  {busy("limit") ? "Saving…" : "Save"}
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Over this, nothing is placed until you approve here.</p>
          </div>

          <h3 className="mb-2 mt-4 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Follow-through</h3>
          <ul className="space-y-2.5">
            {CHECKS.map(({ key, label, hint }) => (
              <li key={key} className="flex items-start gap-2.5">
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
                  <p className="text-[11.5px] text-[var(--text-secondary)]">{hint}</p>
                </div>
                {busy(key) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Toggle label={label} on={perms[key]} disabled={!canEdit} onChange={(v) => onPatch?.({ [key]: v }, key)} />}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-5 py-4">
          <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Saheli asks first</h3>
          {perms.summary.asks.length ? (
            <ul className="mb-4 space-y-1.5">
              {perms.summary.asks.map((a) => (
                <li key={a} className="text-[13px] text-[var(--text-primary)]">• {a}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-[12.5px] text-[var(--text-secondary)]">Nothing extra: everything above is allowed.</p>
          )}
          <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
            <Lock className="h-3.5 w-3.5" /> Always, can&apos;t be switched off
          </h3>
          <ul className="space-y-1.5">
            {perms.locked.map((r) => (
              <li key={r} className="text-[12.5px] text-[var(--text-secondary)]">
                • {r.split(/\*(.+?)\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))}
              </li>
            ))}
          </ul>
          {perms.history.length > 0 && (
            <>
              <h3 className="mb-1.5 mt-4 text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Recent changes</h3>
              <ul className="space-y-1">
                {perms.history.slice(0, 4).map((h, i) => (
                  <li key={i} className="text-[11.5px] text-[var(--text-secondary)]">
                    {day(h.at)} · {h.byName || "Family"}: {h.change}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
