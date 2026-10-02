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

export type Person = { id: string; name: string; relation?: string; photo?: string | null };

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
          <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5 sm:px-8 sm:pt-7">
            <div className="flex min-w-0 items-center gap-3">
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
              <div className="flex min-w-0 items-center gap-1 rounded-full border border-[var(--c-line)] p-1 pr-2">
                <PersonPicker people={people} loading={loadingPeople} selectedId={selectedId} onSelect={onSelectPerson} />
                <span className="hidden items-center gap-3 px-2 text-[var(--c-ink)] sm:flex" aria-hidden>
                  <Heart size={18} weight="fill" />
                  <Pill size={18} weight="fill" />
                  <Sparkle size={18} weight="fill" />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2.5 xl:flex">
                <Sparkle size={22} weight="fill" />
                <div className="leading-tight">
                  <p className="text-[13px] font-medium">Hi {me.name.split(" ")[0]},</p>
                  <p className="text-[11px] text-[var(--c-ink-3)]">Welcome to Kavach</p>
                </div>
              </div>
              <Link href="/dashboard/notifications" className="flex h-12 items-center gap-2.5 rounded-full border border-[var(--c-line)] pl-3 pr-1.5 text-[13px]">
                <Bell size={18} />
                <span className="hidden sm:inline">{date}</span>
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--c-ink)] px-1.5 text-[11px] text-[var(--c-frame)]">{alerts}</span>
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={onMenu}
                  aria-label="Menu"
                  aria-haspopup="menu"
                  className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[var(--c-line)] hover:bg-[var(--c-card)]"
                >
                  <List size={20} />
                </button>
              </div>
            </div>
          </header>
          <main className="c-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-24 pt-3 sm:px-8 md:pb-8">{children}</main>
        </div>
      </div>

      <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-full bg-[var(--c-ink)] px-2 py-2 md:hidden">
        {RAIL.filter((n) => ["home", "today", "care", "orders", "family"].includes(n.key)).map((n) => (
          <Link
            key={n.key}
            href={n.href}
            aria-label={n.label}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full text-[12px] font-medium",
              n.key === active ? "bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "text-white/70",
            )}
          >
            {n.icon ? <n.icon size={20} weight={n.key === active ? "fill" : "regular"} /> : n.text}
          </Link>
        ))}
      </nav>
    </div>
  );
}
