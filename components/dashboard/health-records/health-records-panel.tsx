"use client";

import {
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
  Download,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  deleteRecipientLab,
  downloadRecipientLabFile,
  getFamilyMembers,
  getRecipientLabDetail,
  getRecipientLabs,
  uploadRecipientLab,
  uploadRecipientLabFile,
  uploadRecipientLabFiles,
  type LabDocument,
  type LabDocumentDetail,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { cn } from "@/lib/utils";
import { medicalUploadError } from "@/lib/medical-record-file";
import { resolveRecordElderId } from "@/lib/medical-record-form";
import { medicalRecordLines } from "@/lib/medical-record-view";
import { RecordAddForms } from "@/components/dashboard/health-records/record-add-forms";

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
  /** Tighter layout for member profile scroll view. */
  compact?: boolean;
  /** Show compact add form at top. */
  showAddForm?: boolean;
  /** Called after records are added, updated, or deleted. */
  onRecordsChange?: () => void;
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
  compact = false,
  showAddForm = true,
  onRecordsChange,
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

  const [addOpen, setAddOpen] = useState(
    showAddForm && Boolean(fixedRecipientUserId) && !compact,
  );
  const [addRecipientId, setAddRecipientId] = useState(fixedRecipientUserId ?? "");
  const [rawText, setRawText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState("");
  const [addMode, setAddMode] = useState<"file" | "text">("file");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  const [detail, setDetail] = useState<LabDocumentDetail | null>(null);
  const [detailRecipientUserId, setDetailRecipientUserId] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const elderId = resolveRecordElderId({
    fixedRecipientUserId,
    chosenRecipientId: addRecipientId,
    recipientFilter,
    recipientIds: recipients.map((r) => r.userId),
  });

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!activeFamilyId || !elderId || !rawText.trim() || saving) return;
    setSaving(true);
    setError("");
    setSaveOk("");
    try {
      await uploadRecipientLab(activeFamilyId, elderId, {
        rawText: rawText.trim(),
      });
      setRawText("");
      setSaveOk("Saved. Saheli detected title, type, and date automatically.");
      if (!fixedRecipientUserId) setAddOpen(false);
      await load();
      onRecordsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save record");
    } finally {
      setSaving(false);
    }
  }

  function addPickedFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    if (!incoming.length) return;
    const rejected = incoming.map((file) => medicalUploadError(file)).find(Boolean);
    if (rejected) {
      setError(rejected);
      setSaveOk("");
    } else {
      setError("");
    }
    setSelectedFiles((prev) => {
      const merged = [...prev];
      for (const file of incoming) {
        if (medicalUploadError(file)) continue;
        if (merged.length >= 25) break;
        const exists = merged.some(
          (current) =>
            current.name === file.name &&
            current.size === file.size &&
            current.lastModified === file.lastModified,
        );
        if (!exists) merged.push(file);
      }
      return merged;
    });
  }

  function onFileDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setDragOver(true);
  }

  function onFileDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function onFileDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragOver(false);
    }
  }

  function onFileDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    if (event.dataTransfer.files?.length) addPickedFiles(event.dataTransfer.files);
  }

  async function handleFileUpload(e: FormEvent) {
    e.preventDefault();
    if (!activeFamilyId || !elderId || !selectedFiles.length || saving) return;
    const blocked = selectedFiles.map((file) => medicalUploadError(file)).find(Boolean);
    if (blocked) {
      setError(blocked);
      return;
    }
    setSaving(true);
    setError("");
    setSaveOk("");
    try {
      if (selectedFiles.length === 1) {
        const { data } = await uploadRecipientLabFile(activeFamilyId, elderId, selectedFiles[0], {});
        setSaveOk(
          data?.already_on_file
            ? "This file is already saved for this elder. No second copy was added."
            : data?.extraction_status === "failed"
              ? "File saved. Extraction failed — the original is kept."
              : "Uploaded. The original file and the fields we could read are on this record.",
        );
      } else {
        const { data } = await uploadRecipientLabFiles(
          activeFamilyId,
          elderId,
          selectedFiles,
          {},
        );
        const failed = data?.failed?.length ?? 0;
        const count = data?.count ?? selectedFiles.length;
        setSaveOk(
          failed
            ? `${count} file${count === 1 ? "" : "s"} uploaded. ${failed} failed.`
            : `${count} files uploaded. Saheli auto-tagged each one.`,
        );
      }
      setSelectedFiles([]);
      if (!fixedRecipientUserId) setAddOpen(false);
      await load();
      onRecordsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload files");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(
    recipientUserId: string,
    documentId: string,
    fileName?: string | null,
  ) {
    if (!activeFamilyId || !recipientUserId) return;
    setDownloadingId(documentId);
    setError("");
    try {
      await downloadRecipientLabFile(
        activeFamilyId,
        recipientUserId,
        documentId,
        fileName,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download file");
    } finally {
      setDownloadingId(null);
    }
  }

  function hasOriginalFile(doc: HealthRecordRow | LabDocumentDetail) {
    return Boolean(doc.file_url || doc.source === "file");
  }

  async function openDetail(row: HealthRecordRow) {
    if (!activeFamilyId) return;
    setDetailLoading(true);
    setDetail(null);
    setDetailRecipientUserId(row.recipientUserId);
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
      onRecordsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete record");
    } finally {
      setDeletingId(null);
    }
  }

  const addTargetName =
    fixedRecipientName ??
    recipients.find((r) => r.userId === elderId)?.name ??
    "care recipient";

  const pad = compact ? "px-4" : "px-5";
  const sectionPad = compact ? "py-3" : "py-4";

  return (
    <div className={cn("panel-card overflow-hidden", embedded && compact ? "mb-6" : embedded ? "mb-0" : "")}>
      {embedded && compact && fixedRecipientName && (
        <div className={cn("flex items-center gap-2 border-b border-[var(--border-strong)]", pad, sectionPad)}>
          <FileText className="h-4 w-4 shrink-0 text-[#60a5fa]" strokeWidth={2.25} />
          <div>
            <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">
              Health records for {fixedRecipientName}
            </h2>
            <p className="text-[12px] text-[var(--text-tertiary)]">
              Labs, vitals, and files · Saheli cites printed values only
            </p>
          </div>
        </div>
      )}

      {!embedded && (
        <div className={cn("border-b border-[var(--border-strong)]", pad, sectionPad)}>
          <h1 className="text-[16px] font-extrabold text-[var(--text-primary)]">Health records</h1>
          <p className="text-[12px] text-[var(--text-tertiary)]">
            Labs, vitals, and notes on file · Saheli cites printed values only
          </p>
        </div>
      )}

      <div className={cn("space-y-3 border-b border-[var(--border-strong)]", pad, sectionPad)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="flex w-full min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 focus-within:border-primary focus-within:bg-[var(--card)] sm:min-w-[200px]">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
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
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-[13px] outline-none focus:border-primary sm:w-auto"
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
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-[13px] outline-none focus:border-primary sm:w-auto"
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
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[12px] font-bold text-white sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add record
            </button>
          )}
        </div>

        {addOpen && showAddForm && (
          <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-[var(--text-primary)]">
                Add for {addTargetName}
              </p>
              <div className="flex gap-1 rounded-lg bg-[var(--card)] p-1">
                <button
                  type="button"
                  onClick={() => setAddMode("file")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[11px] font-semibold",
                    addMode === "file" ? "bg-primary text-white" : "text-[var(--text-secondary)]",
                  )}
                >
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("text")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[11px] font-semibold",
                    addMode === "text" ? "bg-primary text-white" : "text-[var(--text-secondary)]",
                  )}
                >
                  Paste text
                </button>
              </div>
            </div>

            {!fixedRecipientUserId && recipients.length > 1 && (
              <select
                value={addRecipientId || (recipientFilter !== "all" ? recipientFilter : "")}
                onChange={(e) => setAddRecipientId(e.target.value)}
                aria-label="Care recipient"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[13px] outline-none"
              >
                <option value="">Select care recipient</option>
                {recipients.map((r) => (
                  <option key={r.userId} value={r.userId}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}

            <RecordAddForms
              mode={addMode}
              saving={saving}
              files={selectedFiles}
              text={rawText}
              elderId={elderId}
              compact={compact}
              dragOver={dragOver}
              showCancel={!fixedRecipientUserId}
              onDragEnter={onFileDragEnter}
              onDragOver={onFileDragOver}
              onDragLeave={onFileDragLeave}
              onDrop={onFileDrop}
              onPickFiles={addPickedFiles}
              onRemoveFile={(file) => setSelectedFiles((prev) => prev.filter((f) => f !== file))}
              onText={setRawText}
              onUpload={(e) => void handleFileUpload(e)}
              onSaveText={(e) => void handleAdd(e)}
              onCancel={() => setAddOpen(false)}
            />
          </div>
        )}
      </div>

      {error && (
        <div className={cn("mt-4 alert-error rounded-lg px-4 py-3 text-[12px]", pad, "mx-0")}>
          {error}
        </div>
      )}
      {saveOk && (
        <div className={cn("mt-4 rounded-lg border border-primary/30 bg-primary-light px-4 py-3 text-[12px] text-primary", pad, "mx-0")}>
          {saveOk}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className={cn(pad, compact ? "py-10" : "py-16", "text-center text-[13px] text-[var(--text-tertiary)]")}>
          {records.length === 0
            ? "No health records yet. Add a lab report or vitals reading above."
            : "No records match your filters."}
        </p>
      ) : (
        <ul className="divide-y divide-[#f5f5f7]">
          {filtered.map((doc) => (
            <li
              key={`${doc.recipientUserId}-${doc.document_id}`}
              className={cn("flex items-start gap-3", pad, compact ? "py-3" : "py-4")}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
                <FileText className="h-4 w-4 text-[#60a5fa]" />
              </div>
              <button
                type="button"
                onClick={() => void openDetail(doc)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-[13px] font-bold text-[var(--text-primary)]">{doc.title}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {doc.recipientName}
                  {doc.record_date ? ` · ${doc.record_date}` : doc.created_at ? ` · ${formatWhen(doc.created_at)}` : ""}
                  {` · ${kindLabel(doc.kind)}`}
                </p>
                {doc.tags && doc.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {doc.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-primary-light px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {(doc.ai_summary || doc.snippet || doc.extraction_status) && (
                  <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {medicalRecordLines(doc).slice(0, 4).join(" · ") || doc.ai_summary || doc.snippet}
                  </p>
                )}
                {hasOriginalFile(doc) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDownload(
                          doc.recipientUserId,
                          doc.document_id,
                          doc.file_name,
                        );
                      }}
                      disabled={downloadingId === doc.document_id}
                      className="inline-flex items-center gap-1 rounded-md bg-primary-light px-2 py-1 text-[11px] font-semibold text-primary hover:opacity-90 disabled:opacity-50"
                    >
                      {downloadingId === doc.document_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Download original
                    </button>
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-primary hover:underline"
                      >
                        Open in browser
                      </a>
                    )}
                  </div>
                )}
              </button>
              {hasOriginalFile(doc) && (
                <button
                  type="button"
                  onClick={() =>
                    void handleDownload(
                      doc.recipientUserId,
                      doc.document_id,
                      doc.file_name,
                    )
                  }
                  disabled={downloadingId === doc.document_id}
                  aria-label="Download original file"
                  className="shrink-0 rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-primary-light hover:text-primary disabled:opacity-50"
                >
                  {downloadingId === doc.document_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(doc)}
                disabled={deletingId === doc.document_id}
                className="shrink-0 rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] disabled:opacity-50"
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
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-[var(--card)] shadow-xl">
            <div className="flex items-start justify-between border-b border-[var(--border-strong)] px-5 py-4">
              <div>
                <p className="text-[15px] font-extrabold text-[var(--text-primary)]">{detail?.title ?? "Loading…"}</p>
                {detail && (
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    {kindLabel(detail.kind)}
                    {detail.record_date ? ` · ${detail.record_date}` : ""}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-[var(--text-tertiary)]">
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
                  {detail && hasOriginalFile(detail) && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          detail &&
                          void handleDownload(
                            detailRecipientUserId,
                            detail.document_id,
                            detail.file_name,
                          )
                        }
                        disabled={downloadingId === detail.document_id}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                      >
                        {downloadingId === detail.document_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Download original
                        {detail.file_name ? ` · ${detail.file_name}` : ""}
                      </button>
                      {detail.file_url && (
                        <a
                          href={detail.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg border border-[var(--border-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        >
                          Open in browser
                        </a>
                      )}
                    </div>
                  )}
                  {detail && (
                    <ul className="mb-4 space-y-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {medicalRecordLines(detail).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Extracted text
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[var(--text-secondary)]">
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
