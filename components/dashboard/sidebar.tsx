"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PanelLeft, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavGroupsForRole } from "./nav-config";
import { FamilySwitcher } from "./family-switcher";
import { SidebarProfile } from "./sidebar-profile";
import { useSidebar } from "./sidebar-context";
import { useFamily } from "./family-context";

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center rounded-lg py-2 text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-2" : "gap-2.5 px-3",
        active
          ? "bg-primary-light text-primary"
          : "text-[var(--text-secondary)] hover:bg-[var(--card)]",
      )}
    >
      <Icon
        className={cn(
          "h-[16px] w-[16px] shrink-0",
          active ? "text-primary" : "text-[var(--text-tertiary)]",
        )}
        strokeWidth={active ? 2.25 : 1.75}
      />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--input-bg)] px-1.5 text-[10px] font-bold text-[var(--text-secondary)]">
              {badge}
            </span>
          )}
        </>
      )}
      {collapsed && badge && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
      )}
    </Link>
  );
}

function SidebarBody({
  collapsed,
  onNavigate,
  showClose,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  showClose?: boolean;
}) {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const { activeFamily } = useFamily();
  const navGroupsForRole = getNavGroupsForRole(activeFamily?.role);

  // Most specific nav entry wins (e.g. /dashboard/activity/snapshot over /dashboard/activity).
  const activeHref = navGroupsForRole
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) =>
      href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  return (
    <div className="flex h-full min-h-0 flex-col py-5 pl-4 pr-4">
      <div
        className={cn(
          "mb-4 flex items-center",
          collapsed ? "justify-center pr-0" : "justify-between pr-1",
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggle}
            aria-label="Expand sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--card)] hover:text-primary"
          >
            <PanelLeft className="h-[17px] w-[17px] rotate-180" strokeWidth={1.75} />
          </button>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              title="Kavach"
              onClick={onNavigate}
            >
              <Shield className="h-5 w-5 text-primary" strokeWidth={2.25} />
              <span className="text-[17px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                Kavach
              </span>
            </Link>
            {showClose ? (
              <button
                type="button"
                onClick={onNavigate}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--card)] hover:text-[var(--text-secondary)]"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggle}
                aria-label="Collapse sidebar"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--card)] hover:text-[var(--text-secondary)]"
              >
                <PanelLeft className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </button>
            )}
          </>
        )}
      </div>

      <FamilySwitcher collapsed={collapsed} />

      <nav className="no-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {navGroupsForRole.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                {group.title}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <div key={item.href + item.label} onClick={onNavigate}>
                  <NavLink
                    {...item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <SidebarProfile collapsed={collapsed} />
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-[width] duration-300 ease-in-out lg:flex",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[#0f172a]/45 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-dvh w-[min(86vw,300px)] flex-col bg-[var(--sidebar-bg)] shadow-[8px_0_32px_rgba(15,23,42,0.18)]">
            <SidebarBody
              collapsed={false}
              showClose
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
