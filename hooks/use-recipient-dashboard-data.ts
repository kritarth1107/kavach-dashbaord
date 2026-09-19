"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getRecipientBriefing,
  getRecipientLabs,
  type LabDocument,
  type RecipientBriefing,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { useOptionalCareSchedule } from "@/components/dashboard/family/care-recipient-schedule-context";
import {
  countMedicineSchedulesForDate,
  countSchedulesForDateRange,
  getActiveSchedulesForDate,
} from "@/components/dashboard/family/care-schedule-data";
import {
  addDays,
  formatDayLabel,
  formatShortDate,
  isDocumentOnDate,
  isIsoOnDate,
  isSameDay,
  toDateKey,
} from "@/lib/date-utils";
import { countDocumentsInMonth, parseAllMetrics } from "@/lib/health-metrics";

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekLabelsEndingOn(endDate: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(endDate, i - 6);
    return d.toLocaleDateString("en-IN", { weekday: "short" });
  });
}

export type DayActivityRow = {
  id: string;
  name: string;
  date: string;
  detail: string;
  status: string;
  kind: "schedule" | "lab" | "check_in";
};

export function useRecipientDashboardData(
  recipientUserId: string | undefined,
  selectedDate: Date,
  isToday: boolean,
) {
  const { activeFamilyId } = useFamily();
  const scheduleCtx = useOptionalCareSchedule();
  const [labs, setLabs] = useState<LabDocument[]>([]);
  const [briefing, setBriefing] = useState<RecipientBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeFamilyId || !recipientUserId) {
      setLabs([]);
      setBriefing(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [labsRes, briefingRes] = await Promise.all([
        getRecipientLabs(activeFamilyId, recipientUserId),
        getRecipientBriefing(activeFamilyId, recipientUserId, toDateKey(selectedDate)),
      ]);
      setLabs(labsRes.data?.documents ?? []);
      setBriefing(briefingRes.data ?? null);
    } catch {
      setLabs([]);
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId, selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const schedules = scheduleCtx?.schedules ?? [];
  const daySchedules = useMemo(
    () => getActiveSchedulesForDate(schedules, selectedDate),
    [schedules, selectedDate],
  );
  const dayMeds = useMemo(
    () => daySchedules.filter((item) => item.type === "MEDICINE"),
    [daySchedules],
  );
  const dayLabs = useMemo(
    () => labs.filter((doc) => isDocumentOnDate(doc, selectedDate)),
    [labs, selectedDate],
  );

  const weekScheduleCounts = useMemo(
    () => countSchedulesForDateRange(schedules, selectedDate, 7),
    [schedules, selectedDate],
  );

  const weekMedCounts = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(selectedDate, i - 6);
      return countMedicineSchedulesForDate(schedules, d);
    });
  }, [schedules, selectedDate]);

  const metrics = useMemo(() => parseAllMetrics(labs), [labs]);
  const weekMetrics = useMemo(() => {
    const start = addDays(selectedDate, -6);
    return metrics.filter((m) => m.date >= start && m.date <= selectedDate);
  }, [metrics, selectedDate]);

  const completionPercent = useMemo(() => {
    if (briefing?.adherencePercent != null) return briefing.adherencePercent;
    if (!daySchedules.length) return null;
    return 0;
  }, [briefing?.adherencePercent, daySchedules.length]);

  const adherenceValue = useMemo(() => {
    if (completionPercent !== null) return `${completionPercent}%`;
    if (dayMeds.length) return `${dayMeds.length} scheduled`;
    return "—";
  }, [completionPercent, dayMeds.length]);

  const activityRows = useMemo((): DayActivityRow[] => {
    const rows: DayActivityRow[] = [];

    const statusByScheduleId = new Map(
      (briefing?.scheduleStatuses ?? []).map((s) => [s.scheduleId, s.status]),
    );

    for (const item of daySchedules) {
      const dayStatus = statusByScheduleId.get(item.scheduleId);
      const statusLabel =
        dayStatus === "completed"
          ? "Done"
          : dayStatus === "missed" || dayStatus === "due"
            ? "Missed"
            : dayStatus === "upcoming"
              ? "Upcoming"
              : "Scheduled";
      rows.push({
        id: `sched-${item.scheduleId}`,
        name: item.title,
        date: formatShortDate(selectedDate),
        detail: [item.time, item.dosage].filter(Boolean).join(" · "),
        status: statusLabel,
        kind: item.type === "CHECK_IN" ? "check_in" : "schedule",
      });
    }

    for (const doc of dayLabs) {
      rows.push({
        id: `lab-${doc.document_id}`,
        name: doc.title,
        date: formatShortDate(selectedDate),
        detail: doc.snippet?.slice(0, 80) ?? doc.kind,
        status: "Filed",
        kind: "lab",
      });
    }

    if (isToday && briefing?.lastCheckInAt && isIsoOnDate(briefing.lastCheckInAt, selectedDate)) {
      rows.unshift({
        id: "check-in",
        name: "Saheli check-in",
        date: formatShortDate(selectedDate),
        detail: briefing.lastHeardLine?.slice(0, 80) ?? "Check-in logged",
        status: "Done",
        kind: "check_in",
      });
    }

    return rows;
  }, [daySchedules, dayLabs, briefing, isToday, selectedDate]);

  const wellnessStatus = useMemo(() => {
    if (!daySchedules.length && !dayLabs.length) return "Quiet day";
    const missed = briefing?.missedCount ?? 0;
    if (missed > 0) return `${missed} missed today`;
    if (completionPercent !== null) {
      if (completionPercent >= 80) return "On track";
      if (completionPercent > 0) return "In progress";
      if ((briefing?.elapsedCount ?? 0) > 0) return "Needs attention";
      return "Upcoming tasks";
    }
    if (daySchedules.length) return `${daySchedules.length} care tasks`;
    return "Records only";
  }, [
    daySchedules.length,
    dayLabs.length,
    completionPercent,
    briefing?.missedCount,
    briefing?.elapsedCount,
  ]);

  const vitalsSnapshot = useMemo(() => {
    const keys = ["bp_systolic", "bp_diastolic", "heart_rate", "glucose", "spo2"] as const;
    const latest = new Map<string, (typeof metrics)[0]>();
    for (const m of metrics) latest.set(m.key, m);

    const sys = latest.get("bp_systolic");
    const dia = latest.get("bp_diastolic");
    return {
      bp: sys && dia ? `${sys.value}/${dia.value}` : sys ? `${sys.value}/—` : null,
      heartRate: latest.get("heart_rate")?.value ?? null,
      glucose: latest.get("glucose")?.value ?? null,
      spo2: latest.get("spo2")?.value ?? null,
    };
  }, [metrics]);

  const trendSparkline = useMemo(() => {
    if (weekMetrics.length >= 2) {
      return weekMetrics.slice(-7).map((m) => m.value);
    }
    return weekScheduleCounts.length ? weekScheduleCounts : [0, 0, 0, 0, 0, 0, 0];
  }, [weekMetrics, weekScheduleCounts]);

  return {
    loading: loading || Boolean(scheduleCtx?.loading),
    refresh: load,
    labs,
    metrics,
    weekMetrics,
    daySchedules,
    dayMeds,
    dayLabs,
    briefing,
    activityRows,
    dateLabel: formatDayLabel(selectedDate),
    shortDate: formatShortDate(selectedDate),
    weekLabels: weekLabelsEndingOn(selectedDate),
    weekScheduleCounts,
    weekMedCounts,
    missedCount: briefing?.missedCount ?? 0,
    completedCount: briefing?.completedCount ?? 0,
    stats: {
      adherence: adherenceValue,
      adherenceSub:
        (briefing?.missedCount ?? 0) > 0
          ? `${briefing?.missedCount} missed · ${formatDayLabel(selectedDate)}`
          : completionPercent !== null
            ? `Care tasks · ${formatDayLabel(selectedDate)}`
            : `${dayMeds.length} medicine reminder${dayMeds.length === 1 ? "" : "s"}`,
      checkInStreak: isToday && briefing?.lastCheckInAt ? "Active" : daySchedules.some((s) => s.type === "CHECK_IN") ? "Scheduled" : "—",
      checkInSub: isToday ? "Last Saheli check-in" : `Check-ins · ${formatShortDate(selectedDate)}`,
      vitalsLogged: String(countDocumentsInMonth(labs, selectedDate)),
      vitalsSub: `Records in ${selectedDate.toLocaleDateString("en-IN", { month: "long" })}`,
      reports: String(labs.length),
      reportsSub: "Total health documents",
    },
    wellnessStatus,
    completionPercent,
    vitalsSnapshot,
    trendSparkline,
    medWeeklyTotal: weekMedCounts.reduce((a, b) => a + b, 0),
    medWeeklyMax: Math.max(...weekMedCounts, 1),
  };
}

export { WEEK_LABELS };
