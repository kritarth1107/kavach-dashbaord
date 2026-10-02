"use client";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type Tone = "lavender" | "sky" | "peach" | "butter" | "rose" | "mint" | "accent" | "saffron" | "ink" | "plain";

const TONE_BG: Record<Tone, string> = {
  lavender: "bg-[var(--c-lavender)] text-[var(--c-lavender-ink)]",
  sky: "bg-[var(--c-sky)] text-[var(--c-sky-ink)]",
  peach: "bg-[var(--c-peach)] text-[var(--c-peach-ink)]",
  butter: "bg-[var(--c-butter)] text-[var(--c-butter-ink)]",
  rose: "bg-[var(--c-rose)] text-[var(--c-rose-ink)]",
  mint: "bg-[var(--c-mint)] text-[var(--c-mint-ink)]",
  accent: "bg-[var(--c-accent)] text-[var(--c-accent-ink)]",
  saffron: "bg-[var(--c-accent-soft)] text-[var(--c-accent)]",
  ink: "bg-[var(--c-ink)] text-[var(--c-bg)]",
  plain: "bg-[var(--c-card-solid)] text-[var(--c-ink-2)]",
};

export function toneClass(tone: Tone) {
  return TONE_BG[tone];
}

export function Card({
  children,
  className,
  tone,
  as: Tag = "section",
  delay = 0,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { tone?: Tone; as?: "section" | "div" | "article" | "aside"; delay?: number }) {
  return (
    <Tag
      {...rest}
      style={{ animationDelay: `${delay}ms`, ...(rest.style ?? {}) }}
      className={cn(
        "c-rise",
        tone && tone !== "plain" ? cn("rounded-[var(--c-radius)] p-5", TONE_BG[tone]) : "c-card p-5",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({
  icon: Icon,
  title,
  hint,
  action,
  tone = "plain",
}: {
  icon?: PhosphorIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <IconBubble icon={Icon} tone={tone} size="sm" />}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
          {hint && <p className="truncate text-[12px] text-[var(--c-ink-3)]">{hint}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function IconBubble({ icon: Icon, tone = "plain", size = "md", className }: { icon: PhosphorIcon; tone?: Tone; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const icon = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full", dims, TONE_BG[tone], className)}>
      <Icon size={icon} weight="duotone" />
    </span>
  );
}

export function Pill({ children, tone = "plain", className, icon: Icon }: { children: React.ReactNode; tone?: Tone; className?: string; icon?: PhosphorIcon }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", TONE_BG[tone], className)}>
      {Icon && <Icon size={13} weight="bold" />}
      {children}
    </span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: PhosphorIcon; size?: "sm" | "md" };

function btn(base: string) {
  return function Button({ children, icon: Icon, className, size = "md", ...rest }: BtnProps) {
    return (
      <button
        type="button"
        {...rest}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
          size === "sm" ? "h-8 px-3.5 text-[12px]" : "h-10 px-5 text-[13px]",
          base,
          className,
        )}
      >
        {Icon && <Icon size={size === "sm" ? 14 : 16} weight="bold" />}
        {children}
      </button>
    );
  };
}

export const InkButton = btn("bg-[var(--c-ink)] text-[var(--c-bg)] hover:opacity-90");
export const AccentButton = btn("bg-[var(--c-accent)] text-[var(--c-accent-ink)] hover:brightness-105");
export const SoftButton = btn("bg-[var(--c-card-solid)] text-[var(--c-ink)] ring-1 ring-[var(--c-line)] hover:ring-[var(--c-ink-3)]");
export const GhostButton = btn("text-[var(--c-ink-2)] hover:bg-[var(--c-card-solid)]");

export function Avatar({ name, tone = "peach", size = 36, className }: { name: string; tone?: Tone; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", TONE_BG[tone], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials || "•"}
    </span>
  );
}

/** Large, light numerals with a small unit, as in a calm instrument panel. */
export function BigStat({ value, unit, label, sub, size = "lg" }: { value: string; unit?: string; label?: string; sub?: React.ReactNode; size?: "md" | "lg" | "xl" }) {
  const cls = size === "xl" ? "text-[56px] leading-[1]" : size === "lg" ? "text-[40px] leading-[1]" : "text-[28px] leading-[1.05]";
  return (
    <div>
      {label && <p className="mb-2 text-[12px] font-medium text-[var(--c-ink-3)]">{label}</p>}
      <p className={cn("c-num", cls)}>
        {value}
        {unit && <span className="ml-1 text-[14px] font-medium tracking-normal text-[var(--c-ink-3)]">{unit}</span>}
      </p>
      {sub && <div className="mt-2 text-[12px] text-[var(--c-ink-2)]">{sub}</div>}
    </div>
  );
}

/** Progress ring for "doses taken today". */
export function Ring({ value, total, size = 112, label }: { value: number; total: number; size?: number; label?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="c-num text-[28px] leading-none">
          {value}
          <span className="text-[14px] text-[var(--c-ink-3)]">/{total}</span>
        </p>
        {label && <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--c-ink-3)]">{label}</p>}
      </div>
    </div>
  );
}

export function Sparkline({ points, className, color = "currentColor" }: { points: number[]; className?: string; color?: string }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i / (points.length - 1)) * w},${h - 4 - ((p - min) / span) * (h - 8)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - 4 - ((points[points.length - 1] - min) / span) * (h - 8)} r="3.2" fill={color} />
    </svg>
  );
}

export function Empty({ art, title, body, action }: { art?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {art}
      <p className="c-serif mt-4 text-[20px]">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--c-ink-2)]">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
