import { MoreHorizontal, Wifi } from "lucide-react";
import { DashboardCard } from "./dashboard-card";

export function ParentStatusCard() {
  const used = 3884;
  const total = 20638;
  const pct = (used / total) * 100;

  return (
    <DashboardCard className="animate-fade-up animate-delay-4 flex h-full flex-col p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-[#0f172a]">
            Parent Profile
          </h2>
          <p className="mt-1 text-[11.5px] font-medium text-[#94a3b8]">
            Total · 1 parent · Saheli active
          </p>
        </div>
        <button
          type="button"
          aria-label="More options"
          className="rounded-lg p-1.5 text-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#64748b]"
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <div className="relative mb-6 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#4338ca] via-[#6366f1] to-[#7c3aed] p-5 text-white shadow-[0_20px_40px_rgba(99,102,241,0.35)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-[#a78bfa]/30 blur-2xl" />
        <div className="pointer-events-none absolute right-6 top-6 h-16 w-16 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-10 top-10 h-8 w-8 rounded-full border border-white/10" />

        <div className="relative mb-10 flex items-start justify-between">
          <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#fde68a] to-[#f59e0b] shadow-[0_4px_12px_rgba(245,158,11,0.4)]">
            <div className="h-5 w-7 rounded-[3px] bg-gradient-to-br from-[#fef3c7] to-[#fcd34d]" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-sm">
            <Wifi className="h-3 w-3" strokeWidth={2.5} />
            Active
          </span>
        </div>

        <p className="relative font-mono text-[13px] font-medium tracking-[0.18em] text-white/80">
          MRS. R · SAHELI
        </p>
        <p className="relative mt-1.5 font-mono text-[1.35rem] font-bold tracking-[0.22em]">
          •••• •••• 4891
        </p>

        <div className="relative mt-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              Companion
            </p>
            <p className="text-sm font-bold">Saheli · Hindi</p>
          </div>
          <div className="flex">
            <span className="h-6 w-6 rounded-full bg-[#ef4444] shadow-lg" />
            <span className="-ml-2.5 h-6 w-6 rounded-full bg-[#f59e0b] shadow-lg" />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[13px] font-bold text-[#334155]">Care spend</p>
          <p className="text-[11px] font-semibold text-[#94a3b8]">
            ₹{used.toLocaleString("en-IN")} of ₹{total.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#f1f5f9] shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#fb923c] via-[#f97316] to-[#ea580c] shadow-[0_0_12px_rgba(249,115,22,0.5)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2.5 text-[11.5px] font-medium text-[#94a3b8]">
          <span className="font-extrabold text-[#0f172a]">
            ₹{used.toLocaleString("en-IN")}
          </span>{" "}
          approved this month
        </p>
      </div>
    </DashboardCard>
  );
}
