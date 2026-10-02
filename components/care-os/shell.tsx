"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowsOut,
  Bell,
  Brain,
  CalendarDots,
  CheckCircle,
  FirstAidKit,
  Heart,
  House,
  List,
  Pill,
  ShoppingBag,
  Sparkle,
  Stethoscope,
  UsersThree,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PersonPicker } from "./person-picker";

export type NavKey = "home" | "today" | "care" | "health" | "orders" | "saheli" | "memory" | "family" | "settings";

const RAIL: Array<{ key: NavKey; label: string; href: string; icon?: PhosphorIcon; text?: string }> = [
  { key: "home", label: "Home", href: "/dashboard", icon: House },
  { key: "today", label: "Today", href: "/dashboard/saheli", icon: CalendarDots },
  { key: "care", label: "Medicines & care", href: "/dashboard/saheli/care", text: "Rx" },
  { key: "health", label: "Health records", href: "/dashboard/record", icon: FirstAidKit },
  { key: "orders", label: "Orders & rides", href: "/dashboard/saheli/tasks", icon: ShoppingBag },
  { key: "memory", label: "What Saheli knows", href: "/dashboard/saheli/memory", icon: Brain },
  { key: "family", label: "Family", href: "/dashboard/family", icon: UsersThree },
];

/** Bottom tab bar on phones: the five places a caregiver opens most. The rest live in the menu drawer. */
const TABS: Array<{ key: NavKey; short: string; href: string; icon: PhosphorIcon }> = [
  { key: "home", short: "Home", href: "/dashboard", icon: House },
  { key: "today", short: "Today", href: "/dashboard/saheli", icon: CalendarDots },
  { key: "care", short: "Medicines", href: "/dashboard/saheli/care", icon: Pill },
  { key: "orders", short: "Orders", href: "/dashboard/saheli/tasks", icon: ShoppingBag },
  { key: "family", short: "Family", href: "/dashboard/family", icon: UsersThree },
];

export type Person = { id: string; name: string; relation?: string; photo?: string | null; self?: boolean };

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function KMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" role="img" aria-label="Kavach CareOS">
      <path d="M20 3.5 33 8v10.5c0 8.3-5.4 14.6-13 18-7.6-3.4-13-9.7-13-18V8Z" fill="#143429" />
      <path d="M15 12v16M15 20l9-8M17.5 18l7.5 10" stroke="#f3f4f2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="28" cy="29" r="3" fill="#d3541e" />
    </svg>
  );
}

export function CareShell({
  active,
  people,
  selectedId,
  loadingPeople,
  onSelectPerson,
  me,
  alerts = 0,
  onMenu,
  children,
}: {
  active: NavKey;
  people: Person[];
  loadingPeople?: boolean;
  selectedId: string | null;
  onSelectPerson?: (id: string) => void;
  me: { name: string };
  alerts?: number;
  onMenu?: () => void;
  children: React.ReactNode;
}) {
  const now = useClock();
  const pathname = usePathname();
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  const date = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

  return (
    <div className="care-os h-dvh w-full overflow-hidden">
      <div className="flex h-full w-full overflow-hidden bg-[var(--c-frame)]">
        <aside className="hidden w-[84px] shrink-0 flex-col items-center justify-between border-r border-[var(--c-line)] py-6 md:flex">
          <div className="flex flex-col items-center gap-1">
            <Link href="/dashboard" className="flex flex-col items-center gap-1">
              <KMark />
              <span className="text-[11px] font-medium">Kavach</span>
            </Link>
            <nav aria-label="Main" className="mt-8 flex flex-col items-center gap-3">
              {RAIL.map((n) => {
                const on = n.key === active;
                return (
                  <Link
                    key={n.key}
                    href={n.href}
                    aria-label={n.label}
                    title={n.label}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full border text-[12px] font-medium transition-colors",
                      on
                        ? "border-transparent bg-[var(--c-accent)] text-[var(--c-accent-ink)]"
                        : "border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]",
                    )}
                  >
                    {n.icon ? <n.icon size={19} weight={on ? "fill" : "regular"} /> : n.text}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="rounded-full bg-[var(--c-card)] px-2.5 py-1.5 text-[12px] font-medium tabular-nums">{time}</span>
            <Link
              href={pathname === "/dashboard" ? "/dashboard/saheli" : "/dashboard"}
              aria-label="Switch view"
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--c-ink-2)] hover:text-[var(--c-ink)]"
            >
              <ArrowsOut size={18} />
            </Link>
            <Link href="/dashboard/settings" aria-label="Settings" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--c-ink)] text-[var(--c-frame)]">
              <ArrowDownLeft size={18} weight="bold" />
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-4 sm:flex-wrap sm:gap-3 sm:px-8 sm:pt-7">
            <div className="flex min-w-0 items-center gap-3 max-sm:flex-1">
              <div className="hidden items-center rounded-full border border-[var(--c-line)] p-1 lg:flex">
                {[
                  { icon: Stethoscope, href: "/dashboard/record", label: "Health records" },
                  { icon: CalendarDots, href: "/dashboard/saheli", label: "Today" },
                  { icon: CheckCircle, href: "/dashboard/saheli/care", label: "Approvals" },
                ].map((b) => (
                  <Link
                    key={b.href}
                    href={b.href}
                    aria-label={b.label}
                    title={b.label}
                    className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] first:ml-0 hover:bg-[var(--c-card)]"
                  >
                    <b.icon size={18} />
                  </Link>
                ))}
              </div>
              <div className="flex min-w-0 items-center gap-1 rounded-full sm:border sm:border-[var(--c-line)] sm:p-1 sm:pr-2">
                <PersonPicker people={people} loading={loadingPeople} selectedId={selectedId} onSelect={onSelectPerson} />
                <span className="hidden items-center gap-3 px-2 text-[var(--c-ink)] sm:flex" aria-hidden>
                  <Heart size={18} weight="fill" />
                  <Pill size={18} weight="fill" />
                  <Sparkle size={18} weight="fill" />
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2.5 xl:flex">
                <Sparkle size={22} weight="fill" />
                <div className="leading-tight">
                  <p className="text-[13px] font-medium">Hi {me.name.split(" ")[0]},</p>
                  <p className="text-[11px] text-[var(--c-ink-3)]">Welcome to Kavach</p>
                </div>
              </div>
              <Link
                href="/dashboard/notifications"
                aria-label={alerts ? `Notifications, ${alerts} unread` : "Notifications"}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-line)] text-[13px] sm:h-12 sm:w-auto sm:justify-start sm:gap-2.5 sm:pl-3 sm:pr-1.5"
              >
                <Bell size={18} />
                <span className="hidden sm:inline">{date}</span>
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--c-ink)] px-1.5 text-[11px] text-[var(--c-frame)]",
                    "max-sm:absolute max-sm:-right-1 max-sm:-top-1 max-sm:h-5 max-sm:min-w-5 max-sm:border-2 max-sm:border-[var(--c-frame)] max-sm:bg-[var(--c-accent)] max-sm:px-1 max-sm:text-[10px]",
                    !alerts && "max-sm:hidden",
                  )}
                >
                  {alerts}
                </span>
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={onMenu}
                  aria-label="Menu"
                  aria-haspopup="menu"
                  className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--c-line)] hover:bg-[var(--c-card)] sm:h-12 sm:w-12"
                >
                  <List size={20} />
                </button>
              </div>
            </div>
          </header>
          <main className="c-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-3 sm:px-8 md:pb-8">{children}</main>
        </div>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 grid grid-cols-5 gap-1 rounded-[26px] bg-[var(--c-ink)] p-1.5 shadow-[0_18px_40px_-18px_rgba(20,42,34,0.6)] md:hidden"
      >
        {TABS.map((n) => {
          const on = n.key === active;
          return (
            <Link
              key={n.key}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={cn("flex min-w-0 flex-col items-center gap-0.5 rounded-[20px] py-1.5 text-[10.5px] font-medium", on ? "text-white" : "text-white/60")}
            >
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", on && "bg-[var(--c-accent)]")}>
                <n.icon size={18} weight={on ? "fill" : "regular"} />
              </span>
              <span className="max-w-full truncate">{n.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
