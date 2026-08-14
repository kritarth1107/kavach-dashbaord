"use client";

import { FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getRecipientLabs,
  uploadRecipientLab,
  type LabDocument,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";

export function LabMemoryCard({
  recipientUserId,
  recipientName,
}: {
  recipientUserId: string;
  recipientName: string;
}) {
  const { activeFamilyId } = useFamily();
  const [docs, setDocs] = useState<LabDocument[]>([]);
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    if (!activeFamilyId || !recipientUserId) return;
    setLoading(true);
    try {
      const { data } = await getRecipientLabs(activeFamilyId, recipientUserId);
      setDocs(data?.documents ?? []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!activeFamilyId || saving) return;
    setSaving(true);
    setError("");
    setOk("");
    try {
      await uploadRecipientLab(activeFamilyId, recipientUserId, {
        title: title.trim(),
        rawText: rawText.trim(),
        kind: "lab",
        recordDate: recordDate.trim() || undefined,
      });
      setTitle("");
      setRawText("");
      setRecordDate("");
      setOk("Saved. Ask Saheli something like “last TSH?”");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel-card mb-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#f0f0f2] px-5 py-4">
        <FileText className="h-4 w-4 text-[#2563eb]" strokeWidth={2.25} />
        <div>
          <h2 className="text-[15px] font-extrabold text-[#111827]">Labs for Saheli</h2>
          <p className="text-[12px] text-[#9ca3af]">
            Paste report text. Saheli will cite it — never interpret.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleUpload(e)} className="space-y-3 border-b border-[#f0f0f2] px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${recipientName} · TSH report`}
            className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2.5 text-[13px] outline-none focus:border-primary"
            required
          />
          <input
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            placeholder="Record date (optional) e.g. 8 Aug 2026"
            className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2.5 text-[13px] outline-none focus:border-primary"
          />
        </div>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"TSH 4.2 mIU/L (8 Aug 2026)\nFree T4 1.1 ng/dL"}
          rows={4}
          className="w-full rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2.5 text-[13px] outline-none focus:border-primary"
          required
        />
        {error && <p className="text-[12px] text-[#b91c1c]">{error}</p>}
        {ok && <p className="text-[12px] text-primary">{ok}</p>}
        <button
          type="submit"
          disabled={saving || !title.trim() || !rawText.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save lab for Saheli"}
        </button>
      </form>

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-[12px] text-[#9ca3af]">No labs in memory yet.</p>
        ) : (
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li key={doc.document_id} className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-[#111827]">{doc.title}</p>
                <p className="text-[11px] text-[#9ca3af]">
                  {doc.record_date || doc.kind}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
