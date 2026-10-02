"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Brain, CalendarClock, ShoppingBag, UserRound, type LucideIcon, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCareOverview, type CareOverview } from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import type { CareRecipientOption } from "../activity/activity-shared";

const TABS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard/saheli", label: "Today", icon: CalendarClock },
  { href: "/dashboard/saheli/care", label: "Care record", icon: ClipboardList },
  { href: "/dashboard/saheli/tasks", label: "Orders & rides", icon: ShoppingBag },
  { href: "/dashboard/saheli/memory", label: "Memory", icon: Brain },
];

export function SaheliHeader({
  recipients,
  selectedId,
  onSelect,
  title,
  subtitle,
  badges = {},
  actions,
}: {
  recipients: CareRecipientOption[];
  selectedId: string | null;
  onSelect: (userId: string) => void;
  title: (name: string) => string;
  subtitle: string;
  badges?: Partial<Record<string, number>>;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = recipients.find((r) => r.userId === selectedId) ?? null;
  const tabHref = (href: string) => {
    const recipient = searchParams.get("recipient");
    return recipient ? `${href}?recipient=${encodeURIComponent(recipient)}` : href;
  };

  return (
    <div className="panel-card overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-[15px] font-extrabold text-primary">
            {selected ? selected.name.charAt(0).toUpperCase() : <UserRound className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-[18px] font-extrabold tracking-[-0.01em] text-[var(--text-primary)]">
              {title(selected?.name ?? "Care recipient")}
            </h1>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-tertiary)]">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--border-strong)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="no-scrollbar flex overflow-x-auto rounded-full bg-[var(--surface)] p-1" aria-label="Saheli views">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            const badge = badges[tab.href];
            return (
              <Link
                key={tab.href}
                href={tabHref(tab.href)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all",
                  active
                    ? "bg-[var(--card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {badge ? (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-extrabold leading-[16px] text-white">{badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        {recipients.length > 1 && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Care recipient">
            {recipients.map((r) => (
              <button
                key={r.userId}
                type="button"
                role="tab"
                aria-selected={r.userId === selectedId}
                onClick={() => onSelect(r.userId)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  r.userId === selectedId
                    ? "bg-primary text-white"
                    : "border border-[var(--border-strong)] bg-[var(--card)] text-[var(--text-secondary)] hover:border-primary/40",
                )}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>
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
    <div role="status" className={banner.tone === "ok" ? "status-pill-success rounded-2xl px-4 py-2 text-[12px] font-semibold" : "alert-error"}>
      {banner.text}
    </div>
  );
}

export const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white disabled:opacity-50";
export const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] hover:border-primary/40 disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--danger-text)]/30 bg-[var(--danger-bg)] px-4 py-1.5 text-[11px] font-bold text-[var(--danger-text)] disabled:opacity-50";
