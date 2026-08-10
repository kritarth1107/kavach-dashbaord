import { cn } from "@/lib/utils";
import { Sparkline } from "./chart-primitives";
import type { LucideIcon } from "lucide-react";

type StatMetricCardProps = {
  label: string;
  value: string;
  sub: string;
  trend?: string;
  trendUp?: boolean;
  sparkline?: number[];
  sparkColor?: string;
  icon?: LucideIcon;
  iconBg?: string;
  dark?: boolean;
  className?: string;
};

export function StatMetricCard({
  label,
  value,
  sub,
  trend,
  trendUp = true,
  sparkline,
  sparkColor = "#22c55e",
  icon: Icon,
  iconBg = "bg-primary-light text-primary",
  dark = false,
  className,
}: StatMetricCardProps) {
  return (
    <div
      className={cn(
        "panel-card flex flex-col p-4",
        dark && "dark-card border-0",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-wide",
              dark ? "text-white/50" : "text-[#9ca3af]",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "mt-1 text-[1.5rem] font-extrabold leading-none tracking-[-0.03em]",
              dark ? "text-white" : "text-[#111827]",
            )}
          >
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              iconBg,
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </div>
        )}
        {sparkline && !Icon && (
          <Sparkline color={sparkColor} data={sparkline} />
        )}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <p className={cn("text-[11px]", dark ? "text-white/40" : "text-[#9ca3af]")}>
          {sub}
        </p>
        {trend && (
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
              trendUp
                ? "bg-primary-light text-primary"
                : "bg-[#fef2f2] text-[#dc2626]",
            )}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
