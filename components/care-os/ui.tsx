"use client";

import { ArrowRight, ArrowUpRight, ArrowDownRight, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** Grey panel on the white frame. */
export function Panel({ children, className, accent, ...rest }: React.HTMLAttributes<HTMLElement> & { accent?: boolean }) {
  return (
    <section
      {...rest}
      className={cn("rounded-[24px] p-5", accent ? "bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "bg-[var(--c-card)]", className)}
    >
      {children}
    </section>
  );
}

/** Title with the small square marker. */
export function PanelTitle({ title, right, marker = true }: { title: string; right?: React.ReactNode; marker?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {marker && <span className="h-[14px] w-[14px] rounded-[4px] bg-[var(--c-accent)]" aria-hidden />}
        <h2 className="text-[14px] font-medium">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Tag({ children, tone = "accent", trend, className }: { children: React.ReactNode; tone?: "accent" | "dark" | "light" | "danger" | "ok" | "warn"; trend?: "up" | "down"; className?: string }) {
  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-medium",
        tone === "accent" && "bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)]",
        tone === "dark" && "bg-[var(--c-solid)] text-[var(--c-on-solid)]",
        tone === "light" && "bg-[var(--c-chip)] text-[var(--c-ink-2)]",
        tone === "danger" && "bg-[var(--c-danger-soft)] text-[var(--c-danger-ink)]",
        tone === "ok" && "bg-[var(--c-ok-soft)] text-[var(--c-ok-ink)] dark:bg-[rgba(31,122,77,0.22)] ",
        tone === "warn" && "bg-[var(--c-warn-soft)] text-[var(--c-warn-ink)] dark:bg-[rgba(154,103,0,0.25)] ",
        className,
      )}
    >
      {Icon && <Icon size={11} weight="bold" />}
      {children}
    </span>
  );
}

export function IconCircle({
  icon: Icon,
  active,
  label,
  className,
  size = 44,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: PhosphorIcon; active?: boolean; label: string; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border transition-colors",
        active ? "border-transparent bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink)] hover:bg-[var(--c-card)]",
        className,
      )}
    >
      {Icon ? <Icon size={Math.round(size * 0.42)} weight="regular" /> : rest.children}
    </button>
  );
}

/** Black pill with a white arrow circle, as in "Weekly →". */
export function DarkButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex h-12 items-center gap-4 rounded-full bg-[var(--c-solid)] pl-6 pr-1.5 text-[14px] font-medium text-[var(--c-on-solid)] transition-opacity hover:opacity-90 disabled:opacity-40",
        className,
      )}
    >
      {children}
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-frame)] text-[var(--c-ink)]">
        <ArrowRight size={16} weight="bold" />
      </span>
    </button>
  );
}

export function SmallButton({ children, dark, className, icon: Icon, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { dark?: boolean; icon?: PhosphorIcon }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium transition-colors disabled:opacity-40",
        dark ? "bg-[var(--c-solid)] text-[var(--c-on-solid)] hover:opacity-90" : "border border-[var(--c-line)] bg-[var(--c-frame)] hover:bg-[var(--c-card)]",
        className,
      )}
    >
      {Icon && <Icon size={14} weight="bold" />}
      {children}
    </button>
  );
}

export function PillTabs<T extends string>({ tabs, value, onChange, className }: { tabs: Array<{ id: T; label: string }>; value: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          onClick={() => onChange(t.id)}
          className={cn(
            "h-8 rounded-[10px] border px-3.5 text-[13px] transition-colors",
            t.id === value ? "border-transparent bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--c-solid)] font-medium text-[var(--c-accent)]", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials || "•"}
    </span>
  );
}

/** Rounded black bars; highlighted bars in the accent colour. */
export function Bars({
  values,
  highlight = [],
  labels,
  max,
  height = 150,
  callout,
}: {
  values: number[];
  highlight?: number[];
  labels?: Array<string | null>;
  max?: number;
  height?: number;
  callout?: { index: number; text: string };
}) {
  const top = max ?? Math.max(...values, 1);
  return (
    <div>
      <div className="relative flex items-end gap-[6px]" style={{ height }}>
        {values.map((v, i) => {
          const h = Math.max(8, (v / top) * height);
          const hi = highlight.includes(i);
          return (
            <div key={i} className="relative flex flex-1 justify-center" style={{ height: "100%" }}>
              {callout?.index === i && (
                <span className="absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-full bg-[var(--c-frame)] px-2 py-0.5 text-[11px] shadow-sm">{callout.text}</span>
              )}
              <div
                className={cn("absolute bottom-0 w-full max-w-[26px] rounded-full", hi ? "bg-[var(--c-accent)]" : "bg-[var(--c-solid)]")}
                style={{ height: h }}
              >
                {hi && <span className="absolute left-1/2 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-[var(--c-accent)]" />}
              </div>
            </div>
          );
        })}
      </div>
      {labels && (
        <div className="mt-2 flex gap-[6px] text-[11px] text-[var(--c-ink-3)]">
          {labels.map((l, i) => (
            <span key={i} className="flex-1 whitespace-nowrap text-center">
              {l ?? ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Check({ checked, label, meta, tag }: { checked?: boolean; label: React.ReactNode; meta?: string; tag?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--c-line)] py-2.5 last:border-0">
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border",
          checked ? "border-[var(--c-solid)] bg-[var(--c-solid)] text-[var(--c-on-solid)]" : "border-[var(--c-ink-3)]",
        )}
        aria-hidden
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
            <path d="M2 6.5 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-[13px]", checked ? "font-medium" : "text-[var(--c-ink-3)]")}>{label}</span>
      {meta && <span className="shrink-0 text-[11px] text-[var(--c-ink-2)]">{meta}</span>}
      {tag}
    </div>
  );
}
