"use client";

import {
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  deleteRecipientLab,
  getFamilyMembers,
  getRecipientLabDetail,
  getRecipientLabs,
  uploadRecipientLab,
  uploadRecipientLabFile,
  type LabDocument,
  type LabDocumentDetail,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { cn } from "@/lib/utils";

export const HEALTH_RECORD_KINDS = [
  { value: "all", label: "All types" },
  { value: "lab", label: "Lab reports" },
  { value: "vitals", label: "Vitals" },
  { value: "prescription", label: "Prescriptions" },
  { value: "note", label: "Notes" },
] as const;

export type HealthRecordRow = LabDocument & {
  recipientUserId: string;
  recipientName: string;
};

type HealthRecordsPanelProps = {
  /** When set, locks the panel to one care recipient (profile page). */
  fixedRecipientUserId?: string;
  fixedRecipientName?: string;
  /** Hide the page title block when embedded in a tab. */
  embedded?: boolean;
  /** Show compact add form at top. */
  showAddForm?: boolean;
};

function kindLabel(kind: string) {
  return HEALTH_RECORD_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HealthRecordsPanel({
  fixedRecipientUserId,
  fixedRecipientName,
  embedded = false,
  showAddForm = true,
}: HealthRecordsPanelProps) {
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const isRecipient = isCareRecipientRole(activeFamily?.role);

  const [records, setRecords] = useState<HealthRecordRow[]>([]);
  const [recipients, setRecipients] = useState<Array<{ userId: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [recipientFilter, setRecipientFilter] = useState(fixedRecipientUserId ?? "all");

  const [addOpen, setAddOpen] = useState(showAddForm && Boolean(fixedRecipientUserId));
  const [addRecipientId, setAddRecipientId] = useState(fixedRecipientUserId ?? "");
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [kind, setKind] = useState("lab");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState("");
  const [addMode, setAddMode] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [detail, setDetail] = useState<LabDocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const targets = fixedRecipientUserId
        ? members.filter((m) => m.userId === fixedRecipientUserId)
        : isRecipient
          ? members.filter((m) => m.userId === userId)
          : members.filter(
              (m) => isCareRecipientRole(m.role) && m.status === "joined" && m.userId,
            );

      setRecipients(
        targets
          .filter((m) => m.userId)
          .map((m) => ({ userId: m.userId!, name: m.name })),
      );

      const rows: HealthRecordRow[] = [];
      for (const member of targets) {
        if (!member.userId) continue;
        try {
          const labs = await getRecipientLabs(activeFamilyId, member.userId);
          for (const doc of labs.data?.documents ?? []) {
            rows.push({
              ...doc,
              recipientUserId: member.userId,
              recipientName: member.name,
            });
          }
        } catch {
          /* skip one recipient */
        }
      }
      rows.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      setRecords(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load health records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, fixedRecipientUserId, isRecipient, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (fixedRecipientUserId) {
      setRecipientFilter(fixedRecipientUserId);
      setAddRecipientId(fixedRecipientUserId);
    }
  }, [fixedRecipientUserId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((doc) => {
      if (recipientFilter !== "all" && doc.recipientUserId !== recipientFilter) return false;
      if (kindFilter !== "all" && doc.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.recipientName.toLowerCase().includes(q) ||
        (doc.snippet ?? "").toLowerCase().includes(q) ||
        (doc.record_date ?? "").toLowerCase().includes(q)
      );
    });
  }, [records, search, kindFilter, recipientFilter]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!activeFamilyId || !addRecipientId || saving) return;
    setSaving(true);
    setError("");
    setSaveOk("");
    try {
      await uploadRecipientLab(activeFamilyId, addRecipientId, {
        title: title.trim(),
        rawText: rawText.trim(),
        kind,
        recordDate: recordDate.trim() || undefined,
      });
      setTitle("");
      setRawText("");
      setRecordDate("");
      setKind("lab");
      setSaveOk("Saved. Saheli can now cite these printed values.");
      if (!fixedRecipientUserId) setAddOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save record");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: FormEvent) {
    e.preventDefault();
    if (!activeFamilyId || !addRecipientId || !selectedFile || saving) return;
    setSaving(true);
    setError("");
    setSaveOk("");
    try {
      await uploadRecipientLabFile(activeFamilyId, addRecipientId, selectedFile, {
        title: title.trim() || undefined,
        kind,
        recordDate: recordDate.trim() || undefined,
      });
      setTitle("");
      setRecordDate("");
      setKind("lab");
      setSelectedFile(null);
      setSaveOk("File uploaded to Cloudflare R2. Text was extracted when possible.");
      if (!fixedRecipientUserId) setAddOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload file");
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(row: HealthRecordRow) {
    if (!activeFamilyId) return;
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await getRecipientLabDetail(
        activeFamilyId,
        row.recipientUserId,
        row.document_id,
      );
      setDetail(data ?? null);
    } catch {
      setDetail({
        ...row,
        raw_text: row.snippet ?? "Could not load full text.",
      });
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(row: HealthRecordRow) {
    if (!activeFamilyId) return;
    if (!window.confirm(`Remove "${row.title}" from the health record?`)) return;
    setDeletingId(row.document_id);
    try {
      await deleteRecipientLab(activeFamilyId, row.recipientUserId, row.document_id);
      if (detail?.document_id === row.document_id) setDetail(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete record");
    } finally {
      setDeletingId(null);
    }
  }

  const addTargetName =
    fixedRecipientName ??
    recipients.find((r) => r.userId === addRecipientId)?.name ??
    "care recipient";

  return (
    <div className={cn("panel-card overflow-hidden", embedded ? "mb-0" : "")}>
      {!embedded && (
        <div className="border-b border-[#f0f0f2] px-5 py-4">
          <h1 className="text-[16px] font-extrabold text-[#111827]">Health records</h1>
          <p className="text-[12px] text-[#9ca3af]">
            Labs, vitals, and notes on file · Saheli cites printed values only
          </p>
        </div>
      )}

      <div className="space-y-3 border-b border-[#f0f0f2] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 focus-within:border-primary focus-within:bg-white">
            <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or text…"
              className="w-full bg-transparent text-[13px] outline-none"
            />
          </div>
          {!fixedRecipientUserId && recipients.length > 1 && (
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-[13px] outline-none focus:border-primary"
            >
              <option value="all">All care recipients</option>
              {recipients.map((r) => (
                <option key={r.userId} value={r.userId}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-[13px] outline-none focus:border-primary"
          >
            {HEALTH_RECORD_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          {showAddForm && !addOpen && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[12px] font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Add record
            </button>
          )}
        </div>

        {addOpen && showAddForm && (
          <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-[#111827]">
                Add for {addTargetName}
              </p>
              <div className="flex gap-1 rounded-lg bg-white p-1">
                <button
                  type="button"
                  onClick={() => setAddMode("file")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[11px] font-semibold",
                    addMode === "file" ? "bg-primary text-white" : "text-[#6b7280]",
                  )}
                >
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("text")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[11px] font-semibold",
                    addMode === "text" ? "bg-primary text-white" : "text-[#6b7280]",
                  )}
                >
                  Paste text
                </button>
              </div>
            </div>

            {!fixedRecipientUserId && recipients.length > 1 && (
              <select
                value={addRecipientId}
                onChange={(e) => setAddRecipientId(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] outline-none"
                required
              >
                <option value="">Select care recipient</option>
                {recipients.map((r) => (
                  <option key={r.userId} value={r.userId}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}

            {addMode === "file" ? (
              <form onSubmit={(e) => void handleFileUpload(e)} className="space-y-3">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d1d5db] bg-white px-4 py-8 transition-colors hover:border-primary">
                  <Upload className="mb-2 h-8 w-8 text-primary" />
                  <p className="text-[13px] font-semibold text-[#111827]">
                    {selectedFile ? selectedFile.name : "Choose PDF, image, or text file"}
                  </p>
                  <p className="mt-1 text-[11px] text-[#9ca3af]">
                    Stored at cdn.kavach.care / familyId / filename
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/*"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] outline-none sm:col-span-2"
                  />
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] outline-none"
                  >
                    {HEALTH_RECORD_KINDS.filter((k) => k.value !== "all").map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  placeholder="Record date (optional)"
                  className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] outline-none"
                />
                <button
                  type="submit"
                  disabled={saving || !selectedFile || !addRecipientId}
                  className="rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                >
                  {saving ? "Uploading…" : "Upload to Cloudflare R2"}
                </button>
              </form>
            ) : (
          <form onSubmit={(e) => void handleAdd(e)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title e.g. TSH report"
                className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] outline-none sm:col-span-2"
                required
              />
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] outline-none"
              >
                {HEALTH_RECORD_KINDS.filter((k) => k.value !== "all").map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              placeholder="Record date (optional) e.g. 8 Aug 2026"
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] outline-none"
            />
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"Paste printed values only:\nTSH 4.2 mIU/L\nFree T4 1.1 ng/dL"}
              rows={4}
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] outline-none"
              required
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || !title.trim() || !rawText.trim() || !addRecipientId}
                className="rounded-lg bg-primary px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save record"}
              </button>
              {!fixedRecipientUserId && (
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-lg border border-[#e5e7eb] px-4 py-2 text-[12px] font-semibold text-[#6b7280]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[12px] text-[#b91c1c]">
          {error}
        </div>
      )}
      {saveOk && (
        <div className="mx-5 mt-4 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[12px] text-primary">
          {saveOk}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-5 py-16 text-center text-[13px] text-[#9ca3af]">
          {records.length === 0
            ? "No health records yet. Add a lab report or vitals reading above."
            : "No records match your filters."}
        </p>
      ) : (
        <ul className="divide-y divide-[#f5f5f7]">
          {filtered.map((doc) => (
            <li key={`${doc.recipientUserId}-${doc.document_id}`} className="flex items-start gap-3 px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe]">
                <FileText className="h-4 w-4 text-[#2563eb]" />
              </div>
              <button
                type="button"
                onClick={() => void openDetail(doc)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-[13px] font-bold text-[#111827]">{doc.title}</p>
                <p className="text-[11px] text-[#9ca3af]">
                  {doc.recipientName}
                  {doc.record_date ? ` · ${doc.record_date}` : doc.created_at ? ` · ${formatWhen(doc.created_at)}` : ""}
                  {` · ${kindLabel(doc.kind)}`}
                </p>
                {doc.snippet && (
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#6b7280]">
                    {doc.snippet}
                  </p>
                )}
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 inline-block text-[11px] font-semibold text-primary hover:underline"
                  >
                    Open file on CDN
                  </a>
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(doc)}
                disabled={deletingId === doc.document_id}
                className="shrink-0 rounded-lg p-2 text-[#9ca3af] hover:bg-[#fef2f2] hover:text-[#dc2626] disabled:opacity-50"
                aria-label="Delete record"
              >
                {deletingId === doc.document_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {(detailLoading || detail) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-[#f0f0f2] px-5 py-4">
              <div>
                <p className="text-[15px] font-extrabold text-[#111827]">{detail?.title ?? "Loading…"}</p>
                {detail && (
                  <p className="text-[11px] text-[#9ca3af]">
                    {kindLabel(detail.kind)}
                    {detail.record_date ? ` · ${detail.record_date}` : ""}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-[#9ca3af]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {detail?.file_url && (
                    <a
                      href={detail.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-4 inline-flex items-center gap-2 rounded-lg bg-[#f0fdf4] px-3 py-2 text-[12px] font-semibold text-primary hover:underline"
                    >
                      Open uploaded file
                    </a>
                  )}
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#374151]">
                    {detail?.raw_text}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
