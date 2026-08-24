"use client";

import { FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { getFamilyMembers, getRecipientLabs, type LabDocument } from "@/lib/api";

type LabRow = LabDocument & { recipientName: string };

export function HealthRecordPage() {
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const [docs, setDocs] = useState<LabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isRecipient = isCareRecipientRole(activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await getFamilyMembers(activeFamilyId);
      const members = (data?.members ?? []).map(apiMemberToFamilyMember);
      const targets = isRecipient
        ? members.filter((m) => m.userId === userId)
        : members.filter(
            (m) => isCareRecipientRole(m.role) && m.status === "joined" && m.userId,
          );

      const rows: LabRow[] = [];
      for (const member of targets) {
        if (!member.userId) continue;
        try {
          const labs = await getRecipientLabs(activeFamilyId, member.userId);
          for (const doc of labs.data?.documents ?? []) {
            rows.push({ ...doc, recipientName: member.name });
          }
        } catch {
          /* skip one recipient */
        }
      }
      rows.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") * -1);
      setDocs(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the health record");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, isRecipient, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="panel-card overflow-hidden">
      <div className="border-b border-[#f0f0f2] px-5 py-4">
        <h1 className="text-[16px] font-extrabold text-[#111827]">Health Record</h1>
        <p className="text-[12px] text-[#9ca3af]">
          Labs and vitals on file · printed values only
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[12px] text-[#b91c1c]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : docs.length === 0 ? (
        <p className="px-5 py-16 text-center text-[13px] text-[#9ca3af]">
          No labs in the record yet. Open a care recipient and paste report text.
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
                  {doc.kind ? ` · ${doc.kind}` : ""}
                </p>
                {doc.snippet && (
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6b7280]">{doc.snippet}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
