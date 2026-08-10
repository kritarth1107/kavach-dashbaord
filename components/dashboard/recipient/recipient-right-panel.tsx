"use client";

import Link from "next/link";
import {
  Bell,
  ChevronRight,
  FileText,
  Heart,
  Pill,
  Settings,
  Users,
} from "lucide-react";
import { useFamily } from "@/components/dashboard/family-context";

const todaySchedule = [
  { time: "8:00 AM", label: "Morning check-in", done: true },
  { time: "9:00 AM", label: "Blood pressure medicine", done: true },
  { time: "6:00 PM", label: "Evening medicines", done: false },
];

const recentReports = [
  {
    title: "TSH panel",
    date: "8 Aug 2026",
    href: "/dashboard/reports",
  },
  {
    title: "Monthly vitals summary",
    date: "1 Aug 2026",
    href: "/dashboard/reports",
  },
];

const careCircle = [
  { name: "Kritarth Agrawal", role: "Primary caregiver" },
  { name: "Priya Sharma", role: "Co-caregiver" },
];

export function RecipientRightPanel() {
  const { activeFamily } = useFamily();
  const familyName = activeFamily?.name ?? "Your family";

  return (
    <aside className="no-scrollbar flex h-screen min-w-0 flex-1 shrink-0 flex-col overflow-y-auto border-l border-[#f0f0f2] px-5 py-6">
      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f7] text-[#6b7280] hover:bg-[#ececef]"
        >
          <Settings className="h-[16px] w-[16px]" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f7] text-[#6b7280] hover:bg-[#ececef]"
        >
          <Bell className="h-[16px] w-[16px]" strokeWidth={2} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-primary/20 bg-primary-light p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" strokeWidth={2.25} />
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
            Saheli · Active
          </p>
        </div>
        <p className="mt-2 text-[14px] font-bold text-[#111827]">
          Your care companion is connected
        </p>
        <p className="mt-1 text-[12px] text-[#6b7280]">
          Check-ins and reminders are running for {familyName}.
        </p>
      </div>

      <p className="mb-3 text-[12px] font-bold text-[#1a1a1a]">Today&apos;s schedule</p>
      <div className="panel-card mb-5 p-3">
        {todaySchedule.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 border-b border-[#f5f5f7] py-3 last:border-0 last:pb-0 first:pt-0"
          >
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                item.done ? "bg-primary text-white" : "border-2 border-[#d1d5db] bg-white"
              }`}
            >
              {item.done && (
                <span className="text-[10px] font-bold leading-none">✓</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-[#111827]">{item.label}</p>
              <p className="text-[11px] text-[#9ca3af]">{item.time}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] font-bold text-[#1a1a1a]">Recent reports</p>
        <Link
          href="/dashboard/reports"
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="panel-card mb-5 p-2">
        {recentReports.map((report) => (
          <Link
            key={report.title}
            href={report.href}
            className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#fafafa]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe]">
              <FileText className="h-4 w-4 text-[#2563eb]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-[#111827]">{report.title}</p>
              <p className="text-[11px] text-[#9ca3af]">{report.date}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#c4c4c4]" strokeWidth={2} />
          </Link>
        ))}
      </div>

      <p className="mb-3 text-[12px] font-bold text-[#1a1a1a]">Your care circle</p>
      <div className="panel-card mb-5 p-3">
        {careCircle.map((person) => (
          <div
            key={person.name}
            className="flex items-center gap-3 border-b border-[#f5f5f7] py-3 last:border-0 last:pb-0 first:pt-0"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-[11px] font-bold text-primary">
              {person.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-[#111827]">{person.name}</p>
              <p className="text-[11px] text-[#9ca3af]">{person.role}</p>
            </div>
          </div>
        ))}
        <Link
          href="/dashboard/chat"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] py-2 text-[11px] font-bold text-[#374151] hover:bg-[#fafafa]"
        >
          <Users className="h-3.5 w-3.5" strokeWidth={2} />
          Message your family
        </Link>
      </div>

      <div className="dark-card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-4 bottom-0 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative z-10">
          <p className="text-[11px] font-medium text-white/50">Next reminder</p>
          <p className="mt-1 text-[15px] font-extrabold leading-snug text-white">
            Evening medicines at 6:00 PM
          </p>
          <p className="mt-2 text-[12px] text-white/60">
            2 tablets · take after dinner
          </p>
        </div>
        <div className="absolute -right-1 bottom-0 flex h-[90px] w-[80px] items-end justify-center pb-3">
          <Pill className="h-10 w-10 text-primary/40" strokeWidth={1.5} />
        </div>
      </div>
    </aside>
  );
}
