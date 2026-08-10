"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, Shield } from "lucide-react";
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
          : "text-[#374151] hover:bg-white",
      )}
    >
      <Icon
        className={cn(
          "h-[16px] w-[16px] shrink-0",
          active ? "text-primary" : "text-[#6b7280]",
        )}
        strokeWidth={active ? 2.25 : 1.75}
      />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f0f0f2] px-1.5 text-[10px] font-bold text-[#6b7280]">
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

export function DashboardSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const { activeFamily } = useFamily();
  const navGroupsForRole = getNavGroupsForRole(activeFamily?.role);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col bg-gradient-to-t from-[#f0fdf4] to-white py-5 pl-4 transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[72px] pr-3" : "w-[260px] pr-5",
      )}
    >
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
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9ca3af] transition-colors hover:bg-white hover:text-primary"
          >
            <PanelLeft className="h-[17px] w-[17px] rotate-180" strokeWidth={1.75} />
          </button>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-2" title="Kavach">
              <Shield className="h-5 w-5 text-primary" strokeWidth={2.25} />
              <span className="text-[17px] font-bold tracking-[-0.02em] text-[#111827]">
                Kavach
              </span>
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label="Collapse sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9ca3af] transition-colors hover:bg-white hover:text-[#374151]"
            >
              <PanelLeft className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>

      <FamilySwitcher collapsed={collapsed} />

      <nav className="no-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {navGroupsForRole.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                {group.title}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href + item.label}
                  {...item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <SidebarProfile collapsed={collapsed} />
    </aside>
  );
}
