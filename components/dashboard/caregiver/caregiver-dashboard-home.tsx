"use client";

import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { VitalsTrendCard } from "@/components/dashboard/charts/dashboard-chart-cards";
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
import { cn } from "@/lib/utils";

function firstName(name: string): string {
  return name.trim().split(/\s+/).filter((p) => p !== "Mrs.")[0] || name || "them";
}

function buildCaregiverSubtitle(overview: FamilyOverview | null, recipientName: string): string {
  if (!overview) return "Loading your family's care snapshot…";

  const parts: string[] = [];
  const who = firstName(recipientName);

  if (overview.lastHeardLine) {
    parts.push(`${who} last said: “${overview.lastHeardLine.slice(0, 100)}${overview.lastHeardLine.length > 100 ? "…" : ""}”`);
  } else if (overview.checkInsToday > 0) {
    parts.push(`${overview.checkInsToday} check-in${overview.checkInsToday === 1 ? "" : "s"} today`);
  }

  if (overview.schedulesToday > 0) {
    parts.push(`${overview.completedToday}/${overview.schedulesToday} schedules done`);
  }

  if (overview.pendingApprovals > 0) {
    parts.push(
      `${overview.pendingApprovals} order${overview.pendingApprovals === 1 ? "" : "s"} awaiting approval`,
    );
  } else {
    parts.push("Ask Saheli to order from Swiggy, Instamart, or Zepto");
  }

  return parts.join(" · ");
}

function QuickAction({
  href,
  icon: Icon,
  title,
  detail,
  accent,
  badge,
}: {
  href: string;
  icon: typeof MessageCircle;
  title: string;
  detail: string;
  accent: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group panel-card flex flex-col justify-between p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accent)}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {badge ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {badge}
          </span>
        ) : (
          <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
      <div className="mt-4">
        <p className="text-[14px] font-bold text-[var(--text-primary)]">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{detail}</p>
      </div>
    </Link>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-0.5 text-[18px] font-extrabold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

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

  const recipientName = overview?.recipients[0]?.name ?? "Care recipient";
  const subtitle = useMemo(
    () => buildCaregiverSubtitle(overview, recipientName),
    [overview, recipientName],
  );

  const chatHref = subjectUserId
    ? `/dashboard/chat?recipient=${encodeURIComponent(subjectUserId)}`
    : "/dashboard/chat";

  const schedulesLabel = loading
    ? "…"
    : overview?.schedulesToday
      ? `${overview.completedToday}/${overview.schedulesToday}`
      : "—";

  return (
    <>
      <DashboardGreeting variant="caregiver" subtitle={subtitle} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatChip label="Recipients" value={loading ? "…" : String(overview?.careRecipientCount ?? 0)} />
        <StatChip label="Today" value={schedulesLabel} />
        <StatChip
          label="Saheli"
          value={loading ? "…" : String(overview?.messagesToday ?? 0)}
        />
        <StatChip
          label="Approvals"
          value={loading ? "…" : String(overview?.pendingApprovals ?? 0)}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <QuickAction
          href={chatHref}
          icon={Sparkles}
          title="Ask Saheli"
          detail={`Chat, order food & groceries, check on ${firstName(recipientName)}`}
          accent="bg-primary/10 text-primary"
        />
        <QuickAction
          href="/dashboard/approvals"
          icon={ShoppingBag}
          title="Orders"
          detail="Approve baskets from Zepto, Swiggy, or Instamart"
          accent="bg-emerald-500/10 text-emerald-600"
          badge={
            overview?.pendingApprovals
              ? `${overview.pendingApprovals} pending`
              : undefined
          }
        />
        <QuickAction
          href="/dashboard/integrations"
          icon={Users}
          title="Integrations"
          detail="Connect Swiggy Food, Instamart, Zepto & WhatsApp"
          accent="bg-amber-500/10 text-amber-600"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {activeFamilyId && subjectUserId ? (
            <CareRecordTimeline familyId={activeFamilyId} subjectUserId={subjectUserId} />
          ) : (
            <div className="panel-card flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="mb-3 h-8 w-8 text-[var(--text-tertiary)]" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                No care recipient yet
              </p>
              <p className="mt-1 max-w-sm text-[12px] text-[var(--text-secondary)]">
                Invite a parent to the family to see their timeline and vitals here.
              </p>
              <Link
                href="/dashboard/family"
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white"
              >
                Family settings <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
          <VitalsTrendCard
            title={`${firstName(recipientName)} · this week`}
            subtitle="Check-ins & medicine adherence"
            metrics={metrics}
          />
          {!loading && overview && overview.completedToday >= (overview.schedulesToday || 1) && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-[12px] font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              On track for today&apos;s care schedule
            </div>
          )}
        </div>
      </div>
    </>
  );
}
