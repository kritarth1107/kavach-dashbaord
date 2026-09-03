"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import type { CareRecordMetrics } from "@/lib/api";
import {
  AreaTrendChart,
  BarChart,
  MiniVitalBar,
  ProgressRing,
  Sparkline,
} from "./chart-primitives";

const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Fallback demo data when metrics API has no events yet. */
const CARE_EVENTS_WEEK = [10, 9, 10, 9, 9, 10, 9];
const DOSES_TAKEN_WEEK = [3, 3, 2, 3, 2, 3, 2];

/** Pulse readings on alternate mornings (Tue, Thu, Sat) — gaps elsewhere. */
const PULSE_SPARSE = [
  { index: 1, value: 78 },
  { index: 3, value: 72 },
  { index: 5, value: 86 },
];

function SparsePulseChart() {
  const width = 400;
  const height = 120;
  const padding = 16;
  const values = PULSE_SPARSE.map((p) => p.value);
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (weekLabels.length - 1);

  const points = PULSE_SPARSE.map(({ index, value }) => ({
    x: padding + index * stepX,
    y: padding + ((max - value) / range) * (height - padding * 2),
    value,
  }));

  const segment = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + (i * (height - padding * 2)) / 3}
            x2={width - padding}
            y2={padding + (i * (height - padding * 2)) / 3}
            stroke="var(--border-strong)"
            strokeWidth="1"
          />
        ))}
        <path d={segment} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.x} cx={p.x} cy={p.y} r="4" fill="#0d9488" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-1">
        {weekLabels.map((label) => (
          <span key={label} className="text-[10px] font-medium text-[var(--text-tertiary)]">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VitalsTrendCard({
  title = "Care Trends",
  subtitle = "Check-ins & adherence",
  metrics,
}: {
  title?: string;
  subtitle?: string;
  metrics?: CareRecordMetrics | null;
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const monthAdherence = [59, 58, 57, 60, 58, 59, 59];
  const weekData =
    metrics && metrics.totalEvents > 0 ? metrics.careEventsByDay : CARE_EVENTS_WEEK;
  const data = period === "week" ? weekData : monthAdherence;
  const checkInRate = metrics?.checkInReplyRate ?? 43;
  const checkInsReplied = metrics?.checkInsReplied ?? 3;
  const checkInsSent = metrics?.checkInsSent ?? 7;
  const dosesTaken = metrics?.dosesTaken ?? 2;
  const dosesDue = metrics?.dosesDue ?? 1;

  return (
    <div className="panel-card flex h-full flex-col p-5">
      <ChartHeader
        title={title}
        subtitle={subtitle}
        period={period}
        onPeriodChange={setPeriod}
      />
      <div className="mb-4 flex-1">
        <AreaTrendChart
          data={data}
          labels={weekLabels}
          gradientId="careTrendGrad"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="dark-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium text-white/50">Check-ins</p>
            <Sparkline color="#22c55e" data={[38, 40, 41, 42, 43, 43, 43]} />
          </div>
          <p className="text-[1.35rem] font-extrabold leading-none text-white">{checkInRate}%</p>
          <p className="mt-1 text-[10px] text-white/40">
            this week · {checkInsReplied} of {checkInsSent || 7} replied
          </p>
        </div>
        <div className="dark-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium text-white/50">Medicines</p>
            <Sparkline color="#22c55e" data={[1, 2, 2, 2, 2, 2, 2]} />
          </div>
          <p className="text-[1.35rem] font-extrabold leading-none text-white">
            {dosesTaken}/{dosesTaken + dosesDue}
          </p>
          <p className="mt-1 text-[10px] text-white/40">this week · from Care Record</p>
        </div>
      </div>
    </div>
  );
}

export function WeeklyMedsBarCard({
  title = "Medicine adherence",
  metrics,
}: {
  title?: string;
  metrics?: CareRecordMetrics | null;
}) {
  const dosesData =
    metrics && metrics.dosesTaken + metrics.dosesDue > 0
      ? metrics.dosesByDay
      : DOSES_TAKEN_WEEK;
  const taken = metrics?.dosesTaken ?? 18;
  const due = metrics?.dosesDue ?? 10;
  const total = taken + due || 28;
  const rate = total > 0 ? Math.round((taken / total) * 100) : 64;

  return (
    <div className="panel-card flex h-full flex-col p-5">
      <p className="text-[13px] font-bold text-[var(--text-primary)]">{title}</p>
      <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">
        Doses taken per day · last 7 days
      </p>
      <BarChart data={dosesData} labels={weekLabels} maxValue={4} />
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--border-strong)] pt-4">
        <div>
          <p className="text-[18px] font-extrabold text-[var(--text-primary)]">
            {taken}/{total}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Doses taken</p>
        </div>
        <div>
          <p className="text-[18px] font-extrabold text-primary">{rate}%</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Weekly rate</p>
        </div>
        <div>
          <p className="text-[18px] font-extrabold text-[var(--text-primary)]">{due}</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Still open</p>
        </div>
      </div>
    </div>
  );
}

export function VitalsGridCard() {
  return (
    <div className="panel-card p-5">
      <p className="text-[13px] font-bold text-[var(--text-primary)]">Vitals snapshot</p>
      <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">
        Latest readings · updated 3h ago (07:41 today)
      </p>
      <div className="grid grid-cols-2 gap-3">
        <MiniVitalBar label="Blood pressure" value="128/78" unit="mmHg" pct={72} color="#16a34a" />
        <MiniVitalBar label="Heart rate" value="78" unit="bpm" pct={58} color="#0d9488" />
        <MiniVitalBar label="Blood sugar" value="132" unit="mg/dL" pct={66} color="#0284c7" />
        <MiniVitalBar label="SpO₂" value="96" unit="%" pct={96} color="#059669" />
      </div>
    </div>
  );
}

export function TaskCompletionCard() {
  return (
    <div className="panel-card flex h-full flex-col items-center justify-center p-5">
      <p className="mb-1 self-start text-[13px] font-bold text-[var(--text-primary)]">
        Today&apos;s completion
      </p>
      <p className="mb-4 self-start text-[11px] text-[var(--text-tertiary)]">
        Check-ins, medicines & reminders
      </p>
      <ProgressRing value={60} label="done" />
      <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[var(--input-bg)] px-2 py-2">
          <p className="text-[14px] font-extrabold text-primary">1/1</p>
          <p className="text-[9px] font-semibold text-[var(--text-tertiary)]">Check-in</p>
        </div>
        <div className="rounded-lg bg-[var(--input-bg)] px-2 py-2">
          <p className="text-[14px] font-extrabold text-primary">2/3</p>
          <p className="text-[9px] font-semibold text-[var(--text-tertiary)]">Morning meds</p>
        </div>
        <div className="rounded-lg bg-[var(--input-bg)] px-2 py-2">
          <p className="text-[14px] font-extrabold text-[var(--warning-text)]">0/1</p>
          <p className="text-[9px] font-semibold text-[var(--text-tertiary)]">Evening meds</p>
        </div>
      </div>
    </div>
  );
}

export function BloodPressureTrendCard() {
  const systolic = [128, 124, 142, 126, 128];
  const diastolic = [78, 76, 88, 76, 78];

  return (
    <div className="panel-card p-5">
      <p className="text-[13px] font-bold text-[var(--text-primary)]">Blood pressure trend</p>
      <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">Recent morning readings · mmHg</p>
      <AreaTrendChart
        data={systolic}
        gradientId="bpSysGrad"
        stroke="#dc2626"
        fillColor="#dc2626"
        height={100}
      />
      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#dc2626]" />
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">
            Systolic avg {Math.round(systolic.reduce((a, b) => a + b, 0) / systolic.length)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#0284c7]" />
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">
            Diastolic avg {Math.round(diastolic.reduce((a, b) => a + b, 0) / diastolic.length)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function FamilyActivityBarCard({ metrics }: { metrics?: CareRecordMetrics | null }) {
  const data =
    metrics && metrics.totalEvents > 0 ? metrics.careEventsByDay : CARE_EVENTS_WEEK;
  const total = metrics?.totalEvents ?? data.reduce((a, b) => a + b, 0);

  return (
    <div className="panel-card flex h-full flex-col p-5">
      <p className="text-[13px] font-bold text-[var(--text-primary)]">Family activity</p>
      <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">Care events logged · last 7 days</p>
      <BarChart data={data} labels={weekLabels} color="#1a1a1a" />
      <div className="mt-4 flex items-center justify-between border-t border-[var(--border-strong)] pt-4">
        <div>
          <p className="text-[18px] font-extrabold text-[var(--text-primary)]">{total}</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">Events this week</p>
        </div>
        <div>
          <p className="text-[18px] font-extrabold text-primary">Live</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">From Care Record</p>
        </div>
      </div>
    </div>
  );
}

export function CareRecipientVitalsCard({ name = "Sudha" }: { name?: string }) {
  const displayName = /sudha/i.test(name) ? "Sudha" : name;

  return (
    <div className="panel-card flex h-full flex-col p-5">
      <ChartHeader
        title={`${displayName} · vitals`}
        subtitle="Heart rate · 7 day trend (alternate mornings)"
        period="week"
        onPeriodChange={() => undefined}
        hideToggle
      />
      <div className="mb-4 flex-1">
        <SparsePulseChart />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[var(--input-bg)] px-3 py-2 text-center">
          <p className="text-[15px] font-extrabold text-[var(--text-primary)]">79</p>
          <p className="text-[9px] font-semibold text-[var(--text-tertiary)]">Avg bpm</p>
        </div>
        <div className="rounded-lg bg-[var(--input-bg)] px-3 py-2 text-center">
          <p className="text-[15px] font-extrabold text-[var(--text-primary)]">128/78</p>
          <p className="text-[9px] font-semibold text-[var(--text-tertiary)]">BP latest</p>
        </div>
        <div className="rounded-lg bg-[var(--input-bg)] px-3 py-2 text-center">
          <p className="text-[15px] font-extrabold text-primary">In range</p>
          <p className="text-[9px] font-semibold text-[var(--text-tertiary)]">Status</p>
        </div>
      </div>
    </div>
  );
}

function ChartHeader({
  title,
  subtitle,
  period,
  onPeriodChange,
  hideToggle,
}: {
  title: string;
  subtitle: string;
  period: "week" | "month";
  onPeriodChange: (p: "week" | "month") => void;
  hideToggle?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <p className="text-[13px] font-bold text-[var(--text-primary)]">{title}</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {!hideToggle && (
          <div className="flex rounded-full bg-[var(--surface)] p-1">
            <button
              type="button"
              onClick={() => onPeriodChange("week")}
              className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                period === "week" ? "bg-[var(--charcoal)] text-white" : "text-[var(--text-tertiary)]"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => onPeriodChange("month")}
              className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                period === "month" ? "bg-[var(--charcoal)] text-white" : "text-[var(--text-tertiary)]"
              }`}
            >
              Month
            </button>
          </div>
        )}
        <button
          type="button"
          aria-label="Expand"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-secondary)]"
        >
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
