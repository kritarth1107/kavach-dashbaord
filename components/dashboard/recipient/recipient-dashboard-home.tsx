"use client";

import Link from "next/link";
import {
  Activity,
  ChevronRight,
  FileText,
  Heart,
  Loader2,
  Pill,
  Sun,
} from "lucide-react";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { StatMetricCard } from "@/components/dashboard/charts/stat-metric-card";
import {
  AreaTrendChart,
  BarChart,
  MiniVitalBar,
  ProgressRing,
} from "@/components/dashboard/charts/chart-primitives";
import { RecipientDateHeader } from "./recipient-date-header";
import { useRecipientDate } from "./recipient-date-context";
import { useRecipientDashboardData } from "@/hooks/use-recipient-dashboard-data";
import { cn } from "@/lib/utils";

export type RecipientDashboardHomeProps = {
  subjectName?: string;
  recipientUserId?: string;
  viewAsCaregiver?: boolean;
  healthRecordHref?: string;
};

function PersonalWellnessCard({
  title,
  subtitle,
  status,
  daySchedules,
  dayMeds,
  dayLabs,
  completionPercent,
}: {
  title: string;
  subtitle: string;
  status: string;
  daySchedules: number;
  dayMeds: number;
  dayLabs: number;
  completionPercent: number | null;
}) {
  return (
    <div className="lime-card relative flex h-full w-full flex-col justify-between overflow-hidden p-6 shadow-[0_8px_24px_rgba(22,163,74,0.25)] lg:col-span-2">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">{title}</p>
        <p className="mt-2 text-[2.4rem] font-extrabold leading-none tracking-[-0.04em] text-white">
          {status}
        </p>
        <p className="mt-2 text-[12px] font-semibold text-white/75">{subtitle}</p>
      </div>
      <div className="relative grid grid-cols-4 gap-2">
        {[
          { label: "Tasks", value: String(daySchedules) },
          {
            label: "Adherence",
            value: completionPercent !== null ? `${completionPercent}%` : "—",
          },
          { label: "Records", value: String(dayLabs) },
          { label: "Meds", value: String(dayMeds) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm"
          >
            <p className="text-[9px] font-bold uppercase text-white/60">{item.label}</p>
            <p className="text-[14px] font-extrabold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCompletionCard({
  daySchedules,
  completionPercent,
  dateLabel,
}: {
  daySchedules: Array<{ type: string; title: string }>;
  completionPercent: number | null;
  dateLabel: string;
}) {
  const meds = daySchedules.filter((s) => s.type === "MEDICINE");
  const checkIns = daySchedules.filter((s) => s.type === "CHECK_IN");
  const other = daySchedules.filter(
    (s) => s.type !== "MEDICINE" && s.type !== "CHECK_IN",
  );
  const ringValue = completionPercent ?? (daySchedules.length ? 0 : 0);

  return (
    <div className="panel-card flex h-full flex-col items-center justify-center p-5">
      <p className="mb-1 self-start text-[13px] font-bold text-[var(--text-primary)]">
        {dateLabel} completion
      </p>
      <p className="mb-4 self-start text-[11px] text-[var(--text-tertiary)]">
        Check-ins, medicines & reminders
      </p>
      <ProgressRing value={ringValue} label="done" />
      <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[var(--input-bg)] px-2 py-2">
          <p className="text-[14px] font-extrabold text-primary">{checkIns.length}</p>
          <p className="text-[9px] font-semibold text-[var(--text-tertiary)]">Check-in</p>
        </div>
        <div className="rounded-lg bg-[var(--input-bg)] px-2 py-2">
          <p className="text-[14px] font-extrabold text-primary">{meds.length}</p>
          <p className="text-[9px] font-semibold text-[var(--text-tertiary)]">Medicines</p>
        </div>
        <div className="rounded-lg bg-[var(--input-bg)] px-2 py-2">
          <p className="text-[14px] font-extrabold text-[var(--warning-text)]">{other.length}</p>
          <p className="text-[9px] font-semibold text-[var(--text-tertiary)]">Other</p>
        </div>
      </div>
    </div>
  );
}

function DayActivityLog({
  title,
  subtitle,
  rows,
  healthRecordHref,
}: {
  title: string;
  subtitle: string;
  rows: Array<{
    id: string;
    name: string;
    date: string;
    detail: string;
    status: string;
    kind: "schedule" | "lab" | "check_in";
  }>;
  healthRecordHref?: string;
}) {
  return (
    <div className="panel-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-strong)] px-5 py-4">
        <div>
          <p className="text-[14px] font-bold text-[var(--text-primary)]">{title}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">{subtitle}</p>
        </div>
        {healthRecordHref && (
          <Link
            href={healthRecordHref}
            className="text-[12px] font-semibold text-primary hover:underline"
          >
            Health dashboard
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13px] text-[var(--text-tertiary)]">
          Nothing logged for this day yet.
        </p>
      ) : (
        <div className="divide-y divide-[#f5f5f7]">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
                {row.kind === "lab" ? (
                  <FileText className="h-4 w-4 text-[#60a5fa]" strokeWidth={2} />
                ) : row.kind === "check_in" ? (
                  <Sun className="h-4 w-4 text-[var(--warning-text)]" strokeWidth={2} />
                ) : (
                  <Pill className="h-4 w-4 text-[#a78bfa]" strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[var(--text-primary)]">{row.name}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {row.date} · {row.detail}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                  row.status === "Missed"
                    ? "bg-[var(--danger-bg)] text-[var(--danger-text)]"
                    : row.status === "Done"
                      ? "bg-primary-light text-primary"
                      : row.status === "Upcoming"
                        ? "bg-[var(--surface)] text-[var(--text-secondary)]"
                        : row.status === "Pending"
                          ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
                          : "bg-primary-light text-primary",
                )}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RecipientDashboardHome({
  subjectName = "you",
  recipientUserId,
  viewAsCaregiver = false,
  healthRecordHref,
}: RecipientDashboardHomeProps = {}) {
  const { selectedDate, isToday } = useRecipientDate();
  const firstName = subjectName.split(/\s+/)[0] || subjectName;
  const data = useRecipientDashboardData(recipientUserId, selectedDate, isToday);

  if (data.loading) {
    return (
      <>
        <RecipientDateHeader />
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </>
    );
  }

  const wellnessTitle = viewAsCaregiver
    ? `${firstName}'s wellness · ${data.dateLabel}`
    : `Your wellness · ${data.dateLabel}`;

  return (
    <>
      <RecipientDateHeader />
      {!viewAsCaregiver && <DashboardGreeting variant="recipient" />}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatMetricCard
          label="Adherence"
          value={data.stats.adherence}
          sub={data.stats.adherenceSub}
          icon={Pill}
          iconBg="icon-chip-purple"
        />
        <StatMetricCard
          label="Check-in"
          value={data.stats.checkInStreak}
          sub={data.stats.checkInSub}
          icon={Sun}
          iconBg="icon-chip-yellow"
        />
        <StatMetricCard
          label="Records"
          value={data.stats.vitalsLogged}
          sub={data.stats.vitalsSub}
          icon={Heart}
          iconBg="icon-chip-red"
        />
        <StatMetricCard
          label="Total files"
          value={data.stats.reports}
          sub={data.stats.reportsSub}
          icon={FileText}
          iconBg="icon-chip-blue"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <PersonalWellnessCard
          title={wellnessTitle}
          subtitle={`${data.daySchedules.length} care tasks · ${data.dayLabs.length} records on ${data.shortDate}`}
          status={data.wellnessStatus}
          daySchedules={data.daySchedules.length}
          dayMeds={data.dayMeds.length}
          dayLabs={data.dayLabs.length}
          completionPercent={data.completionPercent}
        />
        <TaskCompletionCard
          daySchedules={data.daySchedules}
          completionPercent={data.completionPercent}
          dateLabel={data.dateLabel}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel-card flex h-full flex-col p-5">
          <p className="text-[13px] font-bold text-[var(--text-primary)]">
            {viewAsCaregiver ? `${firstName}'s care rhythm` : "Care rhythm"}
          </p>
          <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">
            Scheduled tasks · ending {data.shortDate}
          </p>
          <AreaTrendChart
            data={data.weekScheduleCounts}
            labels={data.weekLabels}
            gradientId="careTrendGrad"
          />
        </div>
        <div className="panel-card flex h-full flex-col p-5">
          <p className="text-[13px] font-bold text-[var(--text-primary)]">Medicine schedule</p>
          <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">
            Doses scheduled per day · last 7 days
          </p>
          <BarChart
            data={data.weekMedCounts}
            labels={data.weekLabels}
            maxValue={data.medWeeklyMax}
          />
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border-strong)] pt-4">
            <div>
              <p className="text-[18px] font-extrabold text-[var(--text-primary)]">
                {data.medWeeklyTotal}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">Doses this week</p>
            </div>
            <div>
              <p className="text-[18px] font-extrabold text-primary">
                {data.dayMeds.length}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">On {data.dateLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {data.metrics.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel-card p-5">
            <p className="text-[13px] font-bold text-[var(--text-primary)]">Health markers trend</p>
            <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">
              Parsed from stored lab & vitals text
            </p>
            <AreaTrendChart
              data={data.trendSparkline}
              labels={data.weekLabels}
              gradientId="healthTrendGrad"
              stroke="#0d9488"
              fillColor="#0d9488"
              height={100}
            />
          </div>
          <div className="panel-card p-5">
            <p className="text-[13px] font-bold text-[var(--text-primary)]">Latest vitals snapshot</p>
            <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">From health records on file</p>
            <div className="grid grid-cols-2 gap-3">
              <MiniVitalBar
                label="Blood pressure"
                value={data.vitalsSnapshot.bp ?? "—"}
                unit="mmHg"
                pct={data.vitalsSnapshot.bp ? 72 : 0}
                color="#16a34a"
              />
              <MiniVitalBar
                label="Heart rate"
                value={data.vitalsSnapshot.heartRate?.toString() ?? "—"}
                unit="bpm"
                pct={data.vitalsSnapshot.heartRate ? 65 : 0}
                color="#0d9488"
              />
              <MiniVitalBar
                label="Blood sugar"
                value={data.vitalsSnapshot.glucose?.toString() ?? "—"}
                unit="mg/dL"
                pct={data.vitalsSnapshot.glucose ? 58 : 0}
                color="#0284c7"
              />
              <MiniVitalBar
                label="SpO₂"
                value={data.vitalsSnapshot.spo2?.toString() ?? "—"}
                unit="%"
                pct={data.vitalsSnapshot.spo2 ?? 0}
                color="#059669"
              />
            </div>
          </div>
        </div>
      )}

      {healthRecordHref && (
        <Link
          href={healthRecordHref}
          className="panel-card mb-6 flex items-center gap-4 p-5 transition-colors hover:bg-[var(--input-bg)]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface)]">
            <Activity className="h-5 w-5 text-[#60a5fa]" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-[var(--text-primary)]">Full health monitoring</p>
            <p className="text-[12px] text-[var(--text-tertiary)]">
              Charts, AI insights, lab trends & record management
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
        </Link>
      )}

      <DayActivityLog
        title={viewAsCaregiver ? `${firstName}'s day activity` : "Your day activity"}
        subtitle={`Schedule & records · ${data.dateLabel}`}
        rows={data.activityRows}
        healthRecordHref={healthRecordHref}
      />
    </>
  );
}
