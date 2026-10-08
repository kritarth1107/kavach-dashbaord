"use client";

import { type DragEvent, type FormEvent } from "react";
import { FileArrowUp, Paperclip, X } from "@phosphor-icons/react";
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
              dragOver ? "bg-[var(--c-accent)] text-white" : "bg-[var(--c-ink)] text-[var(--c-frame)]",
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
        {files.length > 0 && (
          <ul className="c-scroll max-h-40 space-y-1.5 overflow-y-auto">
            {files.map((file) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center gap-2.5 rounded-[14px] bg-[var(--c-frame)] py-1.5 pl-3 pr-1.5 text-[12.5px]"
              >
                <Paperclip size={14} className="shrink-0 text-[var(--c-ink-3)]" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] text-[var(--c-ink-2)] hover:bg-[var(--c-card)] hover:text-[#d92d20]"
                  onClick={() => onRemoveFile(file)}
                >
                  <X size={12} />
                  Remove
                </button>
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
