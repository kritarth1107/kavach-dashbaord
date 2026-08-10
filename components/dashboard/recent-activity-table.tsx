import {
  ChevronDown,
  Filter,
  MoreHorizontal,
  Pill,
  Search,
  ShoppingBag,
  Stethoscope,
  Sun,
  Upload,
} from "lucide-react";
import { DashboardCard } from "./dashboard-card";

const activities = [
  {
    icon: Sun,
    iconBg: "bg-gradient-to-br from-[#fef3c7] to-[#fde68a] text-[#d97706]",
    iconShadow: "shadow-[0_4px_12px_rgba(217,119,6,0.2)]",
    title: "Morning check-in",
    id: "CHK-2847",
    date: "10 Aug 2026",
    time: "8:04 am",
    detail: "Cheerful · slept well",
    status: "Success",
    statusStyle: "bg-[#ecfdf5] text-[#059669] ring-1 ring-[#a7f3d0]/50",
  },
  {
    icon: Pill,
    iconBg: "bg-gradient-to-br from-[#ede9fe] to-[#ddd6fe] text-[#7c3aed]",
    iconShadow: "shadow-[0_4px_12px_rgba(124,58,237,0.2)]",
    title: "Evening medicines",
    id: "MED-1923",
    date: "09 Aug 2026",
    time: "8:12 pm",
    detail: "2 of 2 taken",
    status: "Success",
    statusStyle: "bg-[#ecfdf5] text-[#059669] ring-1 ring-[#a7f3d0]/50",
  },
  {
    icon: ShoppingBag,
    iconBg: "bg-gradient-to-br from-[#fce7f3] to-[#fbcfe8] text-[#db2777]",
    iconShadow: "shadow-[0_4px_12px_rgba(219,39,119,0.2)]",
    title: "Grocery order",
    id: "ORD-7731",
    date: "09 Aug 2026",
    time: "4:30 pm",
    detail: "₹432 · Zepto",
    status: "Pending",
    statusStyle: "bg-[#fef2f2] text-[#dc2626] ring-1 ring-[#fecaca]/60",
  },
  {
    icon: Upload,
    iconBg: "bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe] text-[#2563eb]",
    iconShadow: "shadow-[0_4px_12px_rgba(37,99,235,0.2)]",
    title: "Lab report uploaded",
    id: "RPT-5512",
    date: "08 Aug 2026",
    time: "11:20 am",
    detail: "TSH panel · 30 Jun 26",
    status: "Success",
    statusStyle: "bg-[#ecfdf5] text-[#059669] ring-1 ring-[#a7f3d0]/50",
  },
  {
    icon: Stethoscope,
    iconBg: "bg-gradient-to-br from-[#d1fae5] to-[#a7f3d0] text-[#059669]",
    iconShadow: "shadow-[0_4px_12px_rgba(5,150,105,0.2)]",
    title: "Doctor Brief shared",
    id: "BRF-3390",
    date: "07 Aug 2026",
    time: "3:45 pm",
    detail: "Dr. Rao · consultation",
    status: "Success",
    statusStyle: "bg-[#ecfdf5] text-[#059669] ring-1 ring-[#a7f3d0]/50",
  },
];

export function RecentActivityTable() {
  return (
    <DashboardCard className="animate-fade-up animate-delay-4 overflow-hidden p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-[#0f172a]">
          Recent Activity
        </h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-[rgba(15,23,42,0.06)] bg-[#f8f9fb] px-3.5 py-2.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)]">
            <Search className="h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={2.25} />
            <input
              type="search"
              placeholder="Search activity..."
              className="w-32 bg-transparent text-[12px] font-medium text-[#0f172a] placeholder:text-[#94a3b8] outline-none sm:w-44"
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-[rgba(15,23,42,0.06)] bg-white px-3.5 py-2.5 text-[12px] font-bold text-[#334155] shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
          >
            All Category
            <ChevronDown className="h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-[rgba(15,23,42,0.06)] bg-white px-3.5 py-2.5 text-[12px] font-bold text-[#334155] shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
          >
            <Filter className="h-3.5 w-3.5 text-[#64748b]" strokeWidth={2.25} />
            Filter
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[rgba(15,23,42,0.04)]">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="bg-[#f8f9fb] text-left">
              <th className="px-4 py-3.5">
                <input type="checkbox" className="rounded border-[#cbd5e1]" />
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Activity
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Ref ID
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Date
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Time
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Detail
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Status
              </th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {activities.map((row, i) => (
              <tr
                key={row.id}
                className={`border-t border-[rgba(15,23,42,0.04)] transition-colors hover:bg-[#fafbfd] ${
                  i % 2 === 0 ? "bg-white" : "bg-[#fcfcfd]"
                }`}
              >
                <td className="px-4 py-4">
                  <input type="checkbox" className="rounded border-[#cbd5e1]" />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${row.iconBg} ${row.iconShadow}`}
                    >
                      <row.icon className="h-[17px] w-[17px]" strokeWidth={2.25} />
                    </div>
                    <span className="text-[13.5px] font-bold text-[#0f172a]">
                      {row.title}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-[13px] font-medium text-[#64748b]">
                  {row.id}
                </td>
                <td className="px-4 py-4 text-[13px] font-medium text-[#64748b]">
                  {row.date}
                </td>
                <td className="px-4 py-4 text-[13px] font-medium text-[#64748b]">
                  {row.time}
                </td>
                <td className="px-4 py-4 text-[13px] font-bold text-[#334155]">
                  {row.detail}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold ${row.statusStyle}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    aria-label="More options"
                    className="rounded-lg p-1 text-[#cbd5e1] hover:bg-[#f1f5f9] hover:text-[#64748b]"
                  >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
