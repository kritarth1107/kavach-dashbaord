"use client";

/**
 * Small pieces shared by the health records page, the detail sheet and the review screen:
 * kind icons, status and flag tags, the original-file preview, a tick box, a confirm bar,
 * links between the screens and a one-shot message carried across a navigation.
 */
import {
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  Check,
  DownloadSimple,
  FileText,
  Hospital,
  Image as ImageIcon,
  Pill,
  Scan,
  TestTube,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { LabDocument, LabFlag, RecordKind } from "@/lib/api";
import { firstNameOf, pronounsFor, recordKind, rowStatus, type Pronouns } from "@/lib/health-records";
import { cn } from "@/lib/utils";
import { Tag } from "@/components/care-os/ui";

/* ── who the records are about ─────────────────────────────────────────── */

export type RecordPerson = {
  id: string;
  /** Full name without honorifics: "Vasundara Devi". */
  name: string;
  first: string;
  relation?: string;
  self: boolean;
  pronouns: Pronouns;
};

export function makeRecordPerson(input: { id: string; name: string; relation?: string; self?: boolean }): RecordPerson {
  const name = input.name.trim();
  return {
    id: input.id,
    name,
    first: firstNameOf(name) || name,
    relation: input.relation,
    self: Boolean(input.self),
    pronouns: pronounsFor(input),
  };
}

/** "Vasundara's" or "Your". */
export const possessiveOf = (p: RecordPerson) => (p.self ? "Your" : `${p.first}'s`);

/* ── links between the screens ─────────────────────────────────────────── */

export type RecordsFrom = "family" | null;

export function recordsHref(recipientId: string, from: RecordsFrom = null) {
  return from === "family" ? `/dashboard/family/${recipientId}/health-record` : `/dashboard/record?recipient=${encodeURIComponent(recipientId)}`;
}

export function reviewHref(documentId: string, recipientId: string, from: RecordsFrom = null) {
  return `/dashboard/record/review/${encodeURIComponent(documentId)}?recipient=${encodeURIComponent(recipientId)}${from === "family" ? "&from=family" : ""}`;
}

/* ── a message for the next screen (kept in memory, survives a client-side navigation only) ── */

export type RecordsFlash = { text: string; warn?: string };
let pendingFlash: RecordsFlash | null = null;

export function setRecordsFlash(flash: RecordsFlash) {
  pendingFlash = flash;
}

/**
 * Read once: the records page shows it, then it is gone. Cleared on the next tick rather than at once,
 * so a state initializer that runs twice in the same render (React strict mode) still gets it.
 */
export function takeRecordsFlash(): RecordsFlash | null {
  if (typeof window === "undefined") return null;
  const f = pendingFlash;
  if (f) {
    setTimeout(() => {
      if (pendingFlash === f) pendingFlash = null;
    }, 0);
  }
  return f;
}

/* ── kind icon ─────────────────────────────────────────────────────────── */

const KIND_ICON: Record<RecordKind, PhosphorIcon> = { lab: TestTube, scan: Scan, discharge: Hospital, prescription: Pill, other: FileText };

export function KindChip({ kind, className }: { kind: string; className?: string }) {
  const Icon = KIND_ICON[recordKind(kind)];
  return (
    <span aria-hidden className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--c-frame)] text-[var(--c-ink)]", className)}>
      <Icon size={19} />
    </span>
  );
}

/* ── tags ──────────────────────────────────────────────────────────────── */

export function StatusTag({ doc }: { doc: Pick<LabDocument, "review_status" | "extraction_status"> }) {
  const s = rowStatus(doc);
  if (s === "review") return <Tag>Needs your review</Tag>;
  if (s === "failed") return <Tag tone="danger">Couldn&apos;t read</Tag>;
  if (s === "file_only") return <Tag tone="light" className="border border-[var(--c-line)]">Kept as file</Tag>;
  return (
    <Tag tone="ok" className="gap-1">
      <Check size={10} weight="bold" />
      Saved
    </Tag>
  );
}

export function FlagTag({ flag, arrow = false }: { flag: LabFlag | null | undefined; arrow?: boolean }) {
  if (flag === "low" || flag === "high") {
    const Icon = flag === "low" ? ArrowDown : ArrowUp;
    return (
      <Tag tone="danger" className="gap-1">
        {arrow && <Icon size={10} weight="bold" />}
        {flag === "low" ? "Low" : "High"}
      </Tag>
    );
  }
  if (flag === "normal") return <Tag tone="ok">Normal</Tag>;
  return null;
}

/** Small uppercase label used above fields and stat rows. */
export function Lbl({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...rest} className={cn("block text-[10.5px] font-medium uppercase tracking-[0.07em] text-[var(--c-ink-3)]", className)}>
      {children}
    </span>
  );
}

/* ── tick box: a real checkbox drawn like the design ──────────────────── */

export function TickBox({
  checked,
  onChange,
  disabled,
  id,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  /** Accessible name when there is no visible <label htmlFor>. */
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex h-[18px] w-[18px] shrink-0", className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
        className={cn(
          "peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-frame)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "border-[var(--c-solid)] bg-[var(--c-solid)]" : "border-[var(--c-ink-3)] bg-[var(--c-frame)]",
        )}
      />
      {checked && (
        <svg viewBox="0 0 12 12" aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 text-[var(--c-on-solid)]">
          <path d="M2 6.5 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/* ── buttons used on these screens ────────────────────────────────────── */

export const PILL_BUTTON =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[13px] font-medium text-[var(--c-ink)] transition-colors hover:bg-[var(--c-card)] disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-frame)]";

export const DARK_PILL_BUTTON =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--c-solid)] px-4 text-[13px] font-medium text-[var(--c-on-solid)] transition-opacity hover:opacity-90 disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-frame)]";

/** "Are you sure?" in place of the buttons, with the consequence spelled out. */
export function ConfirmBar({
  text,
  confirmLabel,
  busyLabel,
  busy,
  onConfirm,
  onCancel,
  cancelLabel = "Keep it",
  stack = false,
  className,
}: {
  text: React.ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
  /** Text above the buttons even on wide screens (narrow sheets). */
  stack?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alertdialog"
      aria-live="polite"
      className={cn("flex flex-col gap-3 rounded-[16px] bg-[var(--c-danger-wash)] p-3.5 dark:bg-[rgba(180,35,42,0.14)]", !stack && "sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <p className="text-[13px] leading-relaxed text-[var(--c-ink)]">{text}</p>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" className={PILL_BUTTON} onClick={onCancel} disabled={busy} autoFocus>
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#b4232a] px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-danger-ink)] focus-visible:ring-offset-2"
        >
          {busy ? (busyLabel ?? `${confirmLabel}…`) : confirmLabel}
        </button>
      </div>
    </div>
  );
}

/* ── the original file ─────────────────────────────────────────────────── */

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];

export function fileKind(doc: Pick<LabDocument, "file_name" | "mime_type" | "source">): "image" | "pdf" | "other" | "text" {
  const name = (doc.file_name ?? "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  const mime = (doc.mime_type ?? "").toLowerCase();
  if (doc.source === "text" && !doc.file_name) return "text";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  // HEIC does not show in most browsers: offer it as a file instead.
  if ((mime.startsWith("image/") && !mime.includes("heic") && !mime.includes("heif")) || IMAGE_EXT.includes(ext)) return "image";
  return "other";
}

function sizeLabel(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Preview of the original: the photo itself, a PDF in a frame, pasted text, or a file chip.
 * `src` is the inline download path (never the public bucket URL).
 */
export function RecordFile({
  doc,
  src,
  downloadSrc,
  rawText,
  tilt = false,
  className,
}: {
  doc: Pick<LabDocument, "file_name" | "mime_type" | "source" | "file_size" | "title">;
  src: string | null;
  downloadSrc?: string | null;
  rawText?: string | null;
  tilt?: boolean;
  className?: string;
}) {
  const kind = fileKind(doc);
  const [broken, setBroken] = useState(false);
  const meta = [doc.file_name, sizeLabel(doc.file_size)].filter(Boolean).join(" · ");

  let body: React.ReactNode;
  if (kind === "text") {
    body = (
      <div className="rounded-[14px] bg-[var(--c-frame)] p-4 shadow-sm">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">What you pasted</p>
        <pre className="c-scroll max-h-[360px] overflow-y-auto whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-[var(--c-ink-2)]">
          {rawText?.trim() || "The text is saved with the record."}
        </pre>
      </div>
    );
  } else if (kind === "image" && src && !broken) {
    body = (
      <div className="overflow-hidden rounded-[14px] bg-[var(--c-frame)] shadow-sm" style={tilt ? { transform: "rotate(-1.2deg)" } : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a private file through the auth proxy */}
        <img
          src={src}
          alt={`The original ${doc.title || "report"}`}
          className="block max-h-[520px] w-full object-contain"
          onError={() => setBroken(true)}
          // An error before the page became interactive fires no onError: check once it is attached.
          ref={(el) => {
            if (el?.complete && el.naturalWidth === 0) setBroken(true);
          }}
        />
      </div>
    );
  } else if (kind === "pdf" && src) {
    body = <iframe src={src} title={`The original ${doc.title || "report"}`} className="block h-[420px] w-full rounded-[14px] bg-[var(--c-frame)] shadow-sm" />;
  } else {
    body = (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[14px] bg-[var(--c-frame)] px-4 py-10 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--c-solid)] text-[var(--c-on-solid)]">
          <FileText size={22} />
        </span>
        <p className="max-w-full truncate text-[13px] font-medium">{doc.file_name || "Original file"}</p>
        <p className="text-[12px] text-[var(--c-ink-2)]">{broken ? "The preview didn't load. Open the file to see it." : "No preview for this kind of file."}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-[22px] bg-[var(--c-card)] p-3">{body}</div>
      {kind !== "text" && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-[12px] text-[var(--c-ink-2)]">
          <span className="flex min-w-0 items-center gap-1.5">
            <ImageIcon size={14} className="shrink-0" aria-hidden />
            <span className="truncate">{meta || "Original file"}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {src && (
              <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-sm underline-offset-2 hover:text-[var(--c-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--c-accent)]">
                Open <ArrowSquareOut size={12} aria-hidden />
                <span className="sr-only">the original in a new tab</span>
              </a>
            )}
            {downloadSrc && (
              <a href={downloadSrc} download className="inline-flex items-center gap-1 rounded-sm underline-offset-2 hover:text-[var(--c-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--c-accent)]">
                Download <DownloadSimple size={12} aria-hidden />
              </a>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
