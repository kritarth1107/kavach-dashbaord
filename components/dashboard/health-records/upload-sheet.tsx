"use client";

import { CircleNotch } from "@phosphor-icons/react";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { friendlyError } from "@/lib/health-records";
import { medicalUploadError } from "@/lib/medical-record-file";
import { SideDrawer } from "@/components/care-os/care-kit";
import { PillTabs } from "@/components/care-os/ui";
import { RecordAddForms } from "./record-add-forms";
import type { RecordPerson } from "./record-bits";

const MAX_FILES = 25;

/**
 * "Upload a report": a dropzone (one or many files) or pasted text.
 * The handlers resolve with a message to show here, or nothing when they moved on to another screen.
 */
export function UploadSheet({
  open,
  onClose,
  person,
  onFiles,
  onText,
}: {
  open: boolean;
  onClose: () => void;
  person: RecordPerson;
  onFiles: (files: File[]) => Promise<string | void>;
  onText: (text: string) => Promise<string | void>;
}) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState<null | number>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const depth = useRef(0);

  function pick(list: FileList | File[]) {
    const incoming = Array.from(list);
    if (!incoming.length) return;
    const rejected = incoming.map((f) => medicalUploadError(f)).find(Boolean);
    setError(rejected ?? "");
    setNote("");
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        if (medicalUploadError(f) || merged.length >= MAX_FILES) continue;
        if (!merged.some((c) => c.name === f.name && c.size === f.size && c.lastModified === f.lastModified)) merged.push(f);
      }
      return merged;
    });
  }

  const stop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  async function run(count: number, job: () => Promise<string | void>) {
    setSaving(count);
    setError("");
    setNote("");
    try {
      const message = await job();
      if (message) setNote(message);
    } catch (err) {
      setError(friendlyError(err, count > 1 ? "Couldn't upload these files. Please try again." : "Couldn't upload it. Please try again."));
    } finally {
      setSaving(null);
    }
  }

  function upload(e: FormEvent) {
    e.preventDefault();
    if (!files.length || saving !== null) return;
    const chosen = files;
    void run(chosen.length, async () => {
      const message = await onFiles(chosen);
      setFiles([]);
      return message;
    });
  }

  function saveText(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || saving !== null) return;
    void run(1, async () => {
      const message = await onText(text.trim());
      setText("");
      return message;
    });
  }

  return (
    <SideDrawer open={open} onClose={onClose} top="Upload" bottom="a report" label={`Upload a report for ${person.name}`}>
      <p className="text-[13px] text-[var(--c-ink-2)]">
        For <span className="font-medium text-[var(--c-ink)]">{person.self ? "you" : person.name}</span>. Saheli reads it and shows you what she found. Nothing is saved until you check it.
      </p>
      <PillTabs<"file" | "text">
        className="mt-4"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError("");
          setNote("");
        }}
        tabs={[
          { id: "file", label: "Upload a file" },
          { id: "text", label: "Paste text" },
        ]}
      />
      <div className="mt-4">
        {saving !== null ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center rounded-[20px] bg-[var(--c-card)] px-6 py-12 text-center">
            <CircleNotch size={28} className="animate-spin text-[var(--c-accent)]" aria-hidden />
            <p className="mt-4 text-[15px] font-medium">{saving > 1 ? `Saheli is reading ${saving} reports…` : "Saheli is reading it…"}</p>
            <p className="mt-1 text-[12.5px] text-[var(--c-ink-2)]">{saving > 1 ? "This can take up to 40 seconds for each one." : "This can take up to 40 seconds."}</p>
          </div>
        ) : (
          <RecordAddForms
            mode={mode}
            saving={false}
            files={files}
            text={text}
            elderId={person.id}
            dragOver={dragOver}
            showCancel
            onDragEnter={(e) => {
              stop(e);
              depth.current += 1;
              setDragOver(true);
            }}
            onDragOver={(e) => {
              stop(e);
              e.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(e) => {
              stop(e);
              depth.current -= 1;
              if (depth.current <= 0) {
                depth.current = 0;
                setDragOver(false);
              }
            }}
            onDrop={(e) => {
              stop(e);
              depth.current = 0;
              setDragOver(false);
              if (e.dataTransfer.files?.length) pick(e.dataTransfer.files);
            }}
            onPickFiles={pick}
            onRemoveFile={(f) => setFiles((prev) => prev.filter((x) => x !== f))}
            onText={setText}
            onUpload={upload}
            onSaveText={saveText}
            onCancel={onClose}
          />
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="mt-3 rounded-[14px] bg-[var(--c-card)] px-4 py-2.5 text-[13px]">
          {note}
        </p>
      )}
    </SideDrawer>
  );
}
