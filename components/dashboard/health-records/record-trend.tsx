"use client";

import { Check, Plus, Sparkle } from "@phosphor-icons/react";
import { useState } from "react";
import type { LabStatCard } from "@/lib/api";
import type { Appointment } from "@/lib/care-features-api";
import { fmtIsoDate, friendlyError, monthLabel, parseRange } from "@/lib/health-records";
import { Bars, Panel, PanelTitle } from "@/components/care-os/ui";
import { PILL_BUTTON } from "./record-bits";

const CHART_H = 170;

/** Month under each bar; when a month repeats, the day is added so the bars stay apart. */
function barLabels(dates: Array<string | null>): string[] {
  const months = dates.map((d) => monthLabel(d) || "—");
  const repeats = new Set(months.filter((m, i) => months.indexOf(m) !== i));
  return dates.map((d, i) => (repeats.has(months[i]) ? fmtIsoDate(d, { day: "numeric", month: "short" }) : months[i]));
}

/** Dark bars for one value over the last reports: the latest in the accent colour, a dashed line at the normal limit. */
export function TrendPanel({ card, children }: { card: LabStatCard | null; children?: React.ReactNode }) {
  if (!card) {
    return (
      <Panel className="min-w-0">
        <PanelTitle title="Trends" />
        <p className="c-hatch mt-4 rounded-[16px] px-4 py-10 text-center text-[12.5px] text-[var(--c-ink-2)]">
          When a saved report has values, the trend for each one shows here.
        </p>
        {children}
      </Panel>
    );
  }
  const values = card.trend.map((p) => p.value);
  const { lo, hi } = parseRange(card.range);
  // The limit that matters: the upper one when the value is high, else the lower one.
  const line = card.flag === "high" && hi != null ? { at: hi, text: `normal up to ${hi}` } : lo != null ? { at: lo, text: `normal from ${lo}` } : hi != null ? { at: hi, text: `normal up to ${hi}` } : null;
  const top = Math.max(...values, line?.at ?? 0) * 1.12 || 1;
  const n = card.trend.length;

  return (
    <Panel className="min-w-0">
      <PanelTitle title={`${card.name} over time`} right={<span className="shrink-0 text-[12px] text-[var(--c-ink-2)]">{n >= 2 ? `last ${n} reports` : "one report"}</span>} />
      {n >= 2 ? (
        <figure className="mt-8" aria-label={`${card.name} in the last ${n} reports: ${card.trend.map((p) => `${p.value} on ${fmtIsoDate(p.date) || "an undated report"}`).join(", ")}`}>
          <div className="relative" style={{ height: CHART_H }}>
            {line && (
              <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#1f7a4d]" style={{ bottom: (line.at / top) * CHART_H }} aria-hidden>
                <span className="absolute -top-[18px] left-0 text-[10.5px] text-[#1f7a4d]">{line.text}</span>
              </div>
            )}
            <Bars values={values} highlight={[n - 1]} max={top} height={CHART_H} callout={{ index: n - 1, text: card.value }} />
          </div>
          <div className="mt-2 flex gap-[6px] text-[11px] text-[var(--c-ink-3)]" aria-hidden>
            {barLabels(card.trend.map((p) => p.date)).map((l, i) => (
              <span key={i} className="flex-1 whitespace-nowrap text-center">
                {l}
              </span>
            ))}
          </div>
        </figure>
      ) : (
        <div className="mt-5">
          <p className="c-num text-[34px] leading-none">
            {card.value}
            {card.unit && <span className="ml-1 text-[13px] text-[var(--c-ink-3)]">{card.unit}</span>}
          </p>
          <p className="mt-2 text-[12.5px] text-[var(--c-ink-2)]">
            Seen once{card.date ? `, on ${fmtIsoDate(card.date)}` : ""}. The trend shows after the next report.
          </p>
        </div>
      )}
      {children}
    </Panel>
  );
}

const ASK_LINE = /\s*Worth asking the doctor at the next visit\.?\s*$/i;

/**
 * "Saheli noticed": one plain observation from the reports, with a way to act on it.
 * With an upcoming appointment it goes on that doctor's question list, else it becomes a family task.
 */
export function NoticedBox({
  text,
  appointment,
  onAddQuestion,
  onAddTask,
}: {
  text: string;
  /** undefined while loading, null when there is no upcoming appointment. */
  appointment: Appointment | null | undefined;
  onAddQuestion: (appointmentKey: string, question: string) => Promise<void>;
  onAddTask: (title: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const sentence = text.replace(ASK_LINE, "").trim();
  const shown = appointment?.doctor ? text.replace(/asking the doctor/i, `asking ${appointment.doctor}`) : text;

  async function act() {
    setBusy(true);
    setError("");
    try {
      if (appointment) {
        await onAddQuestion(appointment.key, `${sentence} What should we do about it?`);
        setDone(`Added to the questions for ${appointment.doctor}.`);
      } else {
        await onAddTask(`Ask the doctor at the next visit: ${sentence}`.slice(0, 290));
        setDone("Added to family tasks.");
      }
    } catch (err) {
      setError(friendlyError(err, "Couldn't add it. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-[18px] bg-[var(--c-frame)] p-3.5 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--c-ink)]">
        <Sparkle size={15} weight="fill" className="text-[var(--c-accent)]" aria-hidden />
        Saheli noticed
      </p>
      <p className="mt-1">{shown}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {done ? (
          <p role="status" className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#1f7a4d]">
            <Check size={14} weight="bold" aria-hidden /> {done}
          </p>
        ) : (
          <button type="button" className={PILL_BUTTON} onClick={() => void act()} disabled={busy || appointment === undefined}>
            <Plus size={14} weight="bold" aria-hidden />
            {busy ? "Adding…" : appointment === null ? "Add as a family task" : "Add to doctor questions"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-[var(--c-accent-soft-ink)]">
          {error}
        </p>
      )}
    </div>
  );
}
