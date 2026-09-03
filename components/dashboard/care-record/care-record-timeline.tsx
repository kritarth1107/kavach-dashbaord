"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCareRecordTimeline, type CareRecordEventItem } from "@/lib/api";

const FILTERS = ["all", "dose", "vital", "symptom", "check_in", "order", "message"] as const;

type CareRecordTimelineProps = {
  familyId: string;
  subjectUserId: string;
};

export function CareRecordTimeline({ familyId, subjectUserId }: CareRecordTimelineProps) {
  const [events, setEvents] = useState<CareRecordEventItem[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCareRecordTimeline(familyId, subjectUserId, 120);
      setEvents(data?.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [familyId, subjectUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    if (filter === "order") {
      return events.filter((e) => e.type.startsWith("order_"));
    }
    if (filter === "check_in") {
      return events.filter((e) => e.type === "check_in" || e.type === "system");
    }
    return events.filter((e) => e.type === filter || e.type.includes(filter));
  }, [events, filter]);

  return (
    <div className="panel-card overflow-hidden">
      <div className="border-b border-[var(--border-strong)] px-5 py-4">
        <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">Care Record</h2>
        <p className="text-[12px] text-[var(--text-tertiary)]">
          One timeline from WhatsApp, dashboard, and Saheli
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setFilter(chip)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold capitalize ${
                filter === chip
                  ? "bg-primary text-white"
                  : "bg-[var(--input-bg)] text-[var(--text-secondary)]"
              }`}
            >
              {chip.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-5 py-12 text-center text-[13px] text-[var(--text-tertiary)]">
          No events in this filter yet.
        </p>
      ) : (
        <ul className="max-h-[480px] divide-y divide-[var(--border-strong)] overflow-y-auto">
          {filtered.map((event) => (
            <li key={event.eventId} className="px-5 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] font-bold text-[var(--text-primary)]">{event.title}</p>
                  <p className="mt-0.5 text-[11px] capitalize text-[var(--text-tertiary)]">
                    {event.type.replace(/_/g, " ")} · {event.channel}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {event.detail}
                  </p>
                </div>
                {event.at && (
                  <span className="shrink-0 text-[10px] text-[var(--text-tertiary)]">
                    {new Date(event.at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
