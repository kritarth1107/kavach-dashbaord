"use client";

import { Bell, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { allNavItems, navGroups } from "./nav-config";

function getBreadcrumb(pathname: string) {
  const careRecipientMatch = pathname.match(/^\/dashboard\/family\/([^/]+)$/);
  if (careRecipientMatch) {
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { section, title } = getBreadcrumb(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[64px] shrink-0 items-center justify-between bg-white px-6 pt-2">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-[13px]"
      >
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-[#9ca3af] transition-colors hover:bg-[#f5f5f7] hover:text-primary"
        >
          <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {section && (
          <>
            <span className="select-none text-[#e5e7eb]">/</span>
            <span className="hidden truncate font-medium text-[#9ca3af] sm:inline">
              {section}
            </span>
          </>
        )}

        <span className="select-none text-[#e5e7eb]">/</span>
        <span className="truncate rounded-lg bg-primary-light px-2.5 py-1.5 font-semibold text-primary">
          {title}
        </span>
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex rounded-full bg-[#f5f5f7] p-1">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
              theme === "light"
                ? "bg-white text-[#111827] shadow-sm"
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
                ? "bg-[#111827] text-white shadow-sm"
                : "text-[#9ca3af]"
            }`}
          >
            Dark
          </button>
        </div>

        <Link
          href="/dashboard/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6b7280] transition-colors hover:bg-primary-light hover:text-primary"
        >
          <Settings className="h-[16px] w-[16px]" strokeWidth={2} />
        </Link>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6b7280] transition-colors hover:bg-primary-light hover:text-primary"
        >
          <Bell className="h-[16px] w-[16px]" strokeWidth={2} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ef4444]" />
        </button>
      </div>
    </header>
  );
}
