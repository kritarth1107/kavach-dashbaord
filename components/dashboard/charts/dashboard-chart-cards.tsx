"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import {
  AreaTrendChart,
  BarChart,
  MiniVitalBar,
  ProgressRing,
  Sparkline,
} from "./chart-primitives";

const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function VitalsTrendCard({
  title = "Care Trends",
  subtitle = "Check-ins & adherence",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const weekData = [82, 88, 85, 90, 87, 94, 91];
  const monthData = [72, 78, 75, 82, 80, 85, 88, 84, 90, 87, 92, 94];
  const data = period === "week" ? weekData : monthData.slice(-7);

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
          labels={period === "week" ? weekLabels : weekLabels}
          gradientId="careTrendGrad"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="dark-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium text-white/50">Check-ins</p>
            <Sparkline color="#22c55e" data={[65, 72, 78, 85, 88, 91, 94]} />
          </div>
          <p className="text-[1.35rem] font-extrabold leading-none text-white">94%</p>
          <p className="mt-1 text-[10px] text-white/40">this week</p>
        </div>
        <div className="dark-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium text-white/50">Medicines</p>
            <Sparkline color="#22c55e" data={[90, 88, 92, 91, 94, 96, 98]} />
          </div>
          <p className="text-[1.35rem] font-extrabold leading-none text-white">2/2</p>
          <p className="mt-1 text-[10px] text-white/40">today</p>
        </div>
      </div>
    </div>
  );
}

export function WeeklyMedsBarCard({ title = "Medicine adherence" }: { title?: string }) {
  const data = [2, 2, 1, 2, 2, 2, 1];

  return (
    <div className="panel-card flex h-full flex-col p-5">
      <p className="text-[13px] font-bold text-[#1a1a1a]">{title}</p>
      <p className="mb-4 text-[11px] text-[#9ca3af]">Doses taken per day · last 7 days</p>
      <BarChart data={data} labels={weekLabels} maxValue={2} />
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#f0f0f2] pt-4">
        <div>
          <p className="text-[18px] font-extrabold text-[#111827]">12/14</p>
          <p className="text-[10px] text-[#9ca3af]">Doses taken</p>
        </div>
        <div>
          <p className="text-[18px] font-extrabold text-primary">86%</p>
          <p className="text-[10px] text-[#9ca3af]">Weekly rate</p>
        </div>
        <div>
          <p className="text-[18px] font-extrabold text-[#111827]">0</p>
          <p className="text-[10px] text-[#9ca3af]">Missed today</p>
        </div>
      </div>
    </div>
  );
}

export function VitalsGridCard() {
  return (
    <div className="panel-card p-5">
      <p className="text-[13px] font-bold text-[#1a1a1a]">Vitals snapshot</p>
      <p className="mb-4 text-[11px] text-[#9ca3af]">Latest readings · updated 2h ago</p>
      <div className="grid grid-cols-2 gap-3">
        <MiniVitalBar label="Blood pressure" value="118/76" unit="mmHg" pct={72} color="#16a34a" />
        <MiniVitalBar label="Heart rate" value="72" unit="bpm" pct={65} color="#0d9488" />
        <MiniVitalBar label="Blood sugar" value="104" unit="mg/dL" pct={58} color="#0284c7" />
        <MiniVitalBar label="SpO₂" value="98" unit="%" pct={98} color="#059669" />
      </div>
    </div>
  );
}

export function TaskCompletionCard() {
  return (
    <div className="panel-card flex h-full flex-col items-center justify-center p-5">
      <p className="mb-1 self-start text-[13px] font-bold text-[#1a1a1a]">
        Today&apos;s completion
      </p>
      <p className="mb-4 self-start text-[11px] text-[#9ca3af]">
        Check-ins, medicines & reminders
      </p>
      <ProgressRing value={67} label="done" />
      <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[#fafafa] px-2 py-2">
          <p className="text-[14px] font-extrabold text-primary">1/1</p>
          <p className="text-[9px] font-semibold text-[#9ca3af]">Check-in</p>
        </div>
        <div className="rounded-lg bg-[#fafafa] px-2 py-2">
          <p className="text-[14px] font-extrabold text-primary">2/2</p>
          <p className="text-[9px] font-semibold text-[#9ca3af]">Morning meds</p>
        </div>
        <div className="rounded-lg bg-[#fafafa] px-2 py-2">
          <p className="text-[14px] font-extrabold text-[#ca8a04]">0/1</p>
          <p className="text-[9px] font-semibold text-[#9ca3af]">Evening meds</p>
        </div>
      </div>
    </div>
  );
}

export function BloodPressureTrendCard() {
  const systolic = [122, 118, 120, 116, 119, 118, 117];
  const diastolic = [78, 76, 77, 74, 76, 75, 76];

  return (
    <div className="panel-card p-5">
      <p className="text-[13px] font-bold text-[#1a1a1a]">Blood pressure trend</p>
      <p className="mb-4 text-[11px] text-[#9ca3af]">7-day average · mmHg</p>
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
          <span className="text-[10px] font-medium text-[#6b7280]">
            Systolic avg {Math.round(systolic.reduce((a, b) => a + b, 0) / systolic.length)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#0284c7]" />
          <span className="text-[10px] font-medium text-[#6b7280]">
            Diastolic avg {Math.round(diastolic.reduce((a, b) => a + b, 0) / diastolic.length)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function FamilyActivityBarCard() {
  const data = [4, 6, 5, 8, 7, 9, 6];

  return (
    <div className="panel-card flex h-full flex-col p-5">
      <p className="text-[13px] font-bold text-[#1a1a1a]">Family activity</p>
      <p className="mb-4 text-[11px] text-[#9ca3af]">Care events logged · last 7 days</p>
      <BarChart data={data} labels={weekLabels} color="#1a1a1a" />
      <div className="mt-4 flex items-center justify-between border-t border-[#f0f0f2] pt-4">
        <div>
          <p className="text-[18px] font-extrabold text-[#111827]">45</p>
          <p className="text-[10px] text-[#9ca3af]">Events this week</p>
        </div>
        <div>
          <p className="text-[18px] font-extrabold text-primary">+12%</p>
          <p className="text-[10px] text-[#9ca3af]">vs last week</p>
        </div>
      </div>
    </div>
  );
}

export function CareRecipientVitalsCard({ name = "Mrs. R" }: { name?: string }) {
  const heartRate = [68, 72, 70, 74, 71, 73, 72];

  return (
    <div className="panel-card flex h-full flex-col p-5">
      <ChartHeader
        title={`${name} · vitals`}
        subtitle="Heart rate · 7 day trend"
        period="week"
        onPeriodChange={() => undefined}
        hideToggle
      />
      <div className="mb-4 flex-1">
        <AreaTrendChart
          data={heartRate}
          labels={weekLabels}
          gradientId="hrGrad"
          stroke="#0d9488"
          fillColor="#0d9488"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[#fafafa] px-3 py-2 text-center">
          <p className="text-[15px] font-extrabold text-[#111827]">72</p>
          <p className="text-[9px] font-semibold text-[#9ca3af]">Avg bpm</p>
        </div>
        <div className="rounded-lg bg-[#fafafa] px-3 py-2 text-center">
          <p className="text-[15px] font-extrabold text-[#111827]">118/76</p>
          <p className="text-[9px] font-semibold text-[#9ca3af]">BP latest</p>
        </div>
        <div className="rounded-lg bg-[#fafafa] px-3 py-2 text-center">
          <p className="text-[15px] font-extrabold text-primary">Normal</p>
          <p className="text-[9px] font-semibold text-[#9ca3af]">Status</p>
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
        <p className="text-[13px] font-bold text-[#1a1a1a]">{title}</p>
        <p className="text-[11px] text-[#9ca3af]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {!hideToggle && (
          <div className="flex rounded-full bg-[#f5f5f7] p-1">
            <button
              type="button"
              onClick={() => onPeriodChange("week")}
              className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                period === "week" ? "bg-[#1a1a1a] text-white" : "text-[#9ca3af]"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => onPeriodChange("month")}
              className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                period === "month" ? "bg-[#1a1a1a] text-white" : "text-[#9ca3af]"
              }`}
            >
              Month
            </button>
          </div>
        )}
        <button
          type="button"
          aria-label="Expand"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6b7280]"
        >
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
