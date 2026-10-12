"use client";
/** Pieces of the person-centred pages (Care plan, Story, Emergency card; design approved 2026-10-13). */

import { cn } from "@/lib/utils";
import type { PortraitMood } from "@/lib/care-memory-api";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "•";

/** Their photo, or their initials on a warm tile when the family has not added one. */
export function PersonPhoto({ name, src, className, rounded = "rounded-[24px]", text = 40 }: { name: string; src?: string | null; className?: string; rounded?: string; text?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("shrink-0 object-cover", rounded, className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center bg-[var(--c-accent-soft)] font-medium text-[var(--c-accent-soft-ink)]", rounded, className)}
      style={{ fontSize: text }}
    >
      {initials(name)}
    </span>
  );
}

export const cap = (w?: string | null) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : "");

/** Mood 1–5 as five short bars. */
export function ScoreDots({ score }: { score: number | null }) {
  return (
    <span className="flex gap-1" aria-label={score ? `${score} of 5` : "not known"}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("h-2 w-5 rounded-full", score && i <= score ? "bg-[var(--c-accent)]" : "bg-[var(--c-line)]")} />
      ))}
    </span>
  );
}

const dayLabel = (day: string) => new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/** How they've been: a soft line through each day's mood; the lowest day is marked with its reason. */
export function MoodLine({ days, height = 120 }: { days: PortraitMood[]; height?: number }) {
  const pts = days.filter((d) => d.score);
  if (pts.length < 2) {
    return (
      <div className="flex items-center justify-center rounded-[18px] border border-dashed border-[var(--c-line)] text-[12.5px] text-[var(--c-ink-3)]" style={{ height }}>
        {pts.length ? "One mood so far. The line fills in as Saheli hears more." : "No mood heard yet. It fills in from the chats."}
      </div>
    );
  }
  const W = 420;
  const top = 10;
  const bottom = height - 28;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (s: number) => bottom - ((s - 1) / 4) * (bottom - top);
  const xy = pts.map((d, i) => [x(i), y(d.score as number)] as const);
  const path = xy.reduce((acc, [px, py], i) => {
    if (!i) return `M${px} ${py}`;
    const [qx, qy] = xy[i - 1];
    const mx = (qx + px) / 2;
    return `${acc} C${mx} ${qy} ${mx} ${py} ${px} ${py}`;
  }, "");
  const low = pts.reduce((m, d, i) => ((d.score as number) < (pts[m].score as number) ? i : m), 0);
  const lowNote = pts[low].score! <= 2 ? `${dayLabel(pts[low].day || pts[low].at.slice(0, 10))} · ${pts[low].word || "low"}` : null;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label="Mood over the last two weeks">
      <defs>
        <linearGradient id="moodfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--c-accent)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--c-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${W} ${bottom + 8} L0 ${bottom + 8}Z`} fill="url(#moodfill)" />
      <path d={path} fill="none" stroke="var(--c-accent)" strokeWidth="2.5" strokeLinecap="round" />
      {lowNote && <circle cx={xy[low][0]} cy={xy[low][1]} r="5" fill="var(--c-frame)" stroke="var(--c-danger-ink)" strokeWidth="2.5" />}
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="5" fill="var(--c-accent)" />
      <g fontSize="10.5" fill="var(--c-ink-2)">
        <text x="0" y={height - 6}>{dayLabel(pts[0].day || pts[0].at.slice(0, 10))}</text>
        {lowNote && low > 0 && low < pts.length - 1 && (
          <text x={Math.min(Math.max(xy[low][0] - 40, 60), W - 150)} y={height - 6}>
            {lowNote}
          </text>
        )}
        <text x={W} y={height - 6} textAnchor="end">
          Today
        </text>
      </g>
    </svg>
  );
}

/** A WhatsApp-like bubble for someone's own words. */
export function Bubble({ children, meta, mine = true, className }: { children: React.ReactNode; meta?: string; mine?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[4px_16px_16px_16px] px-3 py-2 text-[13px] leading-snug shadow-[0_1px_0_rgba(0,0,0,0.06)]",
        mine ? "bg-[#d9fdd3] text-[#16301f] dark:bg-[#1f3b2a] dark:text-[#e3f5e6]" : "bg-[var(--c-frame)]",
        className,
      )}
    >
      {children}
      {meta && <span className="mt-1 block text-right text-[10.5px] opacity-60">{meta}</span>}
    </div>
  );
}

/** Each medicine gets its own pill colour, the same in the pillbox and the list. */
export const PILL_COLORS = ["#165246", "#ec9a2f", "#d6453f", "#5b6fb7", "#b0527a", "#3f8fa6"];

export function PillShape({ color, round, faded, className }: { color: string; round?: boolean; faded?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 shadow-[inset_-3px_-3px_0_rgba(0,0,0,0.12)]", round ? "h-[18px] w-[18px] rounded-full" : "h-[26px] w-[15px] rounded-[9px]", faded && "opacity-30", className)}
      style={{ background: color }}
    />
  );
}

/** A filled ring, e.g. how complete the emergency card is. */
export function Ring({ pct, size = 84, label }: { pct: number; size?: number; label?: string }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-line)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(Math.max(0, Math.min(100, pct)) / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="c-num absolute inset-0 flex items-center justify-center text-[20px]">{label ?? `${Math.round(pct)}%`}</span>
    </span>
  );
}
