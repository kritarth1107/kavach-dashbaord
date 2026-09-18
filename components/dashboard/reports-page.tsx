"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { getCareBrief, getFamilyMembers, getLabTrends, type CareBrief } from "@/lib/api";
import { CareRecordTimeline } from "@/components/dashboard/care-record/care-record-timeline";

export function ReportsPage() {
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const [brief, setBrief] = useState<CareBrief | null>(null);
  const [recipients, setRecipients] = useState<Array<{ userId: string; name: string }>>([]);
  const [subjectUserId, setSubjectUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tshTrend, setTshTrend] = useState<Array<{ value: string; date: string }>>([]);
  const isRecipient = isCareRecipientRole(activeFamily?.role);

  const loadBrief = useCallback(
    async (recipientId: string) => {
      if (!activeFamilyId) return;
      setLoading(true);
      try {
        const [{ data }, trendsRes] = await Promise.all([
          getCareBrief(activeFamilyId, recipientId),
          getLabTrends(activeFamilyId, recipientId, "TSH").catch(() => ({ data: undefined })),
        ]);
        setBrief(data ?? null);
        setTshTrend(trendsRes.data?.points ?? []);
      } catch {
        setBrief(null);
      } finally {
        setLoading(false);
      }
    },
    [activeFamilyId],
  );

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: membersData } = await getFamilyMembers(activeFamilyId);
      const members = (membersData?.members ?? []).map(apiMemberToFamilyMember);
      const list = isRecipient
        ? members.filter((m) => m.userId === userId && m.userId)
        : members.filter(
            (m) => isCareRecipientRole(m.role) && m.status === "joined" && m.userId,
          );
      const mapped = list.map((m) => ({ userId: m.userId!, name: m.name }));
      setRecipients(mapped);
      const targetId = mapped[0]?.userId ?? null;
      setSubjectUserId(targetId);
      if (targetId) await loadBrief(targetId);
      else setBrief(null);
    } catch {
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, isRecipient, userId, loadBrief]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (subjectUserId) void loadBrief(subjectUserId);
  }, [subjectUserId, loadBrief]);

  return (
    <div className="space-y-4">
      {recipients.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {recipients.map((r) => (
            <button
              key={r.userId}
              type="button"
              onClick={() => setSubjectUserId(r.userId)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                subjectUserId === r.userId
                  ? "bg-primary text-white"
                  : "border border-[var(--border-strong)] bg-[var(--card)] text-[var(--text-secondary)]"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
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

      {tshTrend.length >= 2 && (
        <div className="panel-card p-5">
          <h2 className="text-[14px] font-bold">TSH trend</h2>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Reported values only — not a clinical interpretation
          </p>
          <div className="mt-4 flex items-end gap-2">
            {tshTrend.map((point) => (
              <div key={`${point.date}-${point.value}`} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[48px] rounded-t bg-primary/70"
                  style={{ height: `${Math.min(80, Math.max(16, Number.parseFloat(point.value) * 8))}px` }}
                />
                <span className="text-[9px] font-bold text-[var(--text-primary)]">{point.value}</span>
                <span className="text-[8px] text-[var(--text-tertiary)]">{point.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeFamilyId && subjectUserId && (
        <CareRecordTimeline familyId={activeFamilyId} subjectUserId={subjectUserId} />
      )}
    </div>
  );
}
