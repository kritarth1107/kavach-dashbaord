"use client";

import Link from "next/link";
import {
  Bell,
  Brain,
  CalendarDots,
  CheckCircle,
  FirstAidKit,
  ForkKnife,
  Heart,
  House,
  List,
  Moon,
  Pill,
  ShoppingBag,
  Siren,
  Sparkle,
  Stethoscope,
  Sun,
  UserPlus,
  UsersThree,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useTheme } from "@/components/providers/theme-provider";
import { ThemeIcon, useThemeLabel } from "@/components/providers/theme-icon";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PersonPicker } from "./person-picker";
import { Avatar } from "./ui";

export type NavKey = "home" | "today" | "care" | "health" | "wellbeing" | "food" | "orders" | "saheli" | "memory" | "emergency" | "family" | "invitations" | "settings";

const RAIL: Array<{ key: NavKey; label: string; href: string; icon?: PhosphorIcon; text?: string }> = [
  { key: "home", label: "Home", href: "/dashboard", icon: House },
  { key: "today", label: "Today", href: "/dashboard/saheli", icon: CalendarDots },
  { key: "care", label: "Medicines & care", href: "/dashboard/saheli/care", text: "Rx" },
  { key: "health", label: "Health records", href: "/dashboard/record", icon: FirstAidKit },
  { key: "wellbeing", label: "Wellbeing", href: "/dashboard/wellbeing", icon: Heart },
  { key: "food", label: "Food diary", href: "/dashboard/nutrition", icon: ForkKnife },
  { key: "orders", label: "Orders & rides", href: "/dashboard/saheli/tasks", icon: ShoppingBag },
  { key: "memory", label: "What Saheli knows", href: "/dashboard/saheli/memory", icon: Brain },
  { key: "emergency", label: "Emergency card", href: "/dashboard/emergency", icon: Siren },
  { key: "family", label: "Family", href: "/dashboard/family", icon: UsersThree },
  { key: "invitations", label: "Invitations", href: "/dashboard/invitations", icon: UserPlus },
];

/** Shortcuts beside the person picker, about whoever is selected. */
const QUICK: Array<{ key: NavKey; label: string; href: string; icon: PhosphorIcon }> = [
  { key: "wellbeing", label: "Wellbeing", href: "/dashboard/wellbeing", icon: Heart },
  { key: "care", label: "Medicines and refills", href: "/dashboard/saheli/care", icon: Pill },
  { key: "emergency", label: "Emergency card", href: "/dashboard/emergency", icon: Siren },
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

/** The time, only after the page is in the browser: a server-rendered clock never matches (it caused a hydration error
 * on every page). */
function useClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return now;
}

function KMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" role="img" aria-label="Kavach CareOS">
      <path d="M20 3.5 33 8v10.5c0 8.3-5.4 14.6-13 18-7.6-3.4-13-9.7-13-18V8Z" fill="var(--c-solid)" />
      <path d="M15 12v16M15 20l9-8M17.5 18l7.5 10" stroke="#f3f4f2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="28" cy="29" r="3" fill="var(--c-accent)" />
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
  foodDiary = false,
  children,
}: {
  active: NavKey;
  people: Person[];
  loadingPeople?: boolean;
  selectedId: string | null;
  onSelectPerson?: (id: string) => void;
  me: { name: string; avatar?: string | null };
  alerts?: number;
  onMenu?: () => void;
  /** Beside the person picker, including Self care. Hidden until the Food diary switch is on. */
  foodDiary?: boolean;
  children: React.ReactNode;
}) {
  const now = useClock();
  const time = now ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }) : "";
  const date = now ? now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "";

  return (
    <div className="care-os h-dvh w-full overflow-hidden">
      <div className="flex h-full w-full overflow-hidden bg-[var(--c-frame)]">
        <aside className="hidden w-[84px] shrink-0 flex-col items-center justify-between border-r border-[var(--c-line)] py-6 md:flex">
          <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto">
            <Link href="/dashboard" className="flex flex-col items-center gap-1">
              <KMark />
              <span className="text-[11px] font-medium">Kavach</span>
            </Link>
            <nav aria-label="Main" className="mt-8 flex flex-col items-center gap-3">
              {RAIL.filter((n) => n.key !== "food" || foodDiary).map((n) => {
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
            <ThemeSwitch />
            <Link
              href="/dashboard/settings"
              aria-label={`Your profile and settings (${me.name})`}
              aria-current={active === "settings" ? "page" : undefined}
              title={me.name}
              className="rounded-full ring-2 ring-[var(--c-frame)] ring-offset-0 outline outline-[1.5px] outline-offset-[2px] outline-[var(--c-line)] transition-[outline-color] hover:outline-[var(--c-accent)]"
            >
              <Avatar name={me.name} src={me.avatar} size={40} />
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
                {foodDiary && (
                  <Link
                    href="/dashboard/nutrition"
                    title="Food diary"
                    aria-label="Food diary"
                    aria-current={active === "food" ? "page" : undefined}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2",
                      active === "food" ? "bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "text-[var(--c-ink)] hover:bg-[var(--c-card)] hover:text-[var(--c-accent-text)]",
                    )}
                  >
                    <ForkKnife size={18} weight="fill" />
                    <span className="text-[13px] font-medium">Food diary</span>
                  </Link>
                )}
                <span className="hidden items-center gap-1 px-1 sm:flex">
                  {QUICK.map((q) => {
                    const on = q.key === active;
                    return (
                      <Link
                        key={q.href}
                        href={q.href}
                        title={q.label}
                        aria-label={q.label}
                        aria-current={on ? "page" : undefined}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                          on ? "bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "text-[var(--c-ink)] hover:bg-[var(--c-card)] hover:text-[var(--c-accent-text)]",
                        )}
                      >
                        <q.icon size={18} weight={on ? "fill" : "regular"} />
                      </Link>
                    );
                  })}
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
                    "flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--c-solid)] px-1.5 text-[11px] text-[var(--c-on-solid)]",
                    "max-sm:absolute max-sm:-right-1 max-sm:-top-1 max-sm:h-5 max-sm:min-w-5 max-sm:border-2 max-sm:border-[var(--c-frame)] max-sm:bg-[var(--c-accent)] max-sm:text-[var(--c-accent-ink)] max-sm:px-1 max-sm:text-[10px]",
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
        className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 grid grid-cols-5 gap-1 rounded-[26px] bg-[var(--c-solid)] p-1.5 shadow-[0_18px_40px_-18px_rgba(27,32,30,0.6)] md:hidden"
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
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", on && "bg-[var(--c-accent)] text-[var(--c-accent-ink)]")}>
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

/** Light / dark switch for the rail (the choice is remembered on this device). */
function ThemeSwitch() {
  const { toggleTheme } = useTheme();
  const { dark, label } = useThemeLabel();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={dark ? "Light mode" : "Dark mode"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-line)] text-[var(--c-ink-2)] transition-colors hover:text-[var(--c-ink)]"
    >
      <ThemeIcon size={18} sun={<Sun size={18} weight="bold" />} moon={<Moon size={18} weight="bold" />} />
    </button>
  );
}
