import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { DashboardCard } from "./dashboard-card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  icon: LucideIcon;
  iconClass: string;
  value: string;
  subtitle: string;
  label: string;
  delay?: string;
};

export function MetricCard({
  icon: Icon,
  iconClass,
  value,
  subtitle,
  label,
  delay = "",
}: MetricCardProps) {
  return (
    <DashboardCard
      hover
      className={cn("animate-fade-up p-5", delay)}
    >
      <div className="mb-5 flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-[14px]",
            iconClass,
          )}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <button
          type="button"
          aria-label="More options"
          className="rounded-lg p-1 text-[#cbd5e1] transition-colors hover:bg-[#f8fafc] hover:text-[#64748b]"
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
      <p className="text-[1.65rem] font-extrabold leading-none tracking-[-0.03em] text-[#0f172a]">
        {value}
      </p>
      <p className="mt-2 text-[11.5px] font-medium text-[#94a3b8]">{subtitle}</p>
      <div className="mt-4 border-t border-[rgba(15,23,42,0.05)] pt-4">
        <p className="text-[13px] font-bold text-[#334155]">{label}</p>
      </div>
    </DashboardCard>
  );
}
