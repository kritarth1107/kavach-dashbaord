import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  Users,
} from "lucide-react";
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

export function CaregiverDashboardHome() {
  return (
    <>
      <CenterSearchBar />
      <DashboardGreeting variant="caregiver" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatMetricCard
          label="Care recipients"
          value="1"
          sub="Being actively monitored"
          trend="All well"
          icon={Users}
          iconBg="bg-primary-light text-primary"
        />
        <StatMetricCard
          label="Pending approvals"
          value="2"
          sub="Bills & orders awaiting you"
          trend="Action needed"
          trendUp={false}
          icon={AlertTriangle}
          iconBg="bg-[#fef9c3] text-[#a16207]"
        />
        <StatMetricCard
          label="Med adherence"
          value="94%"
          sub="Family average · 7 days"
          trend="+2%"
          icon={Heart}
          iconBg="bg-[#fee2e2] text-[#dc2626]"
        />
        <StatMetricCard
          label="Tasks completed"
          value="18/20"
          sub="Check-ins & doses today"
          trend="90%"
          icon={CheckCircle2}
          iconBg="bg-[#dcfce7] text-[#16a34a]"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusSummaryCard />
        <VitalsTrendCard title="Family care trends" subtitle="All members · check-ins & adherence" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CareRecipientVitalsCard name="Mrs. R" />
        <FamilyActivityBarCard />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WeeklyMedsBarCard title="Mrs. R · medicine adherence" />
        <div className="lg:col-span-2">
          <VitalsGridCard />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatMetricCard
          label="Check-ins"
          value="94%"
          sub="This week"
          sparkline={[65, 72, 78, 85, 88, 91, 94]}
          dark
        />
        <StatMetricCard
          label="Medicines"
          value="2/2"
          sub="Taken today"
          sparkline={[90, 88, 92, 91, 94, 96, 98]}
          dark
        />
        <StatMetricCard
          label="Alerts"
          value="3"
          sub="Open items"
          sparkline={[2, 3, 2, 4, 3, 3, 3]}
          sparkColor="#f59e0b"
          dark
        />
        <StatMetricCard
          label="Reports"
          value="12"
          sub="On file"
          sparkline={[8, 9, 10, 10, 11, 11, 12]}
          sparkColor="#60a5fa"
          dark
        />
      </div>

      <HealthLogTable />
    </>
  );
}
