import { cn } from "@/lib/utils";

type DashboardCardProps = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
};

export function DashboardCard({
  children,
  className,
  hover = false,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "dashboard-card",
        hover && "dashboard-card-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}
