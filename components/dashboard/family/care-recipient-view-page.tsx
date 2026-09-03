"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getFamilyMembers } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { RecipientDashboardHome } from "@/components/dashboard/recipient/recipient-dashboard-home";
import { CareScheduleSection } from "@/components/dashboard/family/care-schedule-section";
import { MorningBriefingCard } from "@/components/dashboard/family/morning-briefing-card";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
  type FamilyMember,
} from "./family-data";

export function CareRecipientViewPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { activeFamilyId, activeFamily, loading: familyLoading } = useFamily();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMember = useCallback(async () => {
    if (!activeFamilyId || !userId) return;

    setLoading(true);
    setError("");

    try {
      const { data } = await getFamilyMembers(activeFamilyId);
      if (!data) throw new Error("Failed to load family members");

      const found = data.members
        .map(apiMemberToFamilyMember)
        .find(
          (m) =>
            m.userId === userId &&
            m.role === "care_recipient" &&
            m.status === "joined",
        );

      if (!found) {
        setError("Care recipient not found or you don't have access.");
        setMember(null);
        return;
      }

      setMember(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load care recipient");
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, userId]);

  useEffect(() => {
    void loadMember();
  }, [loadMember]);

  const subjectName = useMemo(() => {
    if (!member) return "";
    return member.name.split(/\s+/)[0] || member.name;
  }, [member]);

  const healthRecordHref = member?.userId
    ? `/dashboard/family/${member.userId}/health-record`
    : undefined;

  if (familyLoading || loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isCareRecipientRole(activeFamily?.role)) {
    return (
      <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-5 py-8 text-center">
        <p className="text-[14px] font-bold text-[var(--text-primary)]">Caregiver view only</p>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
          This page is for caregivers monitoring a care recipient.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex text-[13px] font-semibold text-primary hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-8 text-center">
        <p className="text-[14px] font-bold text-[var(--text-primary)]">Unable to load care recipient</p>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{error || "Member not found."}</p>
        <Link
          href="/dashboard/family"
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to family members
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/dashboard/family"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
        Family members
      </Link>

      <RecipientDashboardHome
        subjectName={subjectName}
        recipientUserId={member.userId ?? undefined}
        viewAsCaregiver
        healthRecordHref={healthRecordHref}
      />

      {member.userId && (
        <MorningBriefingCard
          recipientUserId={member.userId}
          recipientName={subjectName}
        />
      )}

      <CareScheduleSection subjectName={subjectName} />
    </>
  );
}
