"use client";

import Link from "next/link";
import {
  Bell,
  Brain,
  CalendarDots,
  ChatCircleDots,
  FirstAidKit,
  Gear,
  HouseLine,
  Pill,
  Plus,
  Question,
  ShoppingBagOpen,
  UsersThree,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { KavachMark, KavachWordmark } from "./illustrations";
import { Avatar, type Tone } from "./ui";

export type NavKey = "home" | "today" | "care" | "health" | "orders" | "saheli" | "memory" | "family" | "settings";

const NAV: Array<{ key: NavKey; label: string; href: string; icon: PhosphorIcon }> = [
  { key: "home", label: "Home", href: "/dashboard", icon: HouseLine },
  { key: "today", label: "Today", href: "/dashboard/saheli", icon: CalendarDots },
  { key: "care", label: "Medicines & care", href: "/dashboard/saheli/care", icon: Pill },
  { key: "health", label: "Health records", href: "/dashboard/record", icon: FirstAidKit },
  { key: "orders", label: "Orders & rides", href: "/dashboard/saheli/tasks", icon: ShoppingBagOpen },
  { key: "saheli", label: "Talk to Saheli", href: "/dashboard/chat", icon: ChatCircleDots },
  { key: "memory", label: "What Saheli knows", href: "/dashboard/saheli/memory", icon: Brain },
  { key: "family", label: "Family", href: "/dashboard/family", icon: UsersThree },
];

export type Person = { id: string; name: string; relation?: string; tone?: Tone };

export function CareShell({
  active,
  people,
  selectedId,
  onSelectPerson,
  me,
  alerts = 0,
  dateLabel,
  children,
}: {
  active: NavKey;
  people: Person[];
  selectedId: string | null;
  onSelectPerson?: (id: string) => void;
  me: { name: string };
  alerts?: number;
  dateLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="care-os flex h-dvh w-full gap-4 overflow-hidden p-3 sm:p-4 [&_*]:box-border">
      <nav
        aria-label="Main"
        className="c-card hidden w-[76px] shrink-0 flex-col items-center justify-between rounded-[32px] py-5 md:flex"
      >
        <div className="flex flex-col items-center gap-6">
          <Link href="/dashboard" aria-label="Kavach home" className="block">
            <KavachMark className="h-9 w-9" />
          </Link>
          <ul className="flex flex-col items-center gap-2">
            {NAV.map(({ key, label, href, icon: Icon }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active === key ? "page" : undefined}
                  className={cn(
                    "group relative flex h-11 w-11 items-center justify-center rounded-full transition-all",
                    active === key ? "bg-[var(--c-ink)] text-[#f3a77c]" : "text-[var(--c-ink-2)] hover:bg-[var(--c-card-solid)]",
                  )}
                >
                  <Icon size={21} weight={active === key ? "fill" : "duotone"} />
                  <span className="pointer-events-none absolute left-[54px] z-20 whitespace-nowrap rounded-full bg-[var(--c-ink)] px-3 py-1.5 text-[12px] font-semibold text-[var(--c-bg)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Link href="/dashboard/help" aria-label="Help" className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--c-ink-2)] hover:bg-[var(--c-card-solid)]">
            <Question size={21} weight="duotone" />
          </Link>
          <Link
            href="/dashboard/settings"
            aria-label="Settings"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full",
              active === "settings" ? "bg-[var(--c-ink)] text-[#f3a77c]" : "text-[var(--c-ink-2)] hover:bg-[var(--c-card-solid)]",
            )}
          >
            <Gear size={21} weight="duotone" />
          </Link>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-center gap-4">
          <Link href="/dashboard" className="hidden shrink-0 xl:block" aria-label="Kavach CareOS home">
            <KavachWordmark className="h-10 w-auto" />
          </Link>
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-full p-1.5 c-card" role="tablist" aria-label="Who you are caring for">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === selectedId}
                onClick={() => onSelectPerson?.(p.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full py-1 pl-1 pr-4 text-[13px] font-semibold transition-all",
                  p.id === selectedId ? "bg-[var(--c-ink)] text-[var(--c-bg)]" : "text-[var(--c-ink-2)] hover:bg-[var(--c-card-solid)]",
                )}
              >
                <Avatar name={p.name} tone={p.tone ?? "peach"} size={30} />
                <span className="whitespace-nowrap">{p.relation || p.name}</span>
              </button>
            ))}
            <Link href="/dashboard/family" aria-label="Add someone to care for" className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-[var(--c-ink-2)] hover:bg-[var(--c-card-solid)]">
              <Plus size={16} weight="bold" />
            </Link>
          </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="c-card hidden rounded-full px-4 py-2.5 text-[13px] font-semibold text-[var(--c-ink-2)] sm:inline-block">{dateLabel}</span>
            <Link href="/dashboard/notifications" aria-label={`Notifications${alerts ? `, ${alerts} new` : ""}`} className="c-card relative flex h-11 w-11 items-center justify-center rounded-full">
              <Bell size={19} weight="duotone" />
              {alerts > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--c-accent)] px-1 text-[10px] font-bold text-white">
                  {alerts}
                </span>
              )}
            </Link>
            <Link href="/dashboard/settings" aria-label="Your profile" className="c-card flex h-11 items-center gap-2 rounded-full p-1 pr-3">
              <Avatar name={me.name} tone="sky" size={34} />
              <span className="hidden text-[13px] font-semibold lg:inline">{me.name.split(" ")[0]}</span>
            </Link>
          </div>
        </header>
        <main className="c-scroll min-h-0 flex-1 overflow-y-auto pb-24 md:pb-6">{children}</main>
      </div>

      <nav aria-label="Main" className="c-card fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-full px-2 py-2 md:hidden">
        {NAV.filter((n) => ["home", "today", "care", "orders", "family"].includes(n.key)).map(({ key, label, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            aria-label={label}
            className={cn("flex h-11 w-11 items-center justify-center rounded-full", active === key ? "bg-[var(--c-ink)] text-[#f3a77c]" : "text-[var(--c-ink-2)]")}
          >
            <Icon size={21} weight={active === key ? "fill" : "duotone"} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
