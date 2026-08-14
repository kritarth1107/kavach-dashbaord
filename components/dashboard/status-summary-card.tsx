import { Lock, Shield } from "lucide-react";

type StatusSummaryCardProps = {
  statusLabel?: string;
  detail?: string;
};

export function StatusSummaryCard({
  statusLabel = "All Well",
  detail = "Mrs. R · 2/2 meds · cheerful check-in",
}: StatusSummaryCardProps) {
  return (
    <div className="lime-card relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden p-6 shadow-[0_8px_24px_rgba(22,163,74,0.25)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Shield className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
        <Lock className="h-4 w-4 text-white/50" strokeWidth={2} />
      </div>
      <div className="relative">
        <p className="font-mono text-[13px] font-semibold tracking-[0.15em] text-white/70">
          SAHELI · CONNECTED
        </p>
      </div>
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
          Today&apos;s status
        </p>
        <p className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-white">
          {statusLabel}
        </p>
        <p className="mt-2 line-clamp-2 text-[12px] font-semibold text-white/75">
          {detail}
        </p>
      </div>
    </div>
  );
}
