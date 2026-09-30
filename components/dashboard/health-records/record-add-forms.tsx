"use client";

import { type DragEvent, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitButtonDisabled, uploadButtonDisabled } from "@/lib/medical-record-form";

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
            "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary-light"
              : "border-[var(--border-strong)] bg-[var(--card)] hover:border-primary",
            compact ? "py-5" : "py-8",
          )}
        >
          <Upload className={cn("text-primary", compact ? "mb-1.5 h-6 w-6" : "mb-2 h-8 w-8")} />
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
            {dragOver
              ? "Drop to add files"
              : files.length
                ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
                : "Choose files or drag here"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            PDF or a photo (JPG, PNG, HEIC), including a tilted or dim phone photo · up to 15 MB
          </p>
          <p className="mt-2 text-[11px] text-primary">Title, type, and date are detected automatically</p>
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
          <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] p-2">
            {files.map((file) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger-text)]"
                  onClick={() => onRemoveFile(file)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="submit"
          disabled={uploadButtonDisabled({ saving, fileCount: files.length, elderId })}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Uploading & analyzing…" : files.length > 1 ? `Upload ${files.length} files` : "Upload"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSaveText} className="space-y-3">
      <textarea
        value={text}
        aria-label="Pasted medical record"
        onChange={(e) => onText(e.target.value)}
        placeholder={"Paste report text — Saheli will detect title, type, and date:\nTSH 4.2 mIU/L (8 Aug 2026)\nFree T4 1.1 ng/dL"}
        rows={6}
        className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-[13px] outline-none focus:border-primary"
      />
      <p className="text-[11px] text-[var(--text-tertiary)]">
        No need to enter title or date — AI fills those in from the text.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitButtonDisabled({ saving, text, elderId })}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Analyzing…" : "Submit"}
        </button>
        {showCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[12px] font-semibold text-[var(--text-secondary)]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
