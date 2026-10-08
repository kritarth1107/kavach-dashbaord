"use client";

import { Trash } from "@phosphor-icons/react";
import { useState } from "react";
import type { LabDocument } from "@/lib/api";
import { computeFlag, friendlyError, kindLabel, prettyRange, recordDateLabel, rowStatus } from "@/lib/health-records";
import { cn } from "@/lib/utils";
import { SideDrawer } from "@/components/care-os/care-kit";
import { PanelTitle } from "@/components/care-os/ui";
import { ConfirmBar, FlagTag, RecordFile, StatusTag, type RecordPerson } from "./record-bits";

const TH = "py-2 pr-3 text-left text-[10.5px] font-medium uppercase tracking-[0.07em] text-[var(--c-ink-3)]";
const TD = "border-t border-[var(--c-line)] py-2 pr-3 align-middle text-[13px]";

/** A saved record: what was saved, the original file, and delete (which also clears it from Saheli's memory). */
export function RecordDetail({
  doc,
  person,
  fileSrc,
  downloadSrc,
  onClose,
  onDelete,
}: {
  doc: LabDocument | null;
  person: RecordPerson;
  fileSrc: (doc: LabDocument) => string | null;
  downloadSrc: (doc: LabDocument) => string | null;
  onClose: () => void;
  onDelete: (doc: LabDocument) => Promise<void>;
}) {
  // The sheet keeps its own state per record: it is re-created (keyed) for each one.
  return (
    <SideDrawer
      open={Boolean(doc)}
      onClose={onClose}
      top={doc ? kindLabel(doc.kind) : ""}
      bottom={doc?.title ?? ""}
      label={doc ? `${kindLabel(doc.kind)}: ${doc.title}` : "Record"}
    >
      {doc && <DetailBody key={doc.document_id} doc={doc} person={person} fileSrc={fileSrc(doc)} downloadSrc={downloadSrc(doc)} onDelete={onDelete} />}
    </SideDrawer>
  );
}

function DetailBody({
  doc,
  person,
  fileSrc,
  downloadSrc,
  onDelete,
}: {
  doc: LabDocument;
  person: RecordPerson;
  fileSrc: string | null;
  downloadSrc: string | null;
  onDelete: (doc: LabDocument) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const values = doc.lab_values ?? [];
  const meds = doc.medicines ?? [];
  const status = rowStatus(doc);
  const hasFile = Boolean(doc.file_name || doc.source === "file");
  const via = doc.via === "whatsapp" ? "Sent on WhatsApp" : null;

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await onDelete(doc);
    } catch (err) {
      setError(friendlyError(err, "Couldn't delete it. Please try again."));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--c-ink-2)]">
        <StatusTag doc={doc} />
        <span>{[recordDateLabel(doc), doc.provider, via].filter(Boolean).join(" · ")}</span>
      </div>

      {status === "file_only" && (
        <p className="rounded-[14px] bg-[var(--c-card)] px-4 py-3 text-[12.5px] text-[var(--c-ink-2)]">
          Kept as a file only. Nothing from it is on {person.pronouns.possessive} cards or trends, and Saheli doesn&apos;t remember it.
        </p>
      )}

      {doc.ai_summary && status !== "file_only" && (
        <section className="rounded-[20px] bg-[var(--c-card)] p-4">
          <PanelTitle title="Summary" />
          <p className="mt-2 text-[13px] leading-relaxed">{doc.ai_summary}</p>
        </section>
      )}

      {values.length > 0 && (
        <section className="rounded-[20px] bg-[var(--c-card)] p-4">
          <PanelTitle title="Saved values" right={<span className="text-[12px] text-[var(--c-ink-2)]">{values.length}</span>} />
          <table className="mt-2 w-full">
            <thead>
              <tr>
                <th className={TH}>Test</th>
                <th className={cn(TH, "text-right")}>Result</th>
                <th className={cn(TH, "hidden sm:table-cell")}>Normal</th>
                <th className={cn(TH, "pr-0")}>
                  <span className="sr-only">Flag</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {values.map((v, i) => {
                const flag = computeFlag(v.value, v.range, v.flag);
                return (
                  <tr key={`${v.name}-${i}`}>
                    <td className={TD}>{v.name}</td>
                    <td className={cn(TD, "text-right")}>
                      <span className={cn("c-num", (flag === "low" || flag === "high") && "font-medium")}>{v.value}</span>
                      {v.unit && <span className="ml-1 text-[11px] text-[var(--c-ink-2)]">{v.unit}</span>}
                    </td>
                    <td className={cn(TD, "c-num hidden text-[var(--c-ink-2)] sm:table-cell")}>{prettyRange(v.range) || "—"}</td>
                    <td className={cn(TD, "pr-0 text-right")}>
                      <FlagTag flag={flag} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {meds.length > 0 && (
        <section className="rounded-[20px] bg-[var(--c-card)] p-4">
          <PanelTitle title="Medicines" right={<span className="text-[12px] text-[var(--c-ink-2)]">{meds.length}</span>} />
          <ul className="mt-2 space-y-1.5">
            {meds.map((m, i) => (
              <li key={`${m.name}-${i}`} className="flex items-baseline justify-between gap-3 rounded-[12px] bg-[var(--c-frame)] px-3 py-2 text-[13px]">
                <span className="font-medium">{m.name}</span>
                {m.dose && <span className="text-[12px] text-[var(--c-ink-2)]">{m.dose}</span>}
              </li>
            ))}
          </ul>
          {doc.decision?.scheduled?.length ? (
            <p className="mt-2 text-[12px] text-[var(--c-ink-2)]">Added to the schedule: {doc.decision.scheduled.join(", ")}.</p>
          ) : null}
        </section>
      )}

      {hasFile && (
        <section>
          <p className="mb-2 px-1 text-[10.5px] font-medium uppercase tracking-[0.07em] text-[var(--c-ink-3)]">The original</p>
          <RecordFile doc={doc} src={fileSrc} downloadSrc={downloadSrc} />
        </section>
      )}

      <div className="border-t border-[var(--c-line)] pt-4">
        {confirming ? (
          <ConfirmBar
            text={
              <>
                Delete this record for good? It also removes it from Saheli&apos;s memory and from {person.pronouns.possessive} cards and trends.
              </>
            }
            stack
            confirmLabel="Delete"
            busyLabel="Deleting…"
            busy={busy}
            onConfirm={() => void remove()}
            onCancel={() => setConfirming(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-[#b4232a] outline-none transition-colors hover:bg-[#fff6f6] focus-visible:ring-2 focus-visible:ring-[#b4232a]"
          >
            <Trash size={15} aria-hidden />
            Delete this record
          </button>
        )}
        {error && (
          <p role="alert" className="mt-2 text-[12.5px] text-[var(--c-accent-soft-ink)]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
