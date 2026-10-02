"use client";

import { WhatsappLogo, X } from "@phosphor-icons/react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/** Small shared bits for the Care OS feature pages (tasks, spending, wellbeing, refills). */

export const IST = "Asia/Kolkata";

export const INPUT =
  "h-11 w-full rounded-[14px] border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[14px] outline-none transition-colors placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)] disabled:text-[var(--c-ink-3)]";
export const LABEL = "mb-1.5 block px-1 text-[12px] font-medium text-[var(--c-ink-2)]";

/** Parses ISO strings; "YYYY-MM-DDTHH:MM" without a zone is read as IST. */
export function parseIst(iso: string): Date {
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) return new Date(iso);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(`${iso}T12:00:00+05:30`);
  return new Date(`${iso.length === 16 ? `${iso}:00` : iso}+05:30`);
}

export const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST });
export const clock = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
export const shortDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST });

/** "Today", "Yesterday", "Tomorrow" or "Sat, 5 Oct". */
export function dayWord(d: Date, now: number) {
  const k = dayKey(d);
  if (k === dayKey(new Date(now))) return "Today";
  if (k === dayKey(new Date(now - 86_400_000))) return "Yesterday";
  if (k === dayKey(new Date(now + 86_400_000))) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: IST });
}

export function ago(d: Date, now: number) {
  const mins = Math.round((now - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Two-tone page heading: light grey line, then dark medium line. */
export function PageHeading({ light, dark, sub, right }: { light: string; dark: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
          <span className="block font-light text-[var(--c-ink-3)]">{light}</span>
          <span className="block font-medium">{dark}</span>
        </h1>
        {sub && <p className="mt-2 max-w-xl text-[13px] text-[var(--c-ink-2)]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** One short muted line on how to do the same thing with Saheli. */
export function OnWhatsApp({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 px-1 text-[12px] leading-relaxed text-[var(--c-ink-3)]", className)}>
      <WhatsappLogo size={14} className="mt-[2px] shrink-0" />
      <span>
        On WhatsApp: <span className="text-[var(--c-ink-2)]">{children}</span>
      </span>
    </p>
  );
}

/** Right-side drawer for forms, as on the Memory and Address book pages. */
export function Drawer({ open, light, dark, onClose, children }: { open: boolean; light: string; dark: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[rgba(20,42,34,0.28)]" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${light} ${dark}`}
        className="care-os absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-[var(--c-frame)] shadow-[-30px_0_80px_-40px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-6">
          <h2 className="text-[28px] leading-tight tracking-[-0.03em]">
            <span className="font-light text-[var(--c-ink-3)]">{light} </span>
            <span className="font-medium">{dark}</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)]">
            <X size={18} />
          </button>
        </div>
        <div className="c-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-4">{children}</div>
      </aside>
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">{children}</p>;
}
