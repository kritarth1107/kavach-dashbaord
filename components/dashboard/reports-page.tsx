"use client";

import { BarChart3, FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { getFamilyMembers, getRecipientLabs, type LabDocument } from "@/lib/api";

type ReportRow = LabDocument & { recipientName: string };

export function ReportsPage() {
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const [docs, setDocs] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const isRecipient = isCareRecipientRole(activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getFamilyMembers(activeFamilyId);
      const members = (data?.members ?? []).map(apiMemberToFamilyMember);
      const targets = isRecipient
        ? members.filter((m) => m.userId === userId)
        : members.filter(
            (m) => isCareRecipientRole(m.role) && m.status === "joined" && m.userId,
          );

      const rows: ReportRow[] = [];
      for (const member of targets) {
        if (!member.userId) continue;
        const labs = await getRecipientLabs(activeFamilyId, member.userId);
        for (const doc of labs.data?.documents ?? []) {
          rows.push({ ...doc, recipientName: member.name });
        }
      }
      rows.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") * -1);
      setDocs(rows);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, isRecipient, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = docs[0];
  const oldest = docs[docs.length - 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="panel-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">On file</p>
          <p className="mt-1 text-[1.5rem] font-extrabold text-[#111827]">
            {loading ? "…" : docs.length}
          </p>
          <p className="text-[11px] text-[#9ca3af]">Labs, scans & discharge notes</p>
        </div>
        <div className="panel-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">Latest</p>
          <p className="mt-1 text-[1.5rem] font-extrabold text-[#111827]">
            {loading ? "…" : latest?.record_date || "—"}
          </p>
          <p className="truncate text-[11px] text-[#9ca3af]">{latest?.title || "No report yet"}</p>
        </div>
        <div className="panel-card col-span-2 p-4 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">Record span</p>
          <p className="mt-1 text-[1.5rem] font-extrabold text-[#111827]">
            {loading ? "…" : oldest?.record_date && latest?.record_date ? `${oldest.record_date.split(" ").pop()}–${latest.record_date.split(" ").pop()}` : "—"}
          </p>
          <p className="text-[11px] text-[#9ca3af]">Printed values only</p>
        </div>
      </div>

      <div className="panel-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#f0f0f2] px-5 py-4">
          <BarChart3 className="h-4 w-4 text-primary" strokeWidth={2.25} />
          <div>
            <h1 className="text-[16px] font-extrabold text-[#111827]">Reports</h1>
            <p className="text-[12px] text-[#9ca3af]">Printed values from the family record</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : docs.length === 0 ? (
          <p className="px-5 py-16 text-center text-[13px] text-[#9ca3af]">
            No reports filed yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#f5f5f7]">
            {docs.map((doc) => (
              <li key={doc.document_id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe]">
                  <FileText className="h-4 w-4 text-[#2563eb]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#111827]">{doc.title}</p>
                  <p className="text-[11px] text-[#9ca3af]">
                    {doc.recipientName}
                    {doc.record_date ? ` · ${doc.record_date}` : ""}
                  </p>
                  {doc.snippet && (
                    <p className="mt-1 text-[12px] leading-relaxed text-[#6b7280]">{doc.snippet}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-md bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Filed
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
