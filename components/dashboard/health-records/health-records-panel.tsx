"use client";

import {
  ArrowSquareOut,
  CircleNotch,
  DownloadSimple,
  FileDoc,
  FileImage,
  FileText,
  Files,
  Heartbeat,
  MagnifyingGlass,
  Notepad,
  Prescription,
  TestTube,
  Trash,
  X,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
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
import { groupMetricsByKey, parseAllMetrics, type ParsedMetric } from "@/lib/health-metrics";
import { RecordAddForms } from "@/components/dashboard/health-records/record-add-forms";
import { possessive, usePerson } from "@/components/care-os/person-context";
import { Bars, DarkButton, Panel, PanelTitle, PillTabs, SmallButton, Tag } from "@/components/care-os/ui";

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
  /** Hide the page heading and side column when embedded in another page. */
  embedded?: boolean;
  /** Tighter layout for member profile scroll view. */
  compact?: boolean;
  /** Show the add form (upload or paste). */
  showAddForm?: boolean;
  /** Keep the add form open: no cancel, stays open after a save. */
  addFormPinned?: boolean;
  /** Called after records are added, updated, or deleted. */
  onRecordsChange?: () => void;
};

const INPUT =
  "h-10 w-full rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[13px] outline-none transition-colors placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)]";

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

function recordDate(doc: Pick<LabDocument, "record_date" | "created_at">) {
  if (doc.record_date) {
    const at = new Date(doc.record_date);
    return Number.isNaN(at.getTime()) ? doc.record_date : formatWhen(doc.record_date);
  }
  return formatWhen(doc.created_at);
}

/** Icon and short label for the file-type chip on each record card. */
function fileType(doc: LabDocument): { icon: PhosphorIcon; label: string } {
  const name = (doc.file_name ?? "").toLowerCase();
  const mime = (doc.mime_type ?? "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  if (doc.source === "file" || doc.file_url || name) {
    if (mime === "application/pdf" || ext === "pdf") return { icon: FileText, label: "PDF" };
    if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "heic", "heif", "webp"].includes(ext)) {
      return { icon: FileImage, label: ext ? (ext === "jpeg" ? "JPG" : ext.toUpperCase()) : "Photo" };
    }
    if (["doc", "docx"].includes(ext)) return { icon: FileDoc, label: "DOC" };
    return { icon: FileText, label: ext ? ext.toUpperCase().slice(0, 4) : "File" };
  }
  const byKind: Record<string, PhosphorIcon> = { lab: TestTube, vitals: Heartbeat, prescription: Prescription, note: Notepad };
  return { icon: byKind[doc.kind] ?? Notepad, label: "Text" };
}

function StatusTag({ doc }: { doc: LabDocument }) {
  if (doc.extraction_status === "failed") return <Tag tone="danger">Couldn&apos;t read</Tag>;
  if (doc.analysis_status === "pending") return <Tag tone="light">Reading…</Tag>;
  if (doc.extraction_status === "partial") return <Tag>Partly read</Tag>;
  return null;
}

function FileChip({ doc, size = 52 }: { doc: LabDocument; size?: number }) {
  const t = fileType(doc);
  return (
    <span
      className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-[16px] bg-[var(--c-ink)] text-[var(--c-frame)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <t.icon size={Math.round(size * 0.4)} />
      <span className="text-[9px] font-medium uppercase tracking-[0.04em] opacity-80">{t.label}</span>
    </span>
  );
}

const shortDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Side panel: printed lab values over time, one marker at a time. */
function LabTrends({ records }: { records: LabDocument[] }) {
  const grouped = useMemo(() => groupMetricsByKey(parseAllMetrics(records)), [records]);
  const markers = useMemo(
    () =>
      [...grouped.entries()]
        .filter(([key]) => key !== "bp_diastolic")
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 4),
    [grouped],
  );
  const [picked, setPicked] = useState("");
  const active = markers.find(([k]) => k === picked) ?? markers[0];

  return (
    <Panel>
      <PanelTitle title="Lab trends" right={<span className="text-[11px] text-[var(--c-ink-2)]">printed values</span>} />
      {!active ? (
        <p className="c-hatch mt-4 rounded-[16px] px-4 py-8 text-center text-[12.5px] text-[var(--c-ink-2)]">
          Upload a lab report with printed values, like “HbA1c 6.4 %”, and its trend shows here.
        </p>
      ) : (
        <TrendBody series={active[1]} tabs={markers.map(([k, s]) => ({ id: k, label: s[0]?.label ?? k }))} value={active[0]} onChange={setPicked} />
      )}
    </Panel>
  );
}

function TrendBody({
  series,
  tabs,
  value,
  onChange,
}: {
  series: ParsedMetric[];
  tabs: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  const shown = series.slice(-6);
  const latest = shown[shown.length - 1];
  const prev = shown.length > 1 ? shown[shown.length - 2] : null;
  const delta = prev ? latest.value - prev.value : 0;
  return (
    <>
      {tabs.length > 1 && <PillTabs className="mt-4" tabs={tabs} value={value} onChange={onChange} />}
      <div className="mt-5 flex items-start gap-2">
        <p className="c-num text-[34px] leading-none">
          {latest.value}
          <span className="ml-1 text-[13px] text-[var(--c-ink-3)]">{latest.unit}</span>
        </p>
        {latest.status === "high" || latest.status === "low" ? (
          <Tag tone="danger" trend={latest.status === "high" ? "up" : "down"}>
            {latest.status}
          </Tag>
        ) : prev && delta !== 0 ? (
          <Tag trend={delta > 0 ? "up" : "down"}>
            {delta > 0 ? "+" : ""}
            {Number(delta.toFixed(2))}
          </Tag>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-[var(--c-ink-2)]">
        Latest on {shortDate(latest.date)} · {series.length} reading{series.length === 1 ? "" : "s"}
      </p>
      <div className="mt-8">
        <Bars values={shown.map((m) => m.value)} highlight={[shown.length - 1]} labels={shown.map((m) => shortDate(m.date))} height={110} />
      </div>
      {latest.refLow !== undefined && latest.refHigh !== undefined && (
        <p className="mt-3 text-[11px] text-[var(--c-ink-3)]">
          Typical printed range {latest.refLow}–{latest.refHigh} {latest.unit}
        </p>
      )}
    </>
  );
}

export function HealthRecordsPanel({
  fixedRecipientUserId,
  fixedRecipientName,
  embedded = false,
  compact = false,
  showAddForm = true,
  addFormPinned = false,
  onRecordsChange,
}: HealthRecordsPanelProps) {
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const { people, selected } = usePerson();
  const isRecipient = isCareRecipientRole(activeFamily?.role);

  const [records, setRecords] = useState<HealthRecordRow[]>([]);
  const [recipients, setRecipients] = useState<Array<{ userId: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [recipientFilter, setRecipientFilter] = useState(fixedRecipientUserId ?? "all");

  const [addOpen, setAddOpen] = useState(showAddForm && addFormPinned && !compact);
  const [addRecipientId, setAddRecipientId] = useState(fixedRecipientUserId ?? "");
  const [rawText, setRawText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState("");
  const [addMode, setAddMode] = useState<"file" | "text">("file");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const addRef = useRef<HTMLDivElement>(null);

  const [detail, setDetail] = useState<LabDocumentDetail | null>(null);
  const [detailRecipientUserId, setDetailRecipientUserId] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  // Follow a new fixed recipient (adjusting state during render, not in an effect).
  const [seenFixedId, setSeenFixedId] = useState(fixedRecipientUserId);
  if (seenFixedId !== fixedRecipientUserId) {
    setSeenFixedId(fixedRecipientUserId);
    if (fixedRecipientUserId) {
      setRecipientFilter(fixedRecipientUserId);
      setAddRecipientId(fixedRecipientUserId);
    }
  }

  const inScope = useMemo(
    () => records.filter((doc) => recipientFilter === "all" || doc.recipientUserId === recipientFilter),
    [records, recipientFilter],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inScope.filter((doc) => {
      if (kindFilter !== "all" && doc.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.recipientName.toLowerCase().includes(q) ||
        (doc.snippet ?? "").toLowerCase().includes(q) ||
        (doc.record_date ?? "").toLowerCase().includes(q)
      );
    });
  }, [inScope, search, kindFilter]);

  const kindTabs = useMemo(
    () =>
      HEALTH_RECORD_KINDS.map((k) => {
        const n = k.value === "all" ? inScope.length : inScope.filter((d) => d.kind === k.value).length;
        return { id: k.value as string, label: k.value === "all" ? `All · ${n}` : `${k.label} · ${n}` };
      }).filter((t, i) => i === 0 || !t.label.endsWith(" 0") || t.id === kindFilter),
    [inScope, kindFilter],
  );

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
      if (!addFormPinned) setAddOpen(false);
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
      if (!addFormPinned) setAddOpen(false);
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
    setDeletingId(row.document_id);
    try {
      await deleteRecipientLab(activeFamilyId, row.recipientUserId, row.document_id);
      if (detail?.document_id === row.document_id) setDetail(null);
      setConfirmDelete(null);
      await load();
      onRecordsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete record");
    } finally {
      setDeletingId(null);
    }
  }

  const detailOpen = detailLoading || Boolean(detail);
  useEffect(() => {
    if (!detailOpen) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setDetail(null);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [detailOpen]);

  function openUpload() {
    setAddMode("file");
    setAddOpen(true);
    requestAnimationFrame(() => addRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  const addTargetName =
    fixedRecipientName ??
    recipients.find((r) => r.userId === elderId)?.name ??
    "care recipient";

  const headingPerson = people.find((p) => p.id === fixedRecipientUserId) ?? selected;
  const multiRecipient = !fixedRecipientUserId && recipients.length > 1;
  const labCount = inScope.filter((d) => d.kind === "lab").length;
  const rxCount = inScope.filter((d) => d.kind === "prescription").length;

  const toolbar = !loading && records.length === 0 ? null : (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <PillTabs tabs={kindTabs} value={kindFilter} onChange={setKindFilter} />
      <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
        {multiRecipient && (
          <select
            value={recipientFilter}
            onChange={(e) => setRecipientFilter(e.target.value)}
            aria-label="Care recipient filter"
            className={cn(INPUT, "sm:w-auto")}
          >
            <option value="all">All care recipients</option>
            {recipients.map((r) => (
              <option key={r.userId} value={r.userId}>
                {r.name}
              </option>
            ))}
          </select>
        )}
        <label className="relative block sm:w-[240px]">
          <MagnifyingGlass size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--c-ink-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or text…"
            aria-label="Search records"
            className={cn(INPUT, "pl-9")}
          />
        </label>
      </div>
    </div>
  );

  const addPanel = addOpen && showAddForm && (
    <div ref={addRef}>
      <Panel className="scroll-mt-4">
        <PanelTitle
          title={`Add for ${addTargetName}`}
          right={
            !addFormPinned && (
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                aria-label="Close add record"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--c-ink-2)] hover:bg-[var(--c-frame)] hover:text-[var(--c-ink)]"
              >
                <X size={16} />
              </button>
            )
          }
        />
        <PillTabs<"file" | "text">
          className="mt-4"
          value={addMode}
          onChange={setAddMode}
          tabs={[
            { id: "file", label: "Upload file" },
            { id: "text", label: "Paste text" },
          ]}
        />
        {multiRecipient && (
          <select
            value={addRecipientId || (recipientFilter !== "all" ? recipientFilter : "")}
            onChange={(e) => setAddRecipientId(e.target.value)}
            aria-label="Care recipient"
            className={cn(INPUT, "mt-3")}
          >
            <option value="">Select care recipient</option>
            {recipients.map((r) => (
              <option key={r.userId} value={r.userId}>
                {r.name}
              </option>
            ))}
          </select>
        )}
        <div className="mt-4">
          <RecordAddForms
            mode={addMode}
            saving={saving}
            files={selectedFiles}
            text={rawText}
            elderId={elderId}
            compact={compact}
            dragOver={dragOver}
            showCancel={!addFormPinned}
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
      </Panel>
    </div>
  );

  const list = loading ? (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading records">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[200px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
      ))}
    </div>
  ) : filtered.length === 0 ? (
    <Panel className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-frame)]">
        {records.length === 0 ? <Files size={24} /> : <MagnifyingGlass size={24} />}
      </span>
      <p className="mt-4 text-[18px] font-medium">{records.length === 0 ? "No health records yet" : "No records match"}</p>
      <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">
        {records.length === 0
          ? "Upload a lab report, prescription or a photo of one. Saheli reads the printed values and files it here."
          : "No records match your filters."}
      </p>
      {records.length === 0 && showAddForm && !addOpen && (
        <SmallButton dark className="mt-5" onClick={openUpload}>
          Upload record
        </SmallButton>
      )}
      {records.length > 0 && (
        <SmallButton
          className="mt-5"
          onClick={() => {
            setSearch("");
            setKindFilter("all");
          }}
        >
          Clear filters
        </SmallButton>
      )}
    </Panel>
  ) : (
    <ul className={cn("grid gap-4", !compact && "md:grid-cols-2")}>
      {filtered.map((doc) => {
        const lines = medicalRecordLines(doc).filter((l) => !l.startsWith("File: ") && !l.startsWith("Date: "));
        const summary = doc.ai_summary || doc.snippet || doc.extraction_status ? lines.slice(0, 4) : [];
        const fallback = summary.length ? null : doc.ai_summary || doc.snippet;
        const busy = deletingId === doc.document_id;
        return (
          <li key={`${doc.recipientUserId}-${doc.document_id}`} className="flex min-w-0 flex-col rounded-[24px] bg-[var(--c-card)] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <FileChip doc={doc} />
              <button type="button" onClick={() => void openDetail(doc)} className="min-w-0 flex-1 text-left">
                <p className="break-words text-[15px] font-medium leading-snug hover:underline hover:underline-offset-2">{doc.title}</p>
                <p className="mt-0.5 text-[12px] text-[var(--c-ink-2)]">
                  {[multiRecipient || !fixedRecipientUserId ? doc.recipientName : null, recordDate(doc), kindLabel(doc.kind)].filter(Boolean).join(" · ")}
                </p>
              </button>
            </div>
            {(doc.tags?.length || doc.extraction_status === "failed" || doc.extraction_status === "partial" || doc.analysis_status === "pending") && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusTag doc={doc} />
                {doc.tags?.slice(0, 5).map((tag) => (
                  <Tag key={tag} tone="light">
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
            {(summary.length > 0 || fallback) && (
              <div className="mt-3 flex-1 rounded-[16px] bg-[var(--c-frame)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">
                {summary.length > 0 ? (
                  <ul className="space-y-0.5">
                    {summary.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
                        <span className="min-w-0 break-words">{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="line-clamp-3">{fallback}</p>
                )}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SmallButton dark onClick={() => void openDetail(doc)}>
                View
              </SmallButton>
              {hasOriginalFile(doc) && (
                <SmallButton
                  icon={downloadingId === doc.document_id ? undefined : DownloadSimple}
                  disabled={downloadingId === doc.document_id}
                  aria-label="Download original file"
                  onClick={() => void handleDownload(doc.recipientUserId, doc.document_id, doc.file_name)}
                >
                  {downloadingId === doc.document_id && <CircleNotch size={14} className="animate-spin" />}
                  Original
                </SmallButton>
              )}
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1 px-1 text-[12px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]"
                >
                  Open in browser <ArrowSquareOut size={12} />
                </a>
              )}
              <div className="ml-auto">
                {confirmDelete === doc.document_id ? (
                  <span className="flex items-center gap-3 text-[12.5px]">
                    <button type="button" className="text-[var(--c-ink-2)] hover:text-[var(--c-ink)]" onClick={() => setConfirmDelete(null)}>
                      Keep
                    </button>
                    <button type="button" className="font-medium text-[#d92d20] disabled:opacity-50" disabled={busy} onClick={() => void handleDelete(doc)}>
                      {busy ? "Deleting…" : "Delete"}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label="Delete record"
                    title={`Remove "${doc.title}" from the health record`}
                    onClick={() => setConfirmDelete(doc.document_id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--c-ink-3)] hover:bg-[var(--c-frame)] hover:text-[#d92d20]"
                  >
                    <Trash size={15} />
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  const notices = (
    <>
      {error && <p className="rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">{error}</p>}
      {saveOk && (
        <p className="rounded-[14px] bg-[var(--c-card)] px-4 py-2.5 text-[13px]" role="status">
          {saveOk}
        </p>
      )}
    </>
  );

  const detailDrawer = (
    <div className={cn("fixed inset-0 z-[60]", !detailOpen && "pointer-events-none")} aria-hidden={!detailOpen}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={detailOpen ? 0 : -1}
        onClick={() => setDetail(null)}
        className={cn("absolute inset-0 bg-[rgba(20,42,34,0.28)] transition-opacity duration-300", detailOpen ? "opacity-100" : "opacity-0")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={detail?.title ?? "Record"}
        className={cn(
          "care-os absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-[var(--c-frame)] transition-[transform,visibility] duration-300 ease-out",
          detailOpen ? "visible translate-x-0 shadow-[-30px_0_80px_-40px_rgba(0,0,0,0.35)]" : "invisible translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-6 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {detail && <FileChip doc={detail} size={48} />}
            <div className="min-w-0">
              <h2 className="break-words text-[20px] font-medium leading-tight tracking-[-0.02em]">{detail?.title ?? "Loading…"}</h2>
              {detail && (
                <p className="mt-1 text-[12px] text-[var(--c-ink-2)]">
                  {kindLabel(detail.kind)}
                  {detail.record_date ? ` · ${detail.record_date}` : ""}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDetail(null)}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="c-scroll flex-1 overflow-y-auto px-5 pb-6 pt-3 sm:px-6">
          {detailLoading ? (
            <div className="space-y-3" aria-busy="true">
              <div className="h-12 animate-pulse rounded-full bg-[var(--c-card)]" />
              <div className="h-[220px] animate-pulse rounded-[20px] bg-[var(--c-card)]" />
            </div>
          ) : (
            detail && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <StatusTag doc={detail} />
                  {detail.tags?.map((tag) => (
                    <Tag key={tag} tone="light" className="!bg-[var(--c-card)]">
                      {tag}
                    </Tag>
                  ))}
                </div>
                {hasOriginalFile(detail) && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <DarkButton
                      disabled={downloadingId === detail.document_id}
                      onClick={() => void handleDownload(detailRecipientUserId, detail.document_id, detail.file_name)}
                      className="max-w-full"
                    >
                      <span className="min-w-0 truncate">
                        {downloadingId === detail.document_id ? "Downloading…" : "Download original"}
                        {detail.file_name ? ` · ${detail.file_name}` : ""}
                      </span>
                    </DarkButton>
                    {detail.file_url && (
                      <a
                        href={detail.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-12 items-center gap-1.5 rounded-full border border-[var(--c-line)] px-5 text-[13px] hover:bg-[var(--c-card)]"
                      >
                        Open in browser <ArrowSquareOut size={13} />
                      </a>
                    )}
                  </div>
                )}
                {medicalRecordLines(detail).length > 0 && (
                  <section className="mt-5 rounded-[20px] bg-[var(--c-card)] p-4">
                    <PanelTitle title="What Saheli read" />
                    <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed">
                      {medicalRecordLines(detail).map((line) => (
                        <li key={line} className="flex items-start gap-2">
                          <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
                          <span className="min-w-0 break-words">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <p className="mb-2 mt-5 px-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">Extracted text</p>
                <pre className="whitespace-pre-wrap break-words rounded-[20px] border border-[var(--c-line)] p-4 font-sans text-[13px] leading-relaxed text-[var(--c-ink-2)]">
                  {detail.raw_text || "No text was read from this file."}
                </pre>
              </>
            )
          )}
        </div>
      </aside>
    </div>
  );

  if (embedded) {
    return (
      <div className={cn("space-y-4", compact && "mb-6")}>
        <PanelTitle
          title={fixedRecipientName ? `Records on file for ${fixedRecipientName}` : "Records on file"}
          right={
            showAddForm &&
            !addOpen && (
              <SmallButton dark onClick={openUpload}>
                Upload record
              </SmallButton>
            )
          }
        />
        {addPanel}
        {notices}
        {toolbar}
        {list}
        {detailDrawer}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 pb-1 sm:gap-5 sm:pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[34px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block font-light text-[var(--c-ink-3)]">{possessive(headingPerson ?? null)}</span>
            <span className="block font-medium">Health records</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] text-[var(--c-ink-2)]">
            Lab reports, prescriptions and notes on file. Saheli reads them for you and cites printed values only.
          </p>
        </div>
        {showAddForm && (
          <DarkButton onClick={openUpload} className="self-start lg:self-auto">
            Upload record
          </DarkButton>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {addPanel}
          {notices}
          {toolbar}
          {list}
        </div>
        <aside className="min-w-0 space-y-4">
          <Panel accent>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Records on file</p>
            <p className="c-num mt-4 text-[56px] leading-none text-white">{loading ? "—" : inScope.length}</p>
            <p className="mt-2 text-[12px] text-white/80">
              {labCount} lab report{labCount === 1 ? "" : "s"} · {rxCount} prescription{rxCount === 1 ? "" : "s"}
            </p>
          </Panel>
          <LabTrends records={inScope} />
          <Panel>
            <PanelTitle title="How Saheli reads records" />
            <ul className="mt-3 space-y-2 text-[12.5px] text-[var(--c-ink-2)]">
              {[
                "PDFs and phone photos, even tilted or dim ones.",
                "Title, type and date are filled in for you.",
                "The original file is always kept, even if reading fails.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" /> {t}
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
      {detailDrawer}
    </div>
  );
}
