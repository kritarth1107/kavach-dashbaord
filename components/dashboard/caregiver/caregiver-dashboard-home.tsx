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
import { useFamily } from "@/components/dashboard/family-context";
import { getFamilyOverview, type FamilyOverview } from "@/lib/api";

export function CaregiverDashboardHome() {
  const { activeFamilyId } = useFamily();
  const [overview, setOverview] = useState<FamilyOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setOverview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getFamilyOverview(activeFamilyId);
      setOverview(data ?? null);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const recipientName = overview?.recipients[0]?.name ?? "Mama";
  const mamaName = /vasundara/i.test(recipientName) ? "Mama" : recipientName.split(/\s+/).filter((p) => p !== "Mrs.")[0] || "Mama";
  const completed = overview?.completedToday ?? 0;
  const scheduled = overview?.schedulesToday ?? 0;
  const tasksLabel =
    scheduled > 0 ? `${completed}/${scheduled}` : "0/0";
  const medsDone = completed >= 2 ? "2/2 meds" : `${completed} logged`;

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
          iconBg="bg-primary-light text-primary"
        />
        <StatMetricCard
          label="Today's schedules"
          value={loading ? "…" : String(overview?.schedulesToday ?? 4)}
          sub="Medicine, check-ins, vitals"
          trend={`${overview?.checkInsToday ?? 1} check-ins`}
          icon={AlertTriangle}
          iconBg="bg-[#fef9c3] text-[#a16207]"
        />
        <StatMetricCard
          label="Saheli messages"
          value={loading ? "…" : String(overview?.messagesToday ?? 6)}
          sub="Recent replies in thread"
          trend={overview?.messagesToday ? "Active" : "Active"}
          icon={Heart}
          iconBg="bg-[#fee2e2] text-[#dc2626]"
        />
        <StatMetricCard
          label="Tasks today"
          value={loading ? "…" : tasksLabel}
          sub="Check-ins, medicines, vitals"
          trend={scheduled > 0 && completed >= scheduled ? "On track" : `${overview?.pendingApprovals ?? 1} to approve`}
          icon={CheckCircle2}
          iconBg="bg-[#dcfce7] text-[#16a34a]"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusSummaryCard
          statusLabel="All Well"
          detail={`${recipientName} · ${medsDone} · cheerful check-in`}
        />
        <VitalsTrendCard
          title="Family care trends"
          subtitle={`${mamaName} · check-ins & adherence · this week`}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CareRecipientVitalsCard name={recipientName} />
        <FamilyActivityBarCard />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WeeklyMedsBarCard title={`${recipientName} · medicine adherence`} />
        <div className="lg:col-span-2">
          <VitalsGridCard />
        </div>
      </div>

      <HealthLogTable items={overview?.recentActivity ?? []} loading={loading} />
    </>
  );
}
