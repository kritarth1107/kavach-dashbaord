import {
  ChevronDown,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pill,
  Search,
  Sun,
} from "lucide-react";
import type { ActivityItem } from "@/lib/api";

function rowFromActivity(item: ActivityItem) {
  const icon =
    item.type === "message"
      ? MessageSquare
      : item.type === "check_in"
        ? Sun
        : Pill;
  const iconBg =
    item.type === "message"
      ? "bg-[#dcfce7]"
      : item.type === "check_in"
        ? "bg-[#fef9c3]"
        : "bg-[#ede9fe]";
  const statusClass =
    item.status === "scheduled" ? "status-pill-pending" : "status-pill-success";
  const status =
    item.status === "scheduled"
      ? "Scheduled"
      : item.status === "completed"
        ? "Completed"
        : "Reported";
  const dot = item.status === "scheduled" ? "bg-[#ca8a04]" : "bg-[#059669]";
  const typeLabel =
    item.type === "message"
      ? "Saheli"
      : item.type === "check_in"
        ? "Check-in"
        : "Schedule";

  return {
    icon,
    iconBg,
    name: item.title,
    type: typeLabel,
    date: new Date(item.at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    detail: `${item.recipientName} · ${item.detail}`,
    status,
    statusClass,
    dot,
    key: item.id,
  };
}

type HealthLogTableProps = {
  items?: ActivityItem[];
  loading?: boolean;
};

export function HealthLogTable({ items = [], loading = false }: HealthLogTableProps) {
  const rows = items.map(rowFromActivity);

  return (
    <div className="panel-card p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[15px] font-extrabold text-[#1a1a1a]">Health Log</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-[#f5f5f7] px-4 py-2">
            <Search className="h-3.5 w-3.5 text-[#9ca3af]" strokeWidth={2.25} />
            <input
              type="search"
              placeholder="Search log..."
              className="w-28 bg-transparent text-[12px] font-medium text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none sm:w-36"
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-[#f0f0f2] bg-white px-4 py-2 text-[12px] font-bold text-[#374151] hover:bg-[#fafafa]"
          >
            Filter
            <ChevronDown className="h-3.5 w-3.5 text-[#9ca3af]" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-[13px] text-[#9ca3af]">
          No activity yet — chat with Saheli or add care schedules.
        </p>
      ) : (
        <div className="no-scrollbar overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-[#f0f0f2] text-left">
                <th className="pb-3 pr-4">
                  <input type="checkbox" className="rounded border-[#d1d5db]" />
                </th>
                <th className="pb-3 pr-4 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
                  Name
                </th>
                <th className="pb-3 pr-4 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
                  Type
                </th>
                <th className="pb-3 pr-4 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
                  Date
                </th>
                <th className="pb-3 pr-4 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
                  Detail
                </th>
                <th className="pb-3 pr-4 text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
                  Status
                </th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-[#f9fafb] last:border-0 hover:bg-[#fafafa]"
                >
                  <td className="py-3.5 pr-4">
                    <input type="checkbox" className="rounded border-[#d1d5db]" />
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${row.iconBg}`}
                      >
                        <row.icon className="h-4 w-4 text-[#1a1a1a]" strokeWidth={2} />
                      </div>
                      <span className="text-[13px] font-bold text-[#1a1a1a]">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-[13px] font-medium text-[#6b7280]">
                    {row.type}
                  </td>
                  <td className="py-3.5 pr-4 text-[13px] font-medium text-[#6b7280]">
                    {row.date}
                  </td>
                  <td className="py-3.5 pr-4 text-[13px] font-bold text-[#374151]">
                    {row.detail}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${row.statusClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <button
                      type="button"
                      aria-label="More"
                      className="text-[#d1d5db] hover:text-[#9ca3af]"
                    >
                      <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
