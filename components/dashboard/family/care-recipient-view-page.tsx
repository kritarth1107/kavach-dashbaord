"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getFamilyMembers } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { CareScheduleSection } from "@/components/dashboard/family/care-schedule-section";
import { CareRecipientOverview } from "@/components/dashboard/family/care-recipient-overview";
import { SaheliThreadPanel } from "@/components/dashboard/family/saheli-thread-panel";
import { HealthRecordsPanel } from "@/components/dashboard/health-records/health-records-panel";
import {
  apiMemberToFamilyMember,
  formatDisplayName,
  isCareRecipientRole,
  type FamilyMember,
} from "./family-data";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "health", label: "Health records" },
  { id: "saheli", label: "Saheli" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CareRecipientViewPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { activeFamilyId, activeFamily, loading: familyLoading } = useFamily();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("overview");

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

  const displayName = member ? formatDisplayName(member.prefix, member.name) : "";

  if (familyLoading || loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isCareRecipientRole(activeFamily?.role)) {
    return (
      <div className="rounded-2xl border border-[#fef9c3] bg-[#fefce8] px-5 py-8 text-center">
        <p className="text-[14px] font-bold text-[#111827]">Caregiver view only</p>
        <p className="mt-2 text-[13px] text-[#6b7280]">
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
      <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-5 py-8 text-center">
        <p className="text-[14px] font-bold text-[#111827]">Unable to load care recipient</p>
        <p className="mt-2 text-[13px] text-[#6b7280]">{error || "Member not found."}</p>
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
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6b7280] transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
        Family members
      </Link>

      <div className="mb-5">
        <h1 className="text-[1.35rem] font-extrabold tracking-[-0.02em] text-[#111827]">
          {displayName}
        </h1>
        <p className="mt-1 text-[13px] text-[#6b7280]">
          Care overview · {member.relationship !== "—" ? member.relationship : "Care recipient"}
        </p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors",
              tab === t.id
                ? "bg-white text-[#111827] shadow-sm"
                : "text-[#6b7280] hover:text-[#111827]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && member.userId && (
        <CareRecipientOverview
          recipientUserId={member.userId}
          recipientName={subjectName}
          onOpenSchedule={() => setTab("schedule")}
          onOpenHealth={() => setTab("health")}
          onOpenSaheli={() => setTab("saheli")}
        />
      )}

      {tab === "schedule" && <CareScheduleSection subjectName={subjectName} />}

      {tab === "health" && member.userId && (
        <HealthRecordsPanel
          embedded
          fixedRecipientUserId={member.userId}
          fixedRecipientName={subjectName}
          showAddForm
        />
      )}

      {tab === "saheli" && member.userId && (
        <SaheliThreadPanel
          recipientUserId={member.userId}
          recipientName={subjectName}
        />
      )}
    </>
  );
}
