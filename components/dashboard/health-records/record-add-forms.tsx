"use client";

import { type DragEvent, type FormEvent } from "react";
import { FileArrowUp, FilePdf, FileText, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { submitButtonDisabled, uploadButtonDisabled } from "@/lib/medical-record-form";
import { DarkButton } from "@/components/care-os/ui";

const CANCEL = "h-12 px-4 text-[14px] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]";

export function RecordAddForms({
  mode,
  saving,
  files,
  text,
  elderId,
  compact,
  dragOver,
  showCancel,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onPickFiles,
  onRemoveFile,
  onText,
  onUpload,
  onSaveText,
  onCancel,
}: {
  mode: "file" | "text";
  saving: boolean;
  files: File[];
  text: string;
  elderId: string;
  compact?: boolean;
  dragOver?: boolean;
  showCancel?: boolean;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPickFiles: (files: FileList | File[]) => void;
  onRemoveFile: (file: File) => void;
  onText: (value: string) => void;
  onUpload: (event: FormEvent) => void;
  onSaveText: (event: FormEvent) => void;
  onCancel?: () => void;
}) {
  if (mode === "file") {
    return (
      <form onSubmit={onUpload} className="space-y-3">
        <div
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed px-4 text-center transition-colors focus-within:ring-2 focus-within:ring-[var(--c-accent)]",
            dragOver
              ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)]"
              : "border-[var(--c-ink-3)] bg-[var(--c-frame)] hover:border-[var(--c-ink)]",
            compact ? "py-5" : "py-8",
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full",
              dragOver ? "bg-[var(--c-accent)] text-white" : "bg-[var(--c-solid)] text-[var(--c-on-solid)]",
              compact ? "mb-2 h-10 w-10" : "mb-3 h-12 w-12",
            )}
          >
            <FileArrowUp size={compact ? 18 : 22} />
          </span>
          <p className="text-[14px] font-medium">
            {dragOver
              ? "Drop to add files"
              : files.length
                ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
                : "Choose files or drag here"}
          </p>
          <p className="mt-1 max-w-sm text-[12px] text-[var(--c-ink-2)]">
            A PDF or a photo (JPG, PNG, HEIC), up to 15 MB. A tilted or dim phone photo is fine.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--c-accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-accent)]" />
            Nothing is saved until you check what Saheli read
          </p>
          <input
            type="file"
            multiple
            aria-label="Medical record files"
            accept=".pdf,.png,.jpg,.jpeg,.heic,.heif,.webp,.txt,.md,.csv,.docx,.xlsx,application/pdf,image/*,.heic"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => {
              onPickFiles(e.target.files ?? []);
              e.target.value = "";
            }}
          />
        </div>
        {files.length === 1 && <SinglePreview file={files[0]} onRemove={() => onRemoveFile(files[0])} />}
        {files.length > 1 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}`} className="relative">
                <Thumb file={file} className="aspect-square w-full" />
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  title={`Remove ${file.name}`}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--c-frame)] text-[var(--c-ink-2)] shadow-sm hover:text-[var(--c-danger-ink)]"
                  onClick={() => onRemoveFile(file)}
                >
                  <X size={12} weight="bold" />
                </button>
                <p className="mt-1 truncate px-0.5 text-[11px] text-[var(--c-ink-2)]">{file.name}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <DarkButton type="submit" disabled={uploadButtonDisabled({ saving, fileCount: files.length, elderId })}>
            {saving ? "Reading…" : files.length > 1 ? `Upload ${files.length} files` : "Upload"}
          </DarkButton>
          {showCancel && (
            <button type="button" onClick={onCancel} className={CANCEL}>
              Cancel
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSaveText} className="space-y-3">
      <textarea
        value={text}
        aria-label="Pasted medical record"
        onChange={(e) => onText(e.target.value)}
        placeholder={"Paste the report text, for example:\nTSH 4.2 mIU/L (8 Aug 2026)\nFree T4 1.1 ng/dL"}
        rows={6}
        className="w-full rounded-[20px] border border-[var(--c-line)] bg-[var(--c-frame)] px-4 py-3 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)]"
      />
      <p className="px-1 text-[12px] text-[var(--c-ink-2)]">Saheli reads it and shows you what she found. Nothing is saved until you check it.</p>
      <div className="flex flex-wrap items-center gap-2">
        <DarkButton type="submit" disabled={submitButtonDisabled({ saving, text, elderId })}>
          {saving ? "Reading…" : "Read it"}
        </DarkButton>
        {showCancel && (
          <button type="button" onClick={onCancel} className={CANCEL}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** Browsers can show these; HEIC and documents get an icon instead. */
const SHOWABLE = /^image\/(jpeg|jpg|png|webp|gif|avif)$/i;

// One object URL per selected file for the life of the page (a handful of files; freed when the page closes).
const previewUrls = new WeakMap<File, string>();
function previewUrl(file: File): string | null {
  if (!SHOWABLE.test(file.type)) return null;
  let url = previewUrls.get(file);
  if (!url) {
    try {
      url = URL.createObjectURL(file);
    } catch {
      return null; // no preview possible here (old browser, test runner): the icon is shown instead
    }
    previewUrls.set(file, url);
  }
  return url;
}

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Thumb({ file, className }: { file: File; className?: string }) {
  const url = previewUrl(file);
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Preview of ${file.name}`} className={cn("rounded-[14px] bg-[var(--c-card)] object-cover", className)} />;
  }
  return (
    <span className={cn("flex flex-col items-center justify-center gap-1 rounded-[14px] bg-[var(--c-card)] text-[var(--c-ink-2)]", className)}>
      {pdf ? <FilePdf size={28} /> : <FileText size={28} />}
      <span className="text-[10.5px] uppercase tracking-wide">{pdf ? "PDF" : (file.name.split(".").pop() || "file").slice(0, 5)}</span>
    </span>
  );
}

function SinglePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = previewUrl(file);
  return (
    <div className="overflow-hidden rounded-[20px] bg-[var(--c-card)]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Preview of ${file.name}`} className="max-h-[340px] w-full bg-[var(--c-card)] object-contain" />
      ) : (
        <Thumb file={file} className="h-40 w-full rounded-none" />
      )}
      <div className="flex items-center gap-2.5 bg-[var(--c-frame)] py-2 pl-3 pr-1.5 text-[12.5px]">
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        <span className="shrink-0 text-[11.5px] text-[var(--c-ink-3)]">{sizeLabel(file.size)}</span>
        <button
          type="button"
          aria-label={`Remove ${file.name}`}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] text-[var(--c-ink-2)] hover:bg-[var(--c-card)] hover:text-[var(--c-danger-ink)]"
          onClick={onRemove}
        >
          <X size={12} />
          Remove
        </button>
      </div>
    </div>
  );
}
