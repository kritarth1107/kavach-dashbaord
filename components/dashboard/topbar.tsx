"use client";

import {
  Bell,
  ChevronDown,
  HelpCircle,
  Search,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { allNavItems } from "./nav-config";

const titleMap: Record<string, string> = {
  "/dashboard": "Overview",
};

function getTitle(pathname: string) {
  if (titleMap[pathname]) return titleMap[pathname];
  const match = allNavItems.find((item) => item.href === pathname);
  return match?.label ?? "Overview";
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="relative z-10 flex h-[76px] shrink-0 items-center gap-5 border-b border-[rgba(15,23,42,0.06)] bg-white/80 px-8 backdrop-blur-xl">
      <h1 className="shrink-0 text-[17px] font-extrabold tracking-[-0.02em] text-[#0f172a]">
        {title}
      </h1>

      <div className="mx-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[#f8f9fb] px-4 py-3 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition-shadow focus-within:border-[rgba(124,58,237,0.2)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.08),0_4px_12px_rgba(15,23,42,0.06)]">
        <Search className="h-[17px] w-[17px] shrink-0 text-[#94a3b8]" strokeWidth={2.25} />
        <input
          type="search"
          placeholder="Search anything..."
          className="flex-1 bg-transparent text-[13.5px] font-medium text-[#0f172a] placeholder:font-normal placeholder:text-[#94a3b8] outline-none"
        />
        <kbd className="hidden items-center gap-0.5 rounded-lg border border-[#e2e8f0] bg-white px-2 py-1 text-[10px] font-semibold text-[#94a3b8] shadow-sm sm:flex">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          aria-label="Help"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white text-[#64748b] shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:border-[rgba(124,58,237,0.15)] hover:text-[#7c3aed] hover:shadow-[0_4px_12px_rgba(124,58,237,0.1)]"
        >
          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white text-[#64748b] shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:border-[rgba(124,58,237,0.15)] hover:text-[#7c3aed] hover:shadow-[0_4px_12px_rgba(124,58,237,0.1)]"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
        </button>

        <button
          type="button"
          className="ml-1 flex items-center gap-3 rounded-2xl border border-transparent py-1 pl-1 pr-3 transition-all hover:border-[rgba(15,23,42,0.06)] hover:bg-[#f8f9fb] hover:shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-white shadow-[0_4px_12px_rgba(124,58,237,0.25)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#c4b5fd] via-[#a78bfa] to-[#7c3aed]" />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white">
              PS
            </div>
          </div>
          <div className="hidden text-left lg:block">
            <p className="text-[13.5px] font-bold leading-tight text-[#0f172a]">
              Priya Sharma
            </p>
            <p className="text-[11px] font-medium text-[#94a3b8]">@priya.sharma</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-[#94a3b8] lg:block" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}
