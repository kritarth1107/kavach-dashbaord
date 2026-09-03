"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StatusSummaryCard } from "@/components/dashboard/status-summary-card";
import { HealthLogTable } from "@/components/dashboard/health-log-table";
import { CenterSearchBar } from "@/components/dashboard/center-search-bar";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { StatMetricCard } from "@/components/dashboard/charts/stat-metric-card";
import {
  CareRecipientVitalsCard,
  FamilyActivityBarCard,
  VitalsGridCard,
  VitalsTrendCard,
  WeeklyMedsBarCard,
} from "@/components/dashboard/charts/dashboard-chart-cards";
import { CareRecordTimeline } from "@/components/dashboard/care-record/care-record-timeline";
import { useFamily } from "@/components/dashboard/family-context";
import {
  getCareRecordMetrics,
  getFamilyMembers,
  getFamilyOverview,
  type CareRecordMetrics,
  type FamilyOverview,
} from "@/lib/api";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";

export function CaregiverDashboardHome() {
  const { activeFamilyId } = useFamily();
  const [overview, setOverview] = useState<FamilyOverview | null>(null);
  const [metrics, setMetrics] = useState<CareRecordMetrics | null>(null);
  const [subjectUserId, setSubjectUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setOverview(null);
      setMetrics(null);
      setSubjectUserId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: overviewData }, { data: membersData }] = await Promise.all([
        getFamilyOverview(activeFamilyId),
        getFamilyMembers(activeFamilyId),
      ]);
      setOverview(overviewData ?? null);

      const members = (membersData?.members ?? []).map(apiMemberToFamilyMember);
      const recipient = members.find(
        (m) => isCareRecipientRole(m.role) && m.status === "joined" && m.userId,
      );
      if (recipient?.userId) {
        setSubjectUserId(recipient.userId);
        const { data: metricsData } = await getCareRecordMetrics(
          activeFamilyId,
          recipient.userId,
        );
        setMetrics(metricsData ?? null);
      } else {
        setSubjectUserId(null);
        setMetrics(null);
      }
    } catch {
      setOverview(null);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const recipientName = overview?.recipients[0]?.name ?? "Sudha";
  const mamaName =
    /sudha|mama|vasundara/i.test(recipientName)
      ? "Mama"
      : recipientName.split(/\s+/).filter((p) => p !== "Mrs.")[0] || "Mama";
  const completed = overview?.completedToday ?? 0;
  const scheduled = overview?.schedulesToday ?? 0;
  const tasksLabel = scheduled > 0 ? `${completed}/${scheduled}` : "3/5";
  const medsDone = completed >= 2 ? "2/3 morning meds" : `${completed} logged`;

  return (
    <>
      <CenterSearchBar />
      <DashboardGreeting variant="caregiver" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatMetricCard
          label="Care recipients"
          value={loading ? "…" : String(overview?.careRecipientCount ?? 1)}
          sub="In this family"
          trend={overview?.careRecipientCount ? "Active" : "Active"}
          icon={Users}
          iconBg="icon-chip-green"
        />
        <StatMetricCard
          label="Today's schedules"
          value={loading ? "…" : String(overview?.schedulesToday ?? 4)}
          sub="Medicine, check-ins, vitals"
          trend={`${overview?.checkInsToday ?? 1} check-ins`}
          icon={AlertTriangle}
          iconBg="icon-chip-yellow"
        />
        <StatMetricCard
          label="Saheli messages"
          value={loading ? "…" : String(overview?.messagesToday ?? 6)}
          sub="Recent replies in thread"
          trend={overview?.messagesToday ? "Active" : "Active"}
          icon={Heart}
          iconBg="icon-chip-red"
        />
        <StatMetricCard
          label="Tasks today"
          value={loading ? "…" : tasksLabel}
          sub="Check-ins, medicines, vitals"
          trend={
            scheduled > 0 && completed >= scheduled
              ? "On track"
              : `${overview?.pendingApprovals ?? 0} to approve`
          }
          icon={CheckCircle2}
          iconBg="icon-chip-green"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusSummaryCard
          statusLabel="Saheli ready"
          detail={`${mamaName} · ${medsDone} · cheerful check-in`}
        />
        <VitalsTrendCard
          title="Family care trends"
          subtitle={`${mamaName} · check-ins & adherence · this week`}
          metrics={metrics}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CareRecipientVitalsCard name={recipientName} />
        <FamilyActivityBarCard metrics={metrics} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WeeklyMedsBarCard title={`${recipientName} · medicine adherence`} metrics={metrics} />
        <div className="lg:col-span-2">
          <VitalsGridCard />
        </div>
      </div>

      {activeFamilyId && subjectUserId && (
        <div className="mb-6">
          <CareRecordTimeline familyId={activeFamilyId} subjectUserId={subjectUserId} />
        </div>
      )}

      <HealthLogTable items={overview?.recentActivity ?? []} loading={loading} />
    </>
  );
}
