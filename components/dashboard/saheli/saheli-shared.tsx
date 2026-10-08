"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Brain, CalendarClock, ShoppingBag, type LucideIcon, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCareOverview, type CareOverview } from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import type { CareRecipientOption } from "../activity/activity-shared";
import { callName, usePerson } from "@/components/care-os/person-context";

const TABS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard/saheli", label: "Today", icon: CalendarClock },
  { href: "/dashboard/saheli/care", label: "Medicines & care", icon: ClipboardList },
  { href: "/dashboard/saheli/tasks", label: "Orders & rides", icon: ShoppingBag },
  { href: "/dashboard/saheli/memory", label: "Memory", icon: Brain },
];

export function SaheliHeader({
  title,
  subtitle,
  badges = {},
  actions,
}: {
  recipients?: CareRecipientOption[];
  selectedId?: string | null;
  onSelect?: (userId: string) => void;
  title: (name: string) => string;
  subtitle: string;
  badges?: Partial<Record<string, number>>;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selected } = usePerson();
  const name = callName(selected) || "Care";
  const full = title(name).replace(/^You's /, "Your ");
  // Two-tone heading: the person in light grey, the page in ink.
  const split = full.lastIndexOf(" ");
  const tabHref = (href: string) => {
    const recipient = searchParams.get("recipient");
    return recipient ? `${href}?recipient=${encodeURIComponent(recipient)}` : href;
  };

  return (
    <div className="pb-2">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[38px] leading-[1.04] tracking-[-0.035em] sm:text-[48px]">
            <span className="block font-light text-[var(--c-ink-3)]">{split > 0 ? full.slice(0, split) : name}</span>
            <span className="block font-medium">{split > 0 ? full.slice(split + 1) : full}</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--c-ink-2)]">{subtitle}</p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav className="no-scrollbar mt-5 flex gap-2 overflow-x-auto" aria-label="Saheli views">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          const badge = badges[tab.href];
          return (
            <Link
              key={tab.href}
              href={tabHref(tab.href)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] border px-3.5 text-[13px] transition-colors",
                active
                  ? "border-transparent bg-[var(--c-accent)] text-white"
                  : "border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {badge ? (
                <span className={cn("rounded-full px-1.5 text-[10px] font-semibold leading-[16px]", active ? "bg-white text-[var(--c-accent)]" : "bg-[var(--c-accent)] text-white")}>
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Loads the care overview for a recipient; pollMs > 0 refreshes it while the page is open. */
export function useCareOverview(familyId: string | null, subjectId: string | null, day?: string, pollMs = 0) {
  const [state, setState] = useState<{ key: string; data: CareOverview | null; error: string }>({ key: "", data: null, error: "" });
  const [tick, setTick] = useState(0);
  const key = `${familyId}|${subjectId}|${day ?? ""}`;
  const req = useRef(0);

  useEffect(() => {
    if (!familyId || !subjectId) return;
    const id = ++req.current;
    getCareOverview(familyId, subjectId, day)
      .then((data) => {
        if (id === req.current) setState({ key, data, error: "" });
      })
      .catch((err: unknown) => {
        if (id === req.current) setState((s) => ({ key, data: s.key === key ? s.data : null, error: err instanceof Error ? err.message : "Failed to load" }));
      });
  }, [familyId, subjectId, day, key, tick]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => setTick((n) => n + 1), pollMs);
    return () => clearInterval(t);
  }, [pollMs]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const fresh = state.key === key;
  return { data: fresh ? state.data : null, error: fresh ? state.error : "", loading: !fresh, reload };
}

export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = useCallback(async (id: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(id);
    setBanner(null);
    try {
      await fn();
      if (ok) setBanner({ tone: "ok", text: ok });
      return true;
    } catch (err) {
      setBanner({ tone: "error", text: err instanceof Error ? err.message : "That did not work. Please try again." });
      return false;
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, banner, setBanner, run };
}

export function Banner({ banner }: { banner: { tone: "ok" | "error"; text: string } | null }) {
  if (!banner) return null;
  return (
    <div role="status" className={banner.tone === "ok" ? "rounded-[14px] bg-[var(--c-ok-soft)] px-4 py-2.5 text-[13px] text-[var(--c-forest)]" : "rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]"}>
      {banner.text}
    </div>
  );
}

export const btnPrimary =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--c-solid)] px-4 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40";
export const btnSecondary =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[12px] font-medium text-[var(--c-ink)] hover:bg-[var(--c-card)] disabled:opacity-40";
export const btnDanger =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--c-accent-soft)] px-4 text-[12px] font-medium text-[var(--c-accent-soft-ink)] hover:brightness-95 disabled:opacity-40";
