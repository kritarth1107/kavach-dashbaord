"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { getCareBrief, getFamilyMembers, type CareBrief } from "@/lib/api";
import { CareRecordTimeline } from "@/components/dashboard/care-record/care-record-timeline";

export function ReportsPage() {
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const [brief, setBrief] = useState<CareBrief | null>(null);
  const [subjectUserId, setSubjectUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isRecipient = isCareRecipientRole(activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: membersData } = await getFamilyMembers(activeFamilyId);
      const members = (membersData?.members ?? []).map(apiMemberToFamilyMember);
      const target = isRecipient
        ? members.find((m) => m.userId === userId)
        : members.find(
            (m) => isCareRecipientRole(m.role) && m.status === "joined" && m.userId,
          );
      if (!target?.userId) {
        setBrief(null);
        setSubjectUserId(null);
        return;
      }
      setSubjectUserId(target.userId);
      const { data } = await getCareBrief(activeFamilyId, target.userId);
      setBrief(data ?? null);
    } catch {
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, isRecipient, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="panel-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-4">
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.25} />
          <div>
            <h1 className="text-[16px] font-extrabold text-[var(--text-primary)]">Care Brief</h1>
            <p className="text-[12px] text-[var(--text-tertiary)]">
              Generated live from the Care Record — not a template
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !brief ? (
          <p className="px-5 py-16 text-center text-[13px] text-[var(--text-tertiary)]">
            No Care Brief yet — activity will appear here as Saheli and the family log events.
          </p>
        ) : (
          <div className="space-y-4 px-5 py-5">
            <p className="text-[11px] text-[var(--text-tertiary)]">
              {brief.subjectName} · {new Date(brief.generatedAt).toLocaleString("en-IN")} ·{" "}
              {brief.eventCount} events
            </p>
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-primary)]">
              {brief.sections.narrative}
            </div>
            {brief.sections.recentSignals.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary-light p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                  Quiet context
                </p>
                {brief.sections.recentSignals.map((s) => (
                  <p key={s.eventId} className="mt-2 text-[12px] text-[var(--text-secondary)]">
                    {s.detail}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {activeFamilyId && subjectUserId && (
        <CareRecordTimeline familyId={activeFamilyId} subjectUserId={subjectUserId} />
      )}
    </div>
  );
}
