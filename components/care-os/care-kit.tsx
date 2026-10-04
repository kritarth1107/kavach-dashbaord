"use client";

/**
 * Small shared pieces for the emergency card, care team and report pages:
 * a right-side drawer, form fields, a load hook, IST date helpers and a print sheet
 * that prints only its own content (no shell) on A4.
 */
import { WhatsappLogo, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export const INPUT =
  "h-11 w-full rounded-[14px] border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[14px] text-[var(--c-ink)] outline-none transition-colors placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)]";
export const LABEL = "mb-1.5 block px-1 text-[12px] font-medium text-[var(--c-ink-2)]";

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

/** Two-tone page heading used by every Care OS page. */
export function PageHeading({ top, bottom }: { top: string; bottom: string }) {
  return (
    <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
      <span className="block font-light text-[var(--c-ink-3)]">{top}</span>
      <span className="block font-medium">{bottom}</span>
    </h1>
  );
}

/** One muted line: how to do the same thing with Saheli on WhatsApp. */
export function WhatsAppHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-[12px] text-[var(--c-ink-3)] print:hidden", className)}>
      <WhatsappLogo size={14} className="mt-[1px] shrink-0" />
      <span>On WhatsApp: {children}</span>
    </p>
  );
}

export function Notice({ children, tone = "soft" }: { children: React.ReactNode; tone?: "soft" | "plain" }) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-[14px] px-4 py-2.5 text-[13px]",
        tone === "soft" ? "bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)]" : "bg-[var(--c-card)]",
      )}
    >
      {children}
    </p>
  );
}

/** Right-side drawer, same feel as the memory and address book editors. */
export function SideDrawer({
  open,
  onClose,
  top,
  bottom,
  label,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  top: string;
  bottom: string;
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    // modal: focus moves into the drawer, Tab stays inside it, and focus goes back where it was on close.
    // The drawer slides in (visibility changes with the transition), so keep trying until it can take focus.
    const before = document.activeElement as HTMLElement | null;
    const tries = [0, 60, 160, 340].map((ms) =>
      setTimeout(() => {
        const p = panel.current;
        if (!p || p.contains(document.activeElement)) return;
        p.querySelector<HTMLElement>("button, [href], input, textarea, select")?.focus();
      }, ms),
    );
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeRef.current();
      if (e.key !== "Tab" || !panel.current) return;
      const f = Array.from(panel.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), textarea, select"));
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      } else if (!panel.current.contains(document.activeElement)) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      tries.forEach(clearTimeout);
      document.removeEventListener("keydown", keys);
      before?.focus?.();
    };
  }, [open]);

  return (
    <div className={cn("fixed inset-0 z-[60] print:hidden", !open && "pointer-events-none")} aria-hidden={!open}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn("absolute inset-0 bg-[rgba(20,42,34,0.28)] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "care-os absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-[var(--c-frame)] transition-[transform,visibility] duration-300 ease-out",
          open ? "visible translate-x-0 shadow-[-30px_0_80px_-40px_rgba(0,0,0,0.35)]" : "invisible translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-6">
          <h2 className="min-w-0 text-[28px] leading-tight tracking-[-0.03em]">
            <span className="font-light text-[var(--c-ink-3)]">{top} </span>
            <span className="font-medium">{bottom}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="c-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">{open && children}</div>
        {open && footer && <div className="flex items-center justify-end gap-2 border-t border-[var(--c-line)] px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
}

/**
 * Loads data for a key (family/person/options). Keeps the last result while reloading the same key,
 * and never sets state synchronously inside the effect.
 */
export function useLoad<T>(key: string | null, load: () => Promise<T>) {
  const [tick, setTick] = useState(0);
  const [st, setSt] = useState<{ key: string | null; full: string | null; data: T | null; error: string }>({ key: null, full: null, data: null, error: "" });
  const full = key ? `${key}#${tick}` : null;

  useEffect(() => {
    if (!key || !full) return;
    let off = false;
    load()
      .then((data) => !off && setSt({ key, full, data, error: "" }))
      .catch((e: unknown) => !off && setSt((s) => ({ key, full, data: s.key === key ? s.data : null, error: e instanceof Error ? e.message : "Couldn't load" })));
    return () => {
      off = true;
    };
  }, [key, full, load]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const update = useCallback((fn: (d: T) => T) => setSt((s) => (s.data ? { ...s, data: fn(s.data) } : s)), []);
  const same = st.key === key;
  return {
    data: same ? st.data : null,
    error: same ? st.error : "",
    loading: Boolean(key) && st.full !== full,
    reload,
    update,
  };
}

/* ── dates (everything shown in IST) ────────────────────────────────────── */

export const IST = "Asia/Kolkata";

/** "YYYY-MM-DDTHH:MM" in IST → Date. */
export function istDate(local: string) {
  return new Date(`${local.length === 16 ? `${local}:00` : local}+05:30`);
}
export function fmtDay(d: Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return d.toLocaleDateString("en-IN", { ...opts, timeZone: IST });
}
export function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: IST });
}
/** ISO timestamp → "3 Oct, 9:10 am". */
export function fmtAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${fmtDay(d, { day: "numeric", month: "short" })}, ${fmtTime(d)}`;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/* ── printing ───────────────────────────────────────────────────────────── */

const noop = () => () => undefined;
export function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

const PRINT_CSS = `
.kv-print { display: none; }
@media print {
  @page { size: A4; margin: 12mm; }
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  body > *:not(.kv-print) { display: none !important; }
  html .kv-print.care-os {
    display: block !important;
    --c-frame: #ffffff; --c-card: #f3f4f5; --c-chip: #ffffff; --c-line: #e4e6e9;
    --c-ink: #142a22; --c-ink-2: #66706b; --c-ink-3: #8c948f;
    --c-accent: #d3541e; --c-accent-ink: #ffffff; --c-accent-soft: #fbe4d6; --c-accent-soft-ink: #9c3a10;
    background: #fff; color: #142a22; font-size: 12px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .kv-print .kv-avoid { break-inside: avoid; }
}`;

/**
 * Renders a second copy of its children straight under <body>, hidden on screen.
 * When printing, everything else is hidden, so only this sheet prints, cleanly on A4.
 */
export function PrintSheet({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(
    <div className="care-os kv-print">
      <style>{PRINT_CSS}</style>
      {children}
    </div>,
    document.body,
  );
}
