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

  const recipientName = overview?.recipients[0]?.name ?? "Care recipient";
  const tasksLabel =
    overview && overview.schedulesToday > 0
      ? `${overview.checkInsToday}/${overview.schedulesToday} check-ins`
      : "No schedules today";

  return (
    <>
      <CenterSearchBar />
      <DashboardGreeting variant="caregiver" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatMetricCard
          label="Care recipients"
          value={loading ? "…" : String(overview?.careRecipientCount ?? 0)}
          sub="In this family"
          trend={overview?.careRecipientCount ? "Active" : "Add one"}
          icon={Users}
          iconBg="bg-primary-light text-primary"
        />
        <StatMetricCard
          label="Today's schedules"
          value={loading ? "…" : String(overview?.schedulesToday ?? 0)}
          sub="Medicine, check-ins, vitals"
          trend={`${overview?.checkInsToday ?? 0} check-ins`}
          icon={AlertTriangle}
          iconBg="bg-[#fef9c3] text-[#a16207]"
        />
        <StatMetricCard
          label="Saheli messages"
          value={loading ? "…" : String(overview?.messagesToday ?? 0)}
          sub="Recent replies in thread"
          trend={overview?.lastSaheliReply ? "Active" : "Say hello"}
          icon={Heart}
          iconBg="bg-[#fee2e2] text-[#dc2626]"
        />
        <StatMetricCard
          label="Tasks today"
          value={loading ? "…" : tasksLabel}
          sub="From care schedules"
          trend="Reported only"
          icon={CheckCircle2}
          iconBg="bg-[#dcfce7] text-[#16a34a]"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusSummaryCard
          statusLabel={
            overview?.lastSaheliReply ? "Saheli replied" : "Saheli ready"
          }
          detail={
            overview?.lastSaheliReply?.slice(0, 80) ??
            `${recipientName} · start chat from Messages`
          }
        />
        <VitalsTrendCard title="Family care trends" subtitle="Charts — demo until vitals API" />
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
