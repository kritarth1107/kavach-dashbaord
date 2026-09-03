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
    <header className="theme-header relative z-10 flex h-[76px] shrink-0 items-center gap-5 border-b px-8 backdrop-blur-xl">
      <h1 className="shrink-0 text-[17px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
        {title}
      </h1>

      <div className="mx-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--elevated-muted)] px-4 py-3 transition-colors focus-within:border-primary/30 focus-within:bg-[var(--card)]">
        <Search className="h-[17px] w-[17px] shrink-0 text-[var(--text-tertiary)]" strokeWidth={2.25} />
        <input
          type="search"
          placeholder="Search anything..."
          className="flex-1 bg-transparent text-[13.5px] font-medium text-[var(--text-primary)] placeholder:font-normal placeholder:text-[var(--text-tertiary)] outline-none"
        />
        <kbd className="hidden items-center gap-0.5 rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-2 py-1 text-[10px] font-semibold text-[var(--text-tertiary)] shadow-sm sm:flex">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          aria-label="Help"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] transition-all hover:border-primary/30 hover:text-primary"
        >
          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] transition-all hover:border-primary/30 hover:text-primary"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-[var(--card)] bg-[#ef4444]" />
        </button>

        <button
          type="button"
          className="ml-1 flex items-center gap-3 rounded-2xl border border-transparent py-1 pl-1 pr-3 transition-all hover:border-[var(--border)] hover:bg-[var(--elevated-muted)]"
        >
          <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-[var(--border-strong)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#c4b5fd] via-[#a78bfa] to-[#7c3aed]" />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white">
              PS
            </div>
          </div>
          <div className="hidden text-left lg:block">
            <p className="text-[13.5px] font-bold leading-tight text-[var(--text-primary)]">
              Priya Sharma
            </p>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">@priya.sharma</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-[var(--text-tertiary)] lg:block" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}
