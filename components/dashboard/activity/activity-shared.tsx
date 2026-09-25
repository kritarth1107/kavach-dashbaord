"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ListTree, Loader2, ShieldAlert, UserRound } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  canManageFamilyMembers,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { getFamilyMembers } from "@/lib/api";
import { cn } from "@/lib/utils";

export const IST = "Asia/Kolkata";

export type CareRecipientOption = { userId: string; name: string };

/* ------------------------------------------------------------------ */
/* Time helpers (all rendering in IST)                                */
/* ------------------------------------------------------------------ */

export function istDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Midday UTC of an IST day key — safe anchor for arithmetic + formatting. */
function dayKeyAnchor(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 6, 30));
}

export function isValidDayKey(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(dayKeyAnchor(value).getTime());
}

export function shiftDayKey(dayKey: string, delta: number): string {
  const d = dayKeyAnchor(dayKey);
  d.setUTCDate(d.getUTCDate() + delta);
  return istDayKey(d);
}

export function dayKeyLabel(dayKey: string, today = istDayKey()): string {
  const d = dayKeyAnchor(dayKey);
  const long = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: dayKey.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined,
  }).format(d);
  if (dayKey === today) return `Today · ${long}`;
  if (dayKey === shiftDayKey(today, -1)) return `Yesterday · ${long}`;
  return long;
}

export function dayKeyParts(dayKey: string) {
  const d = dayKeyAnchor(dayKey);
  return {
    weekday: new Intl.DateTimeFormat("en-IN", { timeZone: IST, weekday: "short" }).format(d),
    day: new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat("en-IN", { timeZone: IST, month: "short" }).format(d),
  };
}

export function formatIstTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .toUpperCase();
}

export function formatIstDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
  }).format(d);
  return `${date}, ${formatIstTime(iso)} IST`;
}

export function relativeTime(iso: string | null | undefined, now: number): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.round((now - t) / 1000);
  if (diff < 45) return "just now";
  const mins = Math.round(diff / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatIstDateTime(iso);
}

/** Ticks every minute so relative times stay fresh. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/* ------------------------------------------------------------------ */
/* WhatsApp-style text (*bold*)                                        */
/* ------------------------------------------------------------------ */

export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, i) =>
        /^\*[^*\n]+\*$/.test(part) ? (
          <strong key={i} className="font-semibold text-[var(--text-primary)]">
            {part.slice(1, -1)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}

export function humanize(value: string): string {
  const s = value.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------------------------------------------ */
/* URL state                                                           */
/* ------------------------------------------------------------------ */

export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { searchParams, setParams };
}

/* ------------------------------------------------------------------ */
/* Care recipients of the active family                                */
/* ------------------------------------------------------------------ */

type RecipientsState = {
  key: string | null;
  recipients: CareRecipientOption[];
  error: string;
};

export function useCareRecipients() {
  const { activeFamilyId, activeFamily, loading: familyLoading } = useFamily();
  const role = activeFamily?.role ?? null;
  const isCaregiver = canManageFamilyMembers(role);
  const isRecipient = isCareRecipientRole(role);
  const [state, setState] = useState<RecipientsState>({ key: null, recipients: [], error: "" });

  useEffect(() => {
    if (!activeFamilyId || !isCaregiver) return;
    let cancelled = false;
    getFamilyMembers(activeFamilyId)
      .then(({ data }) => {
        if (cancelled) return;
        const recipients = (data?.members ?? [])
          .map(apiMemberToFamilyMember)
          .filter((m) => isCareRecipientRole(m.role) && m.status === "joined" && m.userId)
          .map((m) => ({ userId: m.userId as string, name: m.name }));
        setState({ key: activeFamilyId, recipients, error: "" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          key: activeFamilyId,
          recipients: [],
          error: err instanceof Error ? err.message : "Failed to load family members",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [activeFamilyId, isCaregiver]);

  const ready = state.key === activeFamilyId;
  return {
    familyId: activeFamilyId,
    isCaregiver,
    isRecipient,
    familyLoading,
    loading: familyLoading || (isCaregiver && !!activeFamilyId && !ready),
    recipients: ready ? state.recipients : [],
    error: ready ? state.error : "",
  };
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

const TABS = [
  { href: "/dashboard/activity", label: "Timeline", icon: ListTree },
  { href: "/dashboard/activity/snapshot", label: "Daily snapshot", icon: CalendarDays },
];

export function ActivityHeader({
  recipients,
  selectedId,
  onSelect,
  subtitle,
  actions,
}: {
  recipients: CareRecipientOption[];
  selectedId: string | null;
  onSelect: (userId: string) => void;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = recipients.find((r) => r.userId === selectedId) ?? null;

  const tabHref = (href: string) => {
    const qs = new URLSearchParams();
    const recipient = searchParams.get("recipient");
    const day = searchParams.get("day");
    if (recipient) qs.set("recipient", recipient);
    if (day) qs.set("day", day);
    const s = qs.toString();
    return s ? `${href}?${s}` : href;
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
              {selected ? `${selected.name}'s day with Saheli` : "Saheli activity"}
            </h1>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-tertiary)]">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border-strong)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex rounded-full bg-[var(--surface)] p-1" aria-label="Activity views">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
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

export function CenteredState({
  icon,
  title,
  body,
  action,
  tone = "neutral",
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && (
        <div
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",
            tone === "error" ? "icon-chip-red" : "bg-primary-light text-primary",
          )}
        >
          {icon}
        </div>
      )}
      <p className="text-[14px] font-bold text-[var(--text-primary)]">{title}</p>
      {body && (
        <div className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-[var(--text-tertiary)]">
          {body}
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

/**
 * Handles the "who can see this" gate + recipient selection. Renders children only when a
 * caregiver has a selected care recipient.
 */
export function useRecipientSelection() {
  const info = useCareRecipients();
  const { searchParams, setParams } = useQueryState();
  const requested = searchParams.get("recipient");

  const selectedId = useMemo(() => {
    if (!info.recipients.length) return null;
    if (requested && info.recipients.some((r) => r.userId === requested)) return requested;
    return info.recipients[0].userId;
  }, [info.recipients, requested]);

  const select = useCallback((userId: string) => setParams({ recipient: userId }), [setParams]);

  return { ...info, selectedId, select, searchParams, setParams };
}

export function AccessGate({
  familyId,
  loading,
  isCaregiver,
  isRecipient,
  recipients,
  error,
  children,
}: {
  familyId: string | null;
  loading: boolean;
  isCaregiver: boolean;
  isRecipient: boolean;
  recipients: CareRecipientOption[];
  error: string;
  children: React.ReactNode;
}) {
  if (loading) return <PageSpinner />;
  if (!familyId) {
    return (
      <div className="panel-card">
        <CenteredState title="Select a family" body="Choose a family from the switcher to see Saheli activity." />
      </div>
    );
  }
  if (!isCaregiver) {
    return (
      <div className="panel-card">
        <CenteredState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="For caregivers"
          body={
            isRecipient
              ? "Your family's caregivers can see a summary of your day with Saheli here."
              : "Only primary and co-caregivers of this family can view Saheli activity and daily snapshots."
          }
        />
      </div>
    );
  }
  if (error) {
    return (
      <div className="panel-card">
        <CenteredState tone="error" icon={<ShieldAlert className="h-6 w-6" />} title="Couldn't load family" body={error} />
      </div>
    );
  }
  if (!recipients.length) {
    return (
      <div className="panel-card">
        <CenteredState
          icon={<UserRound className="h-6 w-6" />}
          title="No care recipient yet"
          body="Once a care recipient joins this family and starts chatting with Saheli on WhatsApp, their day shows up here."
          action={
            <Link
              href="/dashboard/family"
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white"
            >
              Manage family
            </Link>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}
