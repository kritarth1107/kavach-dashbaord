"use client";

import Link from "next/link";
import {
  Activity,
  Calendar,
  ChevronRight,
  FileText,
  Heart,
  Pill,
  Sun,
} from "lucide-react";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { StatMetricCard } from "@/components/dashboard/charts/stat-metric-card";
import {
  BloodPressureTrendCard,
  TaskCompletionCard,
  VitalsGridCard,
  VitalsTrendCard,
  WeeklyMedsBarCard,
} from "@/components/dashboard/charts/dashboard-chart-cards";
import { RecipientDateHeader } from "./recipient-date-header";

type DashboardCopy = {
  wellnessTitle: string;
  wellnessSub: string;
  adherenceSub: string;
  reportsSub: string;
  careTrendsTitle: string;
  careTrendsSub: string;
  activitySub: string;
  healthLogTitle: string;
  healthLogSub: string;
  recordDetail: string;
  upcomingLink: string;
};

function getCopy(subjectName: string, viewAsCaregiver: boolean): DashboardCopy {
  const firstName = subjectName.split(/\s+/)[0] || subjectName;
  if (!viewAsCaregiver) {
    return {
      wellnessTitle: "Your wellness today",
      wellnessSub: "2/3 tasks complete · next: evening medicines",
      adherenceSub: "Medicine compliance · 30 days",
      reportsSub: "Files in your record",
      careTrendsTitle: "My care trends",
      careTrendsSub: "Check-ins & adherence · you",
      activitySub: "Daily wellness index · 7 days",
      healthLogTitle: "Your health activity",
      healthLogSub: "Check-ins, medicines, vitals & reports",
      recordDetail: "Added to your records",
      upcomingLink: "View activity log",
    };
  }
  return {
    wellnessTitle: `${firstName}'s wellness today`,
    wellnessSub: "2/3 tasks complete · next: evening medicines",
    adherenceSub: `Medicine compliance · ${firstName} · 30 days`,
    reportsSub: `Files in ${firstName}'s record`,
    careTrendsTitle: `${firstName}'s care trends`,
    careTrendsSub: `Check-ins & adherence · ${firstName}`,
    activitySub: `Daily wellness index · ${firstName} · 7 days`,
    healthLogTitle: `${firstName}'s health activity`,
    healthLogSub: "Check-ins, medicines, vitals & reports you're monitoring",
    recordDetail: "Added to their record",
    upcomingLink: "View full activity log",
  };
}

const personalLog = [
  {
    icon: Sun,
    iconBg: "bg-[#fef9c3]",
    name: "Morning check-in",
    date: "10 Aug 2026",
    detail: "Cheerful · via Saheli",
    status: "Done",
  },
  {
    icon: Pill,
    iconBg: "bg-[#ede9fe]",
    name: "Morning medicines",
    date: "10 Aug 2026",
    detail: "2 of 2 taken",
    status: "Done",
  },
  {
    icon: FileText,
    iconBg: "bg-[#dbeafe]",
    name: "TSH lab report",
    date: "8 Aug 2026",
    detailKey: "recordDetail" as const,
    status: "Filed",
  },
  {
    icon: Activity,
    iconBg: "bg-[#dcfce7]",
    name: "Blood pressure log",
    date: "10 Aug 2026",
    detail: "118/76 mmHg · normal",
    status: "Logged",
  },
];

function PersonalWellnessCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="lime-card relative flex h-full w-full flex-col justify-between overflow-hidden p-6 shadow-[0_8px_24px_rgba(22,163,74,0.25)] lg:col-span-2">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">{title}</p>
        <p className="mt-2 text-[2.4rem] font-extrabold leading-none tracking-[-0.04em] text-white">
          On track
        </p>
        <p className="mt-2 text-[12px] font-semibold text-white/75">{subtitle}</p>
      </div>
      <div className="relative grid grid-cols-4 gap-2">
        {[
          { label: "Meds", value: "2/2" },
          { label: "Check-in", value: "Done" },
          { label: "Steps", value: "4.2k" },
          { label: "Sleep", value: "7.1h" },
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

function UpcomingCard({ activityLabel }: { activityLabel: string }) {
  return (
    <div className="panel-card flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#111827]">Coming up</p>
        <Calendar className="h-4 w-4 text-[#9ca3af]" strokeWidth={2} />
      </div>
      <div className="space-y-3">
        {[
          { title: "Evening medicines", time: "Today · 6:00 PM" },
          { title: "Dr. Mehta follow-up", time: "14 Aug · video call" },
          { title: "Monthly vitals review", time: "18 Aug · in clinic" },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-[#f0f0f2] bg-[#fafafa] p-3"
          >
            <p className="text-[12px] font-bold text-[#111827]">{item.title}</p>
            <p className="mt-0.5 text-[11px] text-[#9ca3af]">{item.time}</p>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/alerts"
        className="mt-4 flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
      >
        {activityLabel}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

function PersonalHealthLog({
  title,
  subtitle,
  recordDetail,
}: {
  title: string;
  subtitle: string;
  recordDetail: string;
}) {
  return (
    <div className="panel-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#f0f0f2] px-5 py-4">
        <div>
          <p className="text-[14px] font-bold text-[#111827]">{title}</p>
          <p className="text-[12px] text-[#9ca3af]">{subtitle}</p>
        </div>
        <Link
          href="/dashboard/record"
          className="text-[12px] font-semibold text-primary hover:underline"
        >
          Full record
        </Link>
      </div>
      <div className="divide-y divide-[#f5f5f7]">
        {personalLog.map((row) => (
          <div key={row.name} className="flex items-center gap-4 px-5 py-3.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${row.iconBg}`}
            >
              <row.icon className="h-4 w-4 text-[#374151]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-[#111827]">{row.name}</p>
              <p className="text-[11px] text-[#9ca3af]">
                {row.date} · {"detail" in row ? row.detail : recordDetail}
              </p>
            </div>
            <span className="rounded-md bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary">
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type RecipientDashboardHomeProps = {
  subjectName?: string;
  viewAsCaregiver?: boolean;
};

export function RecipientDashboardHome({
  subjectName = "you",
  viewAsCaregiver = false,
}: RecipientDashboardHomeProps = {}) {
  const copy = getCopy(subjectName, viewAsCaregiver);
  const firstName = subjectName.split(/\s+/)[0] || subjectName;

  return (
    <>
      <RecipientDateHeader />
      {!viewAsCaregiver && <DashboardGreeting variant="recipient" />}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatMetricCard
          label="Adherence"
          value="94%"
          sub={copy.adherenceSub}
          trend="+3%"
          icon={Pill}
          iconBg="bg-[#ede9fe] text-[#7c3aed]"
        />
        <StatMetricCard
          label="Check-in streak"
          value="12"
          sub="Consecutive days"
          trend="+1"
          icon={Sun}
          iconBg="bg-[#fef9c3] text-[#a16207]"
        />
        <StatMetricCard
          label="Vitals logged"
          value="28"
          sub="Readings this month"
          trend="+5"
          icon={Heart}
          iconBg="bg-[#fee2e2] text-[#dc2626]"
        />
        <StatMetricCard
          label="Reports"
          value="6"
          sub={copy.reportsSub}
          trend="2 new"
          icon={FileText}
          iconBg="bg-[#dbeafe] text-[#2563eb]"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <PersonalWellnessCard title={copy.wellnessTitle} subtitle={copy.wellnessSub} />
        <TaskCompletionCard />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VitalsTrendCard title={copy.careTrendsTitle} subtitle={copy.careTrendsSub} />
        <WeeklyMedsBarCard
          title={viewAsCaregiver ? `${firstName} · medicine adherence` : undefined}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BloodPressureTrendCard />
        <VitalsGridCard />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VitalsTrendCard title="Activity score" subtitle={copy.activitySub} />
        </div>
        <UpcomingCard activityLabel={copy.upcomingLink} />
      </div>

      <PersonalHealthLog
        title={copy.healthLogTitle}
        subtitle={copy.healthLogSub}
        recordDetail={copy.recordDetail}
      />
    </>
  );
}
