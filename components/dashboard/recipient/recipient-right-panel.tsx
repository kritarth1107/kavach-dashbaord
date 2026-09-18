"use client";

import Link from "next/link";
import {
  Bell,
  ChevronRight,
  FileText,
  Heart,
  Loader2,
  Pill,
  Settings,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import {
  getFamilyMembers,
  getRecipientBriefing,
  getRecipientLabs,
  type RecipientBriefing,
} from "@/lib/api";
import { apiMemberToFamilyMember } from "@/components/dashboard/family/family-data";

export function RecipientRightPanel() {
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const familyName = activeFamily?.name ?? "Your family";
  const [briefing, setBriefing] = useState<RecipientBriefing | null>(null);
  const [labs, setLabs] = useState<Array<{ title: string; recordDate?: string }>>([]);
  const [members, setMembers] = useState<Array<{ name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeFamilyId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: briefingData }, { data: labsData }, { data: membersData }] =
        await Promise.all([
          getRecipientBriefing(activeFamilyId, userId),
          getRecipientLabs(activeFamilyId, userId),
          getFamilyMembers(activeFamilyId),
        ]);
      setBriefing(briefingData ?? null);
      setLabs(
        (labsData?.documents ?? []).slice(0, 3).map((d) => ({
          title: d.title,
          recordDate: d.record_date ?? undefined,
        })),
      );
      setMembers(
        (membersData?.members ?? [])
          .map(apiMemberToFamilyMember)
          .filter((m) => m.status === "joined")
          .slice(0, 4)
          .map((m) => ({ name: m.name, role: m.role.replace(/_/g, " ").toLowerCase() })),
      );
    } catch {
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const schedule = briefing?.todayItems ?? [];

  return (
    <aside className="no-scrollbar flex h-screen min-w-0 flex-1 shrink-0 flex-col overflow-y-auto border-l border-[var(--border-strong)] px-5 py-6">
      <div className="mb-5 flex items-center gap-2">
        <Link
          href="/dashboard/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <Settings className="h-[16px] w-[16px]" strokeWidth={2} />
        </Link>
        <Link
          href="/dashboard/notifications"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <Bell className="h-[16px] w-[16px]" strokeWidth={2} />
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-primary/20 bg-primary-light p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" strokeWidth={2.25} />
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
            Saheli · Active
          </p>
        </div>
        <p className="mt-2 text-[14px] font-bold text-[var(--text-primary)]">
          Your care companion is connected
        </p>
        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
          Check-ins and reminders are running for {familyName}.
        </p>
      </div>

      <p className="mb-3 text-[12px] font-bold text-[var(--text-primary)]">Today&apos;s schedule</p>
      <div className="panel-card mb-5 p-3">
        {loading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
        ) : schedule.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)]">Nothing scheduled today.</p>
        ) : (
          schedule.map((item) => (
            <div key={`${item.time}-${item.title}`} className="flex items-center gap-3 py-2">
              <Pill className="h-3.5 w-3.5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold">{item.title}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{item.time}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="mb-3 text-[12px] font-bold text-[var(--text-primary)]">Recent reports</p>
      <div className="panel-card mb-5 divide-y divide-[var(--border-strong)]">
        {labs.length === 0 ? (
          <p className="p-3 text-[11px] text-[var(--text-tertiary)]">No reports uploaded yet.</p>
        ) : (
          labs.map((report) => (
            <Link
              key={report.title}
              href="/dashboard/reports"
              className="flex items-center justify-between gap-2 p-3 hover:bg-[var(--input-bg)]"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                <div>
                  <p className="text-[12px] font-semibold">{report.title}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{report.recordDate ?? "—"}</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            </Link>
          ))
        )}
      </div>

      <p className="mb-3 text-[12px] font-bold text-[var(--text-primary)]">Care circle</p>
      <div className="panel-card p-3">
        {members.map((m) => (
          <div key={m.name} className="flex items-center gap-2 py-2">
            <Users className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <div>
              <p className="text-[12px] font-semibold">{m.name}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{m.role}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
