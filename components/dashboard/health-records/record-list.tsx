"use client";

import { ArrowDown, ArrowUp, CaretRight, FileArrowUp } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { LabDocument, RecordKind } from "@/lib/api";
import { computeFlag, kindLabel, opensReview, RECORD_KINDS, recordDateLabel, recordKind, rowStatus, shortTestName } from "@/lib/health-records";
import { cn } from "@/lib/utils";
import { Panel, PanelTitle, PillTabs, SmallButton } from "@/components/care-os/ui";
import { KindChip, StatusTag } from "./record-bits";

const PAGE = 8;

type Chip = { text: string; bad?: boolean; dir?: "up" | "down" };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Up to two values outside normal (then "+N"), or how many medicines Saheli read. */
export function chipsFor(doc: LabDocument): Chip[] {
  const status = rowStatus(doc);
  if (status === "failed") return [];
  const reading = status === "review" ? doc.reading : null;
  const meds = reading ? reading.medicines.length : doc.medicines?.length ?? 0;
  const values = reading ? reading.values : doc.lab_values ?? [];
  if (values.length) {
    const odd = values
      .map((v) => ({ v, flag: computeFlag(v.value, v.range, v.flag) }))
      .filter((x) => x.flag === "low" || x.flag === "high")
      .slice(0, 2);
    const chips: Chip[] = odd.map(({ v, flag }) => ({ text: `${shortTestName(v.name)} ${v.value}`, bad: true, dir: flag === "low" ? "down" : "up" }));
    const rest = values.length - odd.length;
    if (!odd.length) chips.push({ text: plural(values.length, "value") });
    else if (rest > 0) chips.push({ text: `+${rest}` });
    return chips;
  }
  if (meds) return [{ text: plural(meds, "medicine") }];
  if (status === "saved" && doc.ai_summary && (recordKind(doc.kind) === "scan" || recordKind(doc.kind) === "other")) return [{ text: "summary" }];
  return [];
}

function rowMeta(doc: LabDocument): string {
  const via =
    doc.via === "whatsapp"
      ? "on WhatsApp"
      : rowStatus(doc) === "review"
        ? doc.uploaded_by_you !== false
          ? "uploaded by you"
          : `uploaded by ${doc.uploaded_by_name ?? "family"}`
        : null;
  return [kindLabel(doc.kind), recordDateLabel(doc), doc.provider, via].filter(Boolean).join(" · ");
}

function RowBody({ doc }: { doc: LabDocument }) {
  const chips = chipsFor(doc);
  return (
    <>
      <KindChip kind={doc.kind} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 max-w-full truncate text-[14px] font-medium">{doc.title || kindLabel(doc.kind)}</span>
          <StatusTag doc={doc} />
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-[var(--c-ink-2)]">{rowMeta(doc)}</span>
      </span>
      {chips.length > 0 && (
        <span className="hidden shrink-0 gap-1.5 md:flex">
          {chips.map((c) => (
            <span
              key={c.text}
              className={cn(
                "c-num inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px]",
                c.bad ? "bg-[var(--c-danger-soft)] text-[var(--c-danger-ink)]" : "bg-[var(--c-frame)] text-[var(--c-ink-2)]",
              )}
            >
              {c.text}
              {c.dir === "down" && <ArrowDown size={10} weight="bold" aria-label="low" />}
              {c.dir === "up" && <ArrowUp size={10} weight="bold" aria-label="high" />}
            </span>
          ))}
        </span>
      )}
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] transition-colors group-hover:bg-[var(--c-card)]">
        <CaretRight size={14} />
      </span>
    </>
  );
}

const ROW =
  "group flex w-full items-center gap-3 rounded-[14px] px-1 py-3.5 text-left outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--c-frame)_45%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] sm:gap-4";

/** "All records": compact rows with kind filters. Failed and waiting records open the review screen; the rest open the detail sheet. */
export function RecordList({
  records,
  loading,
  reviewHrefFor,
  onOpen,
  onUpload,
}: {
  records: LabDocument[];
  loading?: boolean;
  reviewHrefFor: (doc: LabDocument) => string;
  onOpen: (doc: LabDocument) => void;
  onUpload: () => void;
}) {
  const [kind, setKind] = useState<"all" | RecordKind>("all");
  const [expanded, setExpanded] = useState(false);

  const tabs = useMemo(() => {
    const count = (k: RecordKind) => records.filter((d) => recordKind(d.kind) === k).length;
    return [
      { id: "all" as const, label: `All ${records.length}` },
      ...RECORD_KINDS.map((k) => ({ id: k.id, label: `${k.plural} ${count(k.id)}`, n: count(k.id) }))
        .filter((t) => t.n > 0 || t.id === kind)
        .map(({ id, label }) => ({ id, label })),
    ];
  }, [records, kind]);

  const shown = kind === "all" ? records : records.filter((d) => recordKind(d.kind) === kind);
  const visible = expanded ? shown : shown.slice(0, PAGE);
  const hidden = shown.length - visible.length;

  return (
    <Panel className="min-w-0">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <PanelTitle title="All records" />
        {records.length > 0 && (
          <PillTabs<"all" | RecordKind>
            tabs={tabs}
            value={kind}
            onChange={(k) => {
              setKind(k);
              setExpanded(false);
            }}
          />
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading records">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[60px] animate-pulse rounded-[14px] bg-[var(--c-frame)]" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-[18px] bg-[var(--c-frame)] px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c-card)]">
            <FileArrowUp size={22} aria-hidden />
          </span>
          <p className="mt-3 text-[15px] font-medium">No health records yet</p>
          <p className="mt-1 max-w-sm text-[12.5px] text-[var(--c-ink-2)]">Upload a lab report, a prescription or a photo of one. Saheli reads it and shows you what she found before anything is saved.</p>
          <SmallButton dark className="mt-4" onClick={onUpload}>
            Upload a report
          </SmallButton>
        </div>
      ) : (
        <>
          <ul className="mt-3">
            {visible.map((doc) => (
              <li key={doc.document_id} className="border-b border-[var(--c-line)] last:border-0">
                {opensReview(doc) ? (
                  <Link href={reviewHrefFor(doc)} className={ROW}>
                    <RowBody doc={doc} />
                  </Link>
                ) : (
                  <button type="button" onClick={() => onOpen(doc)} className={ROW}>
                    <RowBody doc={doc} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-full px-4 py-2 text-[12.5px] text-[var(--c-ink-2)] outline-none hover:bg-[var(--c-frame)] hover:text-[var(--c-ink)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]"
              >
                Show {hidden} more
              </button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
