"use client";

import Link from "next/link";
import { Bell, LayoutDashboard, Moon, Search, Settings, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { allNavItems, navGroups } from "./nav-config";
import { useTheme } from "@/components/providers/theme-provider";
import { useFamily } from "@/components/dashboard/family-context";
import { getNotifications } from "@/lib/api";
import { cn } from "@/lib/utils";

function getBreadcrumb(pathname: string) {
  const careRecipientMatch = pathname.match(/^\/dashboard\/family\/([^/]+)/);
  if (careRecipientMatch) {
    if (pathname.includes("/health-record")) {
      return { section: "Family", title: "Health monitoring" };
    }
    return { section: "Family", title: "Care overview" };
  }

  const match = allNavItems.find((item) => item.href === pathname);
  const group = navGroups.find((g) =>
    g.items.some((item) => item.href === pathname),
  );

  const title =
    match?.label ??
    (pathname.split("/").pop() ?? "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return { section: group?.title, title };
}

export function PageHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { activeFamilyId } = useFamily();
  const { section, title } = getBreadcrumb(pathname);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!activeFamilyId) return;
    try {
      const { data } = await getNotifications(activeFamilyId);
      setUnreadCount(data?.unreadCount ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void loadUnread();
  }, [loadUnread]);

  return (
    <header className="theme-header sticky top-0 z-20 flex h-[64px] shrink-0 items-center justify-between border-b px-6 pt-2">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-[13px]"
      >
        <Link
          href="/dashboard"
          className="theme-muted flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-colors hover:bg-[var(--surface)] hover:text-primary"
        >
          <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {section && (
          <>
            <span className="select-none text-[var(--text-tertiary)]">/</span>
            <span className="theme-muted hidden truncate font-medium sm:inline">
              {section}
            </span>
          </>
        )}

        <span className="select-none text-[var(--text-tertiary)]">/</span>
        <span className="truncate rounded-lg bg-primary-light px-2.5 py-1.5 font-semibold text-primary">
          {title}
        </span>
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex rounded-full bg-[var(--surface)] p-1">
          <button
            type="button"
            onClick={() => setTheme("light")}
            aria-label="Light mode"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
              theme === "light"
                ? "bg-[var(--card)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-tertiary)]",
            )}
          >
            <Sun className="h-3.5 w-3.5" />
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            aria-label="Dark mode"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
              theme === "dark"
                ? "bg-[var(--card)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-tertiary)]",
            )}
          >
            <Moon className="h-3.5 w-3.5" />
            Dark
          </button>
        </div>

        <Link
          href="/dashboard/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted-fg)] transition-colors hover:bg-primary-light hover:text-primary"
        >
          <Settings className="h-[16px] w-[16px]" strokeWidth={2} />
        </Link>

        <button
          type="button"
          aria-label="Search"
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="hidden h-9 items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 text-[11px] font-medium text-[var(--muted-fg)] transition-colors hover:bg-primary-light hover:text-primary sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <kbd className="rounded border border-[var(--border-strong)] px-1 text-[9px]">⌘K</kbd>
        </button>

        <Link
          href="/dashboard/notifications"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted-fg)] transition-colors hover:bg-primary-light hover:text-primary"
        >
          <Bell className="h-[16px] w-[16px]" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
