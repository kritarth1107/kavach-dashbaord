"use client";

import Image from "next/image";
import {
  Bell,
  ChevronRight,
  MoreHorizontal,
  Pill,
  Settings,
} from "lucide-react";
import { useState } from "react";

const notifications = [
  {
    icon: "⚡",
    title: "Electricity bill (₹1,240)",
    sub: "Due in 2 days · auto-detected",
    time: "4h ago",
    actions: true,
  },
  {
    icon: "💊",
    title: "Evening dose reminder",
    sub: "Mama took both medicines on time",
    time: "8h ago",
    actions: false,
  },
  {
    icon: "🛒",
    title: "Grocery order pending",
    sub: "₹432 · Zepto · needs approval",
    time: "1d ago",
    actions: true,
  },
  {
    icon: "📋",
    title: "Lab report processed",
    sub: "TSH panel filed to health record",
    time: "2d ago",
    actions: false,
  },
];

const quickActions = [
  { label: "Zepto", logo: "/assets/zepto.png" },
  { label: "Swiggy", logo: "/assets/swiggy.webp" },
  { label: "Uber", logo: "/assets/uber.png" },
  { label: "More", icon: MoreHorizontal },
] as const;

export function DashboardRightPanel() {
  const [tab, setTab] = useState<"all" | "alerts" | "archive">("all");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <aside className="no-scrollbar flex h-screen min-w-0 flex-1 shrink-0 flex-col overflow-y-auto border-l border-[#f0f0f2] px-5 py-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex rounded-full bg-[#f5f5f7] p-1">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
              theme === "light"
                ? "bg-white text-[#1a1a1a] shadow-sm"
                : "text-[#9ca3af]"
            }`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
              theme === "dark"
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#9ca3af]"
            }`}
          >
            Dark
          </button>
        </div>
        <button
          type="button"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6b7280] hover:bg-[#ececef]"
        >
          <Settings className="h-[16px] w-[16px]" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6b7280] hover:bg-[#ececef]"
        >
          <Bell className="h-[16px] w-[16px]" strokeWidth={2} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ef4444]" />
        </button>
        <button
          type="button"
          className="ml-auto flex items-center gap-1.5 rounded-full bg-[#1a1a1a] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#333]"
        >
          Approve
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>

      <p className="mb-3 text-[12px] font-bold text-[#1a1a1a]">Quick Actions</p>
      <div className="mb-6 grid grid-cols-4 gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="flex flex-col items-center gap-2 rounded-2xl border border-[#f0f0f2] bg-[#fafafa] px-2 py-3 transition-colors hover:border-[#e5e5e8] hover:bg-white"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              {"logo" in action ? (
                <Image
                  src={action.logo}
                  alt={action.label}
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              ) : (
                <action.icon className="h-[17px] w-[17px] text-[#1a1a1a]" strokeWidth={1.75} />
              )}
            </div>
            <span className="text-[10px] font-semibold text-[#6b7280]">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="panel-card mb-4">
        <div className="flex border-b border-[#f0f0f2] px-4 pt-4">
          {(["all", "alerts", "archive"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`mr-4 border-b-2 pb-3 text-[12px] font-bold capitalize transition-colors ${
                tab === t
                  ? "border-[#1a1a1a] text-[#1a1a1a]"
                  : "border-transparent text-[#9ca3af] hover:text-[#6b7280]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-3">
          {notifications.map((n) => (
            <div
              key={n.title}
              className="mb-3 rounded-2xl border border-[#f5f5f7] bg-[#fafafa] p-3 last:mb-0"
            >
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-base shadow-sm">
                  {n.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-[#1a1a1a]">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#9ca3af]">{n.sub}</p>
                  <p className="mt-1 text-[10px] font-medium text-[#c4c4c4]">{n.time}</p>
                </div>
              </div>
              {n.actions && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white hover:bg-[var(--primary-dark)]"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[#e5e5e8] bg-white px-4 py-1.5 text-[11px] font-bold text-[#6b7280] hover:bg-[#f5f5f7]"
                  >
                    Later
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="dark-card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-4 bottom-0 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative z-10 max-w-[65%]">
          <p className="text-[11px] font-medium text-white/50">Care Plan</p>
          <p className="mt-1 text-[15px] font-extrabold leading-snug text-white">
            Saheli active — full family membership
          </p>
          <button
            type="button"
            className="mt-4 rounded-full bg-primary px-5 py-2 text-[11px] font-extrabold text-white hover:bg-[var(--primary-dark)]"
          >
            View Plan
          </button>
        </div>
        <div className="absolute -right-1 bottom-0 h-[110px] w-[90px] overflow-hidden rounded-tl-3xl bg-gradient-to-br from-[#374151] to-[#1f2937]">
          <div className="flex h-full items-end justify-center pb-3">
            <Pill className="h-10 w-10 text-primary/40" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </aside>
  );
}
