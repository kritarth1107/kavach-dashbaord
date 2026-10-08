"use client";

import type { LabStatCard } from "@/lib/api";
import { fmtIsoDate, monthLabel, parseRange, prettyRange, signed } from "@/lib/health-records";
import { cn } from "@/lib/utils";
import { SideDrawer } from "@/components/care-os/care-kit";
import { FlagTag } from "./record-bits";

/** A tiny line of the last readings, with the normal band behind it when the range is known. */
export function Sparkline({ values, lo, hi, w = 112, h = 34 }: { values: number[]; lo: number | null; hi: number | null; w?: number; h?: number }) {
  if (values.length < 2) return null;
  let min = Math.min(...values, lo ?? Infinity);
  let max = Math.max(...values, hi ?? -Infinity);
  if (max === min) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.08;
  min -= pad;
  max += pad;
  const x = (i: number) => (i / (values.length - 1)) * (w - 8) + 4;
  const y = (v: number) => h - 4 - ((v - min) / (max - min)) * (h - 8);
  const bandTop = hi != null ? y(hi) : 0;
  const bandBottom = lo != null ? y(lo) : h;
  const last = values.length - 1;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0 overflow-visible">
      {(lo != null || hi != null) && (
        <rect x="0" y={Math.max(0, bandTop)} width={w} height={Math.max(2, Math.min(h, bandBottom) - Math.max(0, bandTop))} rx="3" className="fill-[var(--c-ok-band)] dark:fill-[rgba(31,122,77,0.18)]" />
      )}
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--c-ink)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) =>
        i === last ? (
          <circle key={i} cx={x(i)} cy={y(v)} r={3.6} fill="var(--c-accent)" stroke="var(--c-frame)" strokeWidth={1.5} />
        ) : (
          <circle key={i} cx={x(i)} cy={y(v)} r={2} fill="var(--c-ink)" />
        ),
      )}
    </svg>
  );
}

export function StatCard({ card, selected, onSelect }: { card: LabStatCard; selected?: boolean; onSelect?: () => void }) {
  const { lo, hi } = parseRange(card.range);
  const values = card.trend.map((p) => p.value);
  const delta = card.delta != null && card.prevDate ? `${signed(card.delta)} vs ${monthLabel(card.prevDate)}` : card.delta != null ? signed(card.delta) : null;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={`Show the ${card.name} trend`}
      className={cn(
        "flex min-w-0 flex-col justify-start rounded-[22px] bg-[var(--c-card)] p-4 text-left transition-shadow outline-none",
        "hover:shadow-[inset_0_0_0_1px_var(--c-line)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-frame)]",
        selected && "shadow-[inset_0_0_0_1px_var(--c-ink-3)] hover:shadow-[inset_0_0_0_1px_var(--c-ink-3)]",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words text-[13px] font-medium leading-snug">{card.name}</span>
        <FlagTag flag={card.flag} arrow />
      </span>
      <span className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <span className="min-w-0 leading-none">
          <span className="c-num text-[28px] font-medium sm:text-[30px]">{card.value}</span>
          {card.unit && <span className="ml-1 text-[12px] text-[var(--c-ink-2)]">{card.unit}</span>}
        </span>
        <Sparkline values={values} lo={lo} hi={hi} />
      </span>
      <span className="mt-3 flex flex-col gap-0.5 text-[11.5px] text-[var(--c-ink-2)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-2">
        <span>{card.range ? `Normal ${prettyRange(card.range)}` : "No normal range printed"}</span>
        {delta && <span className="c-num whitespace-nowrap">{delta}</span>}
      </span>
      <span className="mt-1 block text-[11px] text-[var(--c-ink-3)]">
        {fmtIsoDate(card.date) || "Undated"}
        {card.count === 1 ? " · seen once" : ""}
      </span>
    </button>
  );
}

const TH = "py-2 pr-3 text-left text-[10.5px] font-medium uppercase tracking-[0.07em] text-[var(--c-ink-3)]";
const TD = "border-t border-[var(--c-line)] py-2.5 pr-3 align-middle text-[13px]";

/** Every value from the saved reports, most important first. A row shows its trend on the page. */
export function AllValuesSheet({
  open,
  onClose,
  cards,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  cards: LabStatCard[];
  onPick: (key: string) => void;
}) {
  return (
    <SideDrawer open={open} onClose={onClose} top="All" bottom={`${cards.length} values`} label="All values from the reports">
      <p className="text-[12.5px] text-[var(--c-ink-2)]">The latest reading of each test, values outside normal first. Choose one to see its trend.</p>
      <table className="mt-3 w-full">
        <thead>
          <tr>
            <th className={TH}>Test</th>
            <th className={cn(TH, "text-right")}>Latest</th>
            <th className={cn(TH, "hidden sm:table-cell")}>Normal</th>
            <th className={cn(TH, "pr-0")}>
              <span className="sr-only">Flag</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.key}>
              <td className={TD}>
                <button
                  type="button"
                  onClick={() => onPick(c.key)}
                  className="rounded-sm text-left font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--c-accent)]"
                >
                  {c.name}
                </button>
                <span className="block text-[11px] text-[var(--c-ink-3)]">
                  {fmtIsoDate(c.date) || "Undated"} · {c.count === 1 ? "seen once" : `${c.count} readings`}
                </span>
              </td>
              <td className={cn(TD, "text-right")}>
                <span className="c-num font-medium">{c.value}</span>
                {c.unit && <span className="ml-1 text-[11px] text-[var(--c-ink-2)]">{c.unit}</span>}
              </td>
              <td className={cn(TD, "c-num hidden text-[var(--c-ink-2)] sm:table-cell")}>{prettyRange(c.range) || "—"}</td>
              <td className={cn(TD, "pr-0 text-right")}>
                <FlagTag flag={c.flag} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SideDrawer>
  );
}
