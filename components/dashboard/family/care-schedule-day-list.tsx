"use client";

import { Check, Clock, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getRecipientBriefing,
  setScheduleCompletion,
  type ScheduleDayStatus,
  type ScheduleStatusItem,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { toDateKey } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { getScheduleTypeMeta } from "./care-schedule-data";

const statusMeta: Record<
  ScheduleDayStatus,
  { label: string; className: string; dotClass: string }
> = {
  upcoming: {
    label: "Upcoming",
    className: "bg-[var(--surface)] text-[var(--text-secondary)]",
    dotClass: "border-[var(--border-strong)] bg-[var(--card)]",
  },
  due: {
    label: "Due now",
    className: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
    dotClass: "border-[var(--warning-text)] bg-[var(--warning-bg)]",
  },
  completed: {
    label: "Done",
    className: "bg-primary-light text-primary",
    dotClass: "border-primary bg-primary text-white",
  },
  missed: {
    label: "Missed",
    className: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
    dotClass: "border-[var(--danger-text)] bg-[var(--danger-bg)]",
  },
};

type CareScheduleDayListProps = {
  recipientUserId: string;
  selectedDate: Date;
  canManage?: boolean;
  compact?: boolean;
  onStatsChange?: (stats: {
    completedCount: number;
    missedCount: number;
    upcomingCount: number;
    adherencePercent: number | null;
  }) => void;
};

export function CareScheduleDayList({
  recipientUserId,
  selectedDate,
  canManage = false,
  compact = false,
  onStatsChange,
}: CareScheduleDayListProps) {
  const { activeFamilyId } = useFamily();
  const [items, setItems] = useState<ScheduleStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const dateKey = toDateKey(selectedDate);

  const load = useCallback(async () => {
    if (!activeFamilyId || !recipientUserId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await getRecipientBriefing(activeFamilyId, recipientUserId, dateKey);
      const statuses = data?.scheduleStatuses ?? [];
      setItems(statuses);
      onStatsChange?.({
        completedCount: data?.completedCount ?? 0,
        missedCount: data?.missedCount ?? 0,
        upcomingCount: data?.upcomingCount ?? 0,
        adherencePercent: data?.adherencePercent ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId, dateKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markItem(
    scheduleId: string,
    status: "completed" | "missed",
  ) {
    if (!activeFamilyId || !canManage) return;

    setBusyId(scheduleId);
    setError("");
    try {
      const { data } = await setScheduleCompletion(
        activeFamilyId,
        recipientUserId,
        scheduleId,
        { status, dateKey },
      );
      setItems(data?.items ?? []);
      onStatsChange?.({
        completedCount: data?.completedCount ?? 0,
        missedCount: data?.missedCount ?? 0,
        upcomingCount: data?.upcomingCount ?? 0,
        adherencePercent: data?.adherencePercent ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <p className="px-1 py-4 text-center text-[12px] text-[var(--text-tertiary)]">
        Nothing scheduled for this day
      </p>
    );
  }

  const completedCount = items.filter((i) => i.status === "completed").length;
  const missedCount = items.filter((i) => i.status === "missed" || i.status === "due").length;

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex flex-wrap gap-2 px-1">
          <span className="rounded-md bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">
            {completedCount} done
          </span>
          {missedCount > 0 && (
            <span className="rounded-md bg-[var(--danger-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--danger-text)]">
              {missedCount} missed
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="mb-2 rounded-lg bg-[var(--danger-bg)] px-2 py-1.5 text-[11px] text-[var(--danger-text)]">
          {error}
        </p>
      )}

      <div className="space-y-0">
        {items.map((item) => {
          const meta = getScheduleTypeMeta(item.type as Parameters<typeof getScheduleTypeMeta>[0]);
          const Icon = meta.icon;
          const status = statusMeta[item.status] ?? statusMeta.upcoming;
          const isBusy = busyId === item.scheduleId;
          const canMark = canManage && item.status !== "upcoming";

          return (
            <div
              key={item.scheduleId}
              className="flex items-start gap-3 border-b border-[var(--border-strong)] py-3 first:pt-0 last:border-0 last:pb-0"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  status.dotClass,
                )}
              >
                {item.status === "completed" ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : item.status === "missed" || item.status === "due" ? (
                  <X className="h-3 w-3" strokeWidth={3} />
                ) : (
                  <Clock className="h-3 w-3" strokeWidth={2.5} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[12px] font-bold text-[var(--text-primary)]">{item.title}</p>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                  <Icon className="h-3 w-3 shrink-0" strokeWidth={2} />
                  {item.time}
                  {item.dosage ? ` · ${item.dosage}` : ""}
                </p>

                {canMark && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.status !== "completed" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void markItem(item.scheduleId, "completed")}
                        className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
                      >
                        Mark done
                      </button>
                    )}
                    {item.status !== "missed" && item.status !== "upcoming" && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void markItem(item.scheduleId, "missed")}
                        className="rounded-md border border-[var(--border-strong)] bg-[var(--input-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:border-[var(--danger-border)] hover:text-[var(--danger-text)] disabled:opacity-60"
                      >
                        {item.status === "completed" ? "Mark missed" : "Keep missed"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
