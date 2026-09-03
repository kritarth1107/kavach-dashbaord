"use client";

import { Loader2, Sun } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRecipientBriefing, type RecipientBriefing } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { useOptionalCareSchedule } from "./care-recipient-schedule-context";
import { getActiveSchedulesForDate } from "./care-schedule-data";
import { useOptionalRecipientDate } from "@/components/dashboard/recipient/recipient-date-context";
import { formatDayLabel, isIsoOnDate } from "@/lib/date-utils";

export function formatWhen(iso: string | null) {
  if (!iso) return "Not yet";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "Not yet";
  const diffMin = Math.round((Date.now() - at.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  return at.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MorningBriefingCard({
  recipientUserId,
  recipientName,
}: {
  recipientUserId: string;
  recipientName: string;
}) {
  const { activeFamilyId } = useFamily();
  const dateCtx = useOptionalRecipientDate();
  const scheduleCtx = useOptionalCareSchedule();
  const selectedDate = dateCtx?.selectedDate ?? new Date();
  const isToday = dateCtx?.isToday ?? true;
  const [briefing, setBriefing] = useState<RecipientBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  const daySchedules = useMemo(() => {
    if (!scheduleCtx) return [];
    return getActiveSchedulesForDate(scheduleCtx.schedules, selectedDate);
  }, [scheduleCtx, selectedDate]);

  const load = useCallback(async () => {
    if (!activeFamilyId || !recipientUserId || !isToday) {
      setBriefing(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getRecipientBriefing(activeFamilyId, recipientUserId);
      setBriefing(data ?? null);
    } catch {
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId, isToday]);

  useEffect(() => {
    void load();
  }, [load]);

  const dateLabel = formatDayLabel(selectedDate);
  const pendingCount = isToday
    ? (briefing?.unconfirmedItems.length ?? 0)
    : daySchedules.length;

  return (
    <section className="panel-card mb-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-4">
        <Sun className="h-4 w-4 text-primary" strokeWidth={2.25} />
        <div>
          <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">
            {recipientName}&apos;s briefing · {dateLabel}
          </h2>
          <p className="text-[12px] text-[var(--text-tertiary)]">Reported only · not a diagnosis</p>
        </div>
      </div>

      {loading && isToday ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
              Last heard
            </p>
            <p className="mt-1 text-[13px] font-bold text-[var(--text-primary)]">
              {isToday
                ? formatWhen(briefing?.lastHeardAt ?? null)
                : briefing?.lastHeardAt &&
                    isIsoOnDate(briefing.lastHeardAt, selectedDate)
                  ? formatWhen(briefing.lastHeardAt)
                  : "—"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
              {isToday && briefing?.lastHeardLine
                ? `“${briefing.lastHeardLine.slice(0, 140)}${briefing.lastHeardLine.length > 140 ? "…" : ""}”`
                : isToday
                  ? `${recipientName} has not spoken to Saheli yet.`
                  : `Saheli activity for ${dateLabel.toLowerCase()}.`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
              {isToday ? "Last check-in" : "Care tasks"}
            </p>
            <p className="mt-1 text-[13px] font-bold text-[var(--text-primary)]">
              {isToday
                ? formatWhen(briefing?.lastCheckInAt ?? null)
                : `${daySchedules.length} scheduled`}
            </p>
            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
              {isToday
                ? daySchedules.length
                  ? `${daySchedules.length} item${daySchedules.length === 1 ? "" : "s"} on ${dateLabel.toLowerCase()}’s list`
                  : "Nothing on today’s care list"
                : `${daySchedules.filter((s) => s.type === "MEDICINE").length} medicines · ${daySchedules.filter((s) => s.type === "CHECK_IN").length} check-ins`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
              {isToday ? "Not confirmed yet" : "Schedule snapshot"}
            </p>
            {isToday && briefing?.unconfirmedItems.length ? (
              <ul className="mt-1 space-y-1">
                {briefing.unconfirmedItems.slice(0, 4).map((item) => (
                  <li key={`${item.title}-${item.time}`} className="text-[12px] text-[var(--text-primary)]">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-[var(--text-tertiary)]">
                      {" "}
                      · {item.time}
                      {item.dosage ? ` · ${item.dosage}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : !isToday && daySchedules.length ? (
              <ul className="mt-1 space-y-1">
                {daySchedules.slice(0, 4).map((item) => (
                  <li key={item.scheduleId} className="text-[12px] text-[var(--text-primary)]">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-[var(--text-tertiary)]"> · {item.time}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                {pendingCount
                  ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} still open`
                  : "Nothing scheduled for this day."}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
