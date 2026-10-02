"use client";

import { CheckCircle, Minus, Pill, Plus, ShoppingCartSimple } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { getStock, orderRefill, setStock, type Pharmacy, type StockRow } from "@/lib/care-features-api";
import { cn } from "@/lib/utils";
import { OnWhatsApp, parseIst, shortDate } from "./feature-kit";
import { callName, usePerson } from "./person-context";
import { Panel, PanelTitle, SmallButton, Tag } from "./ui";

const PHARMACIES: Array<{ id: Pharmacy; label: string }> = [
  { id: "apollo", label: "Apollo" },
  { id: "1mg", label: "1mg" },
  { id: "pharmeasy", label: "PharmEasy" },
];

/** Horizon for the days-left bar: a month of tablets fills it. */
const FULL_DAYS = 30;

type Open = { key: string; mode: "count" | "order" } | null;

/** Stock & refills for the selected person: tablets left, days left, set a count, reorder. */
export function RefillsPanel() {
  const { familyId, selectedId, selected } = usePerson();
  const [state, setState] = useState<{ subject: string; rows: StockRow[]; within: number; error: string } | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const [count, setCount] = useState("");
  const [service, setService] = useState<Pharmacy>("apollo");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<{ key: string; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!familyId || !selectedId) return;
    try {
      const d = await getStock(familyId, selectedId);
      setState({ subject: selectedId, rows: d.medicines, within: d.refillWithinDays, error: "" });
    } catch (e) {
      setState({ subject: selectedId, rows: [], within: 5, error: e instanceof Error ? e.message : "Couldn't load stock" });
    }
  }, [familyId, selectedId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  if (!familyId || !selectedId) return null;
  const loading = !state || state.subject !== selectedId;
  const rows = loading ? [] : state.rows;
  const low = rows.filter((r) => r.low).length;
  const who = selected?.self ? "your" : `${callName(selected)}'s`;

  function toggle(key: string, mode: "count" | "order", row: StockRow) {
    setRowError(null);
    if (open?.key === key && open.mode === mode) return setOpen(null);
    setOpen({ key, mode });
    if (mode === "count") setCount(row.stock != null ? String(row.stock) : "");
    else {
      setService("apollo");
      setQty(1);
    }
  }

  async function saveCount(row: StockRow) {
    const n = Number(count);
    if (!familyId || !selectedId || !Number.isFinite(n) || n < 0) return;
    setBusy(row.key);
    setRowError(null);
    try {
      const updated = await setStock(familyId, selectedId, row.key, Math.round(n));
      setState((s) =>
        s ? { ...s, rows: s.rows.map((r) => (r.key === row.key ? (updated ?? { ...r, stock: Math.round(n), asOf: new Date().toISOString() }) : r)) } : s,
      );
      setOpen(null);
      if (!updated) void load();
    } catch (e) {
      setRowError({ key: row.key, text: e instanceof Error ? e.message : "Couldn't save the count" });
    } finally {
      setBusy(null);
    }
  }

  async function reorder(row: StockRow) {
    if (!familyId || !selectedId) return;
    setBusy(row.key);
    setRowError(null);
    try {
      const r = await orderRefill(familyId, selectedId, row.key, service, qty);
      setDone((d) => ({
        ...d,
        [row.key]: r?.alreadyRunning ? "An order is already running — confirm the cart when Saheli asks" : "Order started — confirm the cart when Saheli asks",
      }));
      setOpen(null);
    } catch (e) {
      setRowError({ key: row.key, text: e instanceof Error ? e.message : "Couldn't start the order" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel aria-label="Stock and refills">
      <PanelTitle
        title="Stock & refills"
        right={!loading && rows.length > 0 ? low ? <Tag>{low} running low</Tag> : <span className="text-[11px] text-[var(--c-ink-3)]">reminder {state.within} days before</span> : undefined}
      />
      {loading ? (
        <div className="mt-4 h-[120px] animate-pulse rounded-[18px] bg-[var(--c-frame)]" />
      ) : state.error ? (
        <p className="mt-4 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">{state.error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">Add {who} medicines to the care record and set how many tablets are left; Saheli warns you before they run out.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => {
            const known = r.stock != null && r.daysLeft != null;
            const pct = known ? Math.min(100, Math.max(4, ((r.daysLeft as number) / FULL_DAYS) * 100)) : 0;
            const isOpen = open?.key === r.key;
            return (
              <li key={r.key} className="rounded-[18px] bg-[var(--c-frame)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", r.low ? "bg-[var(--c-accent)] text-white" : "bg-[var(--c-ink)] text-white")}>
                      <Pill size={18} weight={r.low ? "fill" : "regular"} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">
                        {r.name}
                        {r.dose && <span className="font-normal text-[var(--c-ink-3)]"> · {r.dose}</span>}
                      </p>
                      <p className="text-[12px] text-[var(--c-ink-2)]">
                        {known ? (
                          <>
                            {r.stock} {r.stock === 1 ? "tablet" : "tablets"} left
                            {r.asOf && <span className="text-[var(--c-ink-3)]"> · as of {shortDate(parseIst(r.asOf))}</span>}
                          </>
                        ) : (
                          <span className="text-[var(--c-accent)]">Count the strip and set it</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {known && (
                    <div className="w-full sm:w-[150px]">
                      <div className="flex items-baseline justify-between text-[12px]">
                        <span className={cn("c-num text-[18px] leading-none", r.low && "text-[var(--c-accent)]")}>{r.daysLeft}</span>
                        <span className="text-[var(--c-ink-3)]">{r.daysLeft === 1 ? "day left" : "days left"}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-[var(--c-card)]">
                        <div className={cn("h-full rounded-full", r.low ? "bg-[var(--c-accent)]" : "bg-[var(--c-ink)]")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex shrink-0 flex-wrap gap-1.5 sm:w-[190px] sm:justify-end">
                    <SmallButton dark={!known} onClick={() => toggle(r.key, "count", r)} aria-expanded={isOpen && open?.mode === "count"}>
                      Set count
                    </SmallButton>
                    {r.low && (
                      <SmallButton dark icon={ShoppingCartSimple} onClick={() => toggle(r.key, "order", r)} aria-expanded={isOpen && open?.mode === "order"}>
                        Reorder
                      </SmallButton>
                    )}
                  </div>
                </div>

                {isOpen && open?.mode === "count" && (
                  <form
                    className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--c-line)] pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveCount(r);
                    }}
                  >
                    <label className="flex items-center gap-2 text-[12px] text-[var(--c-ink-2)]">
                      Tablets in hand
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={2000}
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                        autoFocus
                        className="h-11 w-24 rounded-[14px] border border-[var(--c-line)] bg-[var(--c-frame)] px-3 text-[14px] text-[var(--c-ink)] outline-none focus:border-[var(--c-ink)]"
                      />
                    </label>
                    <SmallButton dark type="submit" disabled={busy === r.key || count === "" || Number(count) < 0}>
                      {busy === r.key ? "Saving…" : "Save"}
                    </SmallButton>
                    <SmallButton onClick={() => setOpen(null)}>Cancel</SmallButton>
                  </form>
                )}

                {isOpen && open?.mode === "order" && (
                  <div className="mt-3 border-t border-[var(--c-line)] pt-3">
                    <p className="text-[12px] text-[var(--c-ink-2)]">Order from</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {PHARMACIES.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          aria-pressed={service === p.id}
                          onClick={() => setService(p.id)}
                          className={cn(
                            "h-8 rounded-[10px] border px-3.5 text-[13px] transition-colors",
                            service === p.id ? "border-transparent bg-[var(--c-accent)] text-white" : "border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]",
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                      <span className="ml-1 flex items-center gap-1 rounded-full border border-[var(--c-line)] p-0.5">
                        <button type="button" aria-label="Fewer" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--c-card)] disabled:opacity-30">
                          <Minus size={12} weight="bold" />
                        </button>
                        <span className="c-num w-12 text-center text-[13px]">
                          {qty} {qty === 1 ? "pack" : "packs"}
                        </span>
                        <button type="button" aria-label="More" disabled={qty >= 10} onClick={() => setQty((q) => Math.min(10, q + 1))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--c-card)] disabled:opacity-30">
                          <Plus size={12} weight="bold" />
                        </button>
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <SmallButton dark disabled={busy === r.key} onClick={() => void reorder(r)}>
                        {busy === r.key ? "Starting…" : "Start order"}
                      </SmallButton>
                      <SmallButton onClick={() => setOpen(null)}>Cancel</SmallButton>
                      <span className="text-[11px] text-[var(--c-ink-3)]">Cash on delivery. Saheli asks before placing it.</span>
                    </div>
                  </div>
                )}

                {rowError?.key === r.key && <p className="mt-2 text-[12px] text-[#d92d20]">{rowError.text}</p>}
                {done[r.key] && (
                  <p className="mt-3 flex items-center gap-2 rounded-[12px] bg-[var(--c-accent-soft)] px-3 py-2 text-[12.5px] text-[var(--c-accent-soft-ink)]">
                    <CheckCircle size={15} weight="fill" className="shrink-0" /> {done[r.key]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <OnWhatsApp className="mt-4">
        tell Saheli &ldquo;{rows[0]?.name ?? "Amlodipine"} — 10 tablets left&rdquo; or &ldquo;order {rows.find((r) => r.low)?.name ?? "it"} from Apollo&rdquo;.
      </OnWhatsApp>
    </Panel>
  );
}
