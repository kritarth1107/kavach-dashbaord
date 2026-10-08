"use client";

import { ArrowClockwise, ArrowLeft, Sparkle, Warning, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteRecipientLab,
  getFamilyIntegrations,
  getRecipientLabDownloadPath,
  getRecipientLabHighlights,
  getRecipientLabs,
  uploadRecipientLab,
  uploadRecipientLabFile,
  uploadRecipientLabFiles,
  type LabDocument,
  type LabHighlights,
} from "@/lib/api";
import { addDoctorQuestion, addFamilyTask, getCareTeam, type Appointment } from "@/lib/care-features-api";
import { addedAt, friendlyError, kindLabel, rowStatus } from "@/lib/health-records";
import { cn } from "@/lib/utils";
import { useLoad } from "@/components/care-os/care-kit";
import { usePerson } from "@/components/care-os/person-context";
import { DarkButton, Panel, SmallButton } from "@/components/care-os/ui";
import { DARK_PILL_BUTTON, Lbl, makeRecordPerson, PILL_BUTTON, possessiveOf, reviewHref, takeRecordsFlash, type RecordPerson, type RecordsFlash, type RecordsFrom } from "./record-bits";
import { RecordDetail } from "./record-detail";
import { RecordList } from "./record-list";
import { NoticedBox, TrendPanel } from "./record-trend";
import { AllValuesSheet, StatCard } from "./stat-cards";
import { UploadSheet } from "./upload-sheet";

/** Saheli's WhatsApp number when the family's settings don't say (same fallback as the integrations page). */
const SAHELI_FALLBACK_NUMBER = "+91 83109 05372";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ── data ──────────────────────────────────────────────────────────────── */

/**
 * The health records page for one person. Used by /dashboard/record (whoever the top picker selects)
 * and by /dashboard/family/[userId]/health-record.
 */
export function HealthRecordsPage({ recipientUserId, from = null }: { recipientUserId: string | null; from?: RecordsFrom }) {
  const router = useRouter();
  const { familyId, people, members, me, loading: peopleLoading } = usePerson();
  const rid = recipientUserId;

  const person = useMemo<RecordPerson | null>(() => {
    if (!rid) return null;
    const p = people.find((x) => x.id === rid);
    const m = members.find((x) => x.userId === rid);
    if (!p && !m) return null;
    return makeRecordPerson({ id: rid, name: m?.name || p?.name || "", relation: p?.relation ?? (m?.relationship || undefined), self: p?.self ?? rid === me.id });
  }, [rid, people, members, me.id]);

  const key = familyId && rid ? `${familyId}/${rid}` : null;
  const loadList = useCallback(async () => (await getRecipientLabs(familyId!, rid!)).data?.documents ?? [], [familyId, rid]);
  const loadHighlights = useCallback(async () => (await getRecipientLabHighlights(familyId!, rid!)).data ?? null, [familyId, rid]);
  const list = useLoad<LabDocument[]>(key, loadList);
  const highlights = useLoad<LabHighlights | null>(key, loadHighlights);

  // Only needed for "Saheli noticed": is there an appointment to add the question to?
  const noticed = highlights.data?.noticed ?? null;
  const loadTeam = useCallback(async () => (await getCareTeam(familyId!, rid!)).upcoming[0] ?? null, [familyId, rid]);
  const team = useLoad<Appointment | null>(key && noticed ? `${key}/team` : null, loadTeam);
  const loadNumber = useCallback(async () => (await getFamilyIntegrations(familyId!)).data?.whatsapp.kavachNumber ?? null, [familyId]);
  const integrations = useLoad<string | null>(familyId ? `${familyId}/wa` : null, loadNumber);

  const reloadList = list.reload;
  const reloadHighlights = highlights.reload;
  const reloadAll = useCallback(() => {
    reloadList();
    reloadHighlights();
  }, [reloadList, reloadHighlights]);

  if (!rid || (!person && !peopleLoading)) {
    if (peopleLoading) return <PageSkeleton />;
    return (
      <Panel className="flex flex-col items-start gap-4 p-8">
        <h1 className="text-[34px] leading-[1.05] tracking-[-0.03em]">
          <span className="block font-light text-[var(--c-ink-3)]">Health records</span>
          <span className="block font-medium">Who are they for?</span>
        </h1>
        <p className="max-w-md text-[14px] text-[var(--c-ink-2)]">Add the person you care for first. Their reports, prescriptions and scans will live here.</p>
        <Link href="/dashboard/family" className={DARK_PILL_BUTTON}>
          Go to family
        </Link>
      </Panel>
    );
  }
  if (!person || !familyId) return <PageSkeleton />;

  const pron = person.pronouns;
  const number = (integrations.data ?? SAHELI_FALLBACK_NUMBER).replace(/\D/g, "");
  const askText = person.self ? "What do my latest reports say?" : `What do ${person.first}'s latest reports say?`;
  const goReview = (documentId: string) => router.push(reviewHref(documentId, rid, from));

  async function uploadFiles(files: File[]): Promise<UploadOutcome> {
    if (files.length === 1) {
      const { data } = await uploadRecipientLabFile(familyId!, rid!, files[0], {});
      if (!data) throw new Error("empty");
      if (data.already_on_file && data.review_status !== "needs_review") {
        reloadAll();
        return { message: `This file is already in ${pron.possessive} records. No second copy was added.` };
      }
      goReview(data.document_id);
      return {};
    }
    const { data } = await uploadRecipientLabFiles(familyId!, rid!, files, {});
    const ok = data?.uploaded?.length ?? data?.count ?? 0;
    const failed = data?.failed ?? [];
    reloadAll();
    return {
      flash: {
        text: ok ? `${plural(ok, "report")} uploaded. Each one is waiting for your review below.` : "Nothing was uploaded.",
        warn: failed.length ? `Couldn't upload ${failed.map((f) => f.file_name).join(", ")}.` : undefined,
      },
    };
  }

  async function uploadText(text: string): Promise<UploadOutcome> {
    const { data } = await uploadRecipientLab(familyId!, rid!, { rawText: text });
    if (!data) throw new Error("empty");
    goReview(data.document_id);
    return {};
  }

  async function remove(doc: LabDocument) {
    await deleteRecipientLab(familyId!, rid!, doc.document_id);
    reloadAll();
  }

  return (
    <HealthRecordsView
      person={person}
      from={from}
      records={list.data}
      recordsError={list.error && !list.data ? friendlyError(new Error(list.error), "Couldn't load the records.") : ""}
      onRetry={reloadAll}
      highlights={highlights.data}
      highlightsLoading={highlights.loading && !highlights.data}
      appointment={noticed ? (team.loading ? undefined : (team.data ?? null)) : null}
      askHref={`https://wa.me/${number}?text=${encodeURIComponent(askText)}`}
      fileSrc={(d) => getRecipientLabDownloadPath(familyId, rid, d.document_id, { inline: true })}
      downloadSrc={(d) => getRecipientLabDownloadPath(familyId, rid, d.document_id)}
      reviewHrefFor={(d) => reviewHref(d.document_id, rid, from)}
      onUploadFiles={uploadFiles}
      onUploadText={uploadText}
      onDelete={remove}
      onAddQuestion={async (k, q) => {
        await addDoctorQuestion(familyId, rid, k, q);
      }}
      onAddTask={async (title) => {
        await addFamilyTask(familyId, rid, { title, assignee: me.id ?? rid });
      }}
    />
  );
}

/* ── view ──────────────────────────────────────────────────────────────── */

/** After an upload: a note in the sheet, a message on the page (the sheet closes), or nothing (moved to the review screen). */
export type UploadOutcome = { message?: string; flash?: RecordsFlash };

export type HealthRecordsViewProps = {
  person: RecordPerson;
  from?: RecordsFrom;
  /** null while loading. */
  records: LabDocument[] | null;
  recordsError?: string;
  onRetry?: () => void;
  highlights: LabHighlights | null;
  highlightsLoading?: boolean;
  /** undefined while loading, null when there is none. */
  appointment: Appointment | null | undefined;
  askHref: string | null;
  fileSrc: (doc: LabDocument) => string | null;
  downloadSrc: (doc: LabDocument) => string | null;
  reviewHrefFor: (doc: LabDocument) => string;
  onUploadFiles: (files: File[]) => Promise<UploadOutcome>;
  onUploadText: (text: string) => Promise<UploadOutcome>;
  onDelete: (doc: LabDocument) => Promise<void>;
  onAddQuestion: (appointmentKey: string, question: string) => Promise<void>;
  onAddTask: (title: string) => Promise<void>;
  /** For previews: start with this message. */
  initialFlash?: RecordsFlash | null;
};

export function HealthRecordsView(props: HealthRecordsViewProps) {
  const { person, from = null, records, highlights } = props;
  const pron = person.pronouns;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detail, setDetail] = useState<LabDocument | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const trendRef = useRef<HTMLDivElement>(null);
  // A message from the screen before (the review screen after saving), shown once.
  const [flash, setFlash] = useState<RecordsFlash | null>(() => props.initialFlash ?? takeRecordsFlash());

  async function afterUpload(job: Promise<UploadOutcome>): Promise<string | void> {
    const out = await job;
    if (out.flash) {
      setUploadOpen(false);
      setFlash(out.flash);
    }
    return out.message;
  }

  /** Show a value's trend; on a phone the trend is further down, so go there. */
  function pick(key: string) {
    setPicked(key);
    if (window.matchMedia("(max-width: 1023px)").matches) trendRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function remove(doc: LabDocument) {
    await props.onDelete(doc);
    setDetail(null);
    setFlash({ text: `Deleted "${doc.title}". Saheli no longer remembers it.` });
  }

  // A plain message goes away by itself; one with a warning stays until it is closed.
  useEffect(() => {
    if (!flash || flash.warn) return;
    const t = setTimeout(() => setFlash(null), 9000);
    return () => clearTimeout(t);
  }, [flash]);

  const cards = highlights?.cards ?? [];
  const all = highlights?.all ?? [];
  const selected = all.find((c) => c.key === picked) ?? cards.find((c) => c.key === highlights?.noticed?.key) ?? cards[0] ?? null;
  const waiting = useMemo(
    () => (records ?? []).filter((d) => d.review_status === "needs_review").sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [records],
  );

  return (
    <div className="space-y-4">
      {from === "family" && (
        <Link
          href={`/dashboard/family/${person.id}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--c-line)] pl-3 pr-3.5 text-[12.5px] text-[var(--c-ink-2)] outline-none transition-colors hover:bg-[var(--c-card)] hover:text-[var(--c-ink)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]"
        >
          <ArrowLeft size={14} weight="bold" aria-hidden />
          Back to {person.self ? "your" : `${person.first}'s`} profile
        </Link>
      )}

      {flash && <FlashBanner flash={flash} onClose={() => setFlash(null)} />}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-[30px] leading-[1.05] tracking-[-0.03em] sm:text-[34px]">
          <span className="block font-light text-[var(--c-ink-3)]">{possessiveOf(person)}</span>
          <span className="block font-medium">health records</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {props.askHref && (
            <a href={props.askHref} target="_blank" rel="noopener noreferrer" className={PILL_BUTTON}>
              <Sparkle size={15} aria-hidden />
              Ask Saheli
              <span className="sr-only">on WhatsApp (opens in a new tab)</span>
            </a>
          )}
          <DarkButton onClick={() => setUploadOpen(true)}>Upload a report</DarkButton>
        </div>
      </header>

      <section aria-labelledby="hr-latest">
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Lbl id="hr-latest">Latest from {pron.possessive} reports</Lbl>
          {cards.length > 0 && highlights && (
            <p className="text-[12px] text-[var(--c-ink-3)]">
              Picked from {plural(highlights.reports, "lab report")} · values outside normal first ·{" "}
              <button type="button" onClick={() => setAllOpen(true)} className="rounded-sm text-[var(--c-ink)] underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]">
                see all {all.length} values
              </button>
            </p>
          )}
        </div>
        {props.highlightsLoading ? (
          <div className="mt-2.5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading the latest values">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[150px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
            ))}
          </div>
        ) : cards.length ? (
          <div className="mt-2.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c) => (
              <StatCard key={c.key} card={c} selected={cards.length > 1 && selected?.key === c.key} onSelect={() => pick(c.key)} />
            ))}
          </div>
        ) : (
          <p className="mt-2.5 rounded-[18px] bg-[var(--c-card)] px-4 py-3.5 text-[13px] text-[var(--c-ink-2)]">Upload a report and the important numbers will show here.</p>
        )}
      </section>

      {waiting.length > 0 && <ReviewBanner docs={waiting} href={props.reviewHrefFor(waiting[0])} />}

      {props.recordsError ? (
        <Panel className="flex flex-col items-center py-14 text-center">
          <p className="text-[16px] font-medium">{props.recordsError}</p>
          {props.onRetry && (
            <SmallButton dark icon={ArrowClockwise} className="mt-4" onClick={props.onRetry}>
              Try again
            </SmallButton>
          )}
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
          <RecordList records={records ?? []} loading={records === null} reviewHrefFor={props.reviewHrefFor} onOpen={setDetail} onUpload={() => setUploadOpen(true)} />
          <div ref={trendRef} className="min-w-0 scroll-mt-4">
            <TrendPanel card={selected}>
              {highlights?.noticed && <NoticedBox text={highlights.noticed.text} appointment={props.appointment} onAddQuestion={props.onAddQuestion} onAddTask={props.onAddTask} />}
            </TrendPanel>
          </div>
        </div>
      )}

      <UploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        person={person}
        onFiles={(files) => afterUpload(props.onUploadFiles(files))}
        onText={(text) => afterUpload(props.onUploadText(text))}
      />
      <RecordDetail doc={detail} person={person} fileSrc={props.fileSrc} downloadSrc={props.downloadSrc} onClose={() => setDetail(null)} onDelete={remove} />
      <AllValuesSheet
        open={allOpen}
        onClose={() => setAllOpen(false)}
        cards={all}
        onPick={(k) => {
          setAllOpen(false);
          pick(k);
        }}
      />
    </div>
  );
}

/** "1 report is waiting for your review": the newest one, what was read, and a way straight to it. */
function ReviewBanner({ docs, href }: { docs: LabDocument[]; href: string }) {
  const newest = docs[0];
  const failed = rowStatus(newest) === "failed";
  const r = newest.reading;
  const read = failed
    ? "Saheli couldn't read it."
    : r?.medicines.length
      ? `Saheli read ${plural(r.medicines.length, "medicine")}.`
      : r?.values.length
        ? `Saheli read ${plural(r.values.length, "value")}.`
        : "Saheli read it.";
  const when = addedAt(newest.created_at);
  const how = newest.via === "whatsapp" ? `sent on WhatsApp ${when}` : `uploaded ${when}`;
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border-2 border-[var(--c-accent-soft)] bg-[var(--c-frame)] p-4 sm:flex-row sm:items-center sm:gap-4">
      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)] sm:flex" aria-hidden>
        <Sparkle size={19} weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{docs.length === 1 ? "1 report is waiting for your review" : `${docs.length} reports are waiting for your review`}</p>
        <p className="text-[12.5px] text-[var(--c-ink-2)]">
          {[kindLabel(newest.reading?.kind ?? newest.kind), when ? how : null].filter(Boolean).join(" · ")} · {read} Nothing is saved until you choose.
        </p>
      </div>
      <Link href={href} className={cn(DARK_PILL_BUTTON, "self-start sm:self-auto")}>
        Review now
      </Link>
    </div>
  );
}

function FlashBanner({ flash, onClose }: { flash: RecordsFlash; onClose: () => void }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-[18px] bg-[var(--c-ok-soft)] px-4 py-3 text-[13px] text-[#14532d] dark:bg-[rgba(31,122,77,0.2)] ">
      <div className="min-w-0 flex-1 space-y-1">
        <p>{flash.text}</p>
        {flash.warn && (
          <p className="flex items-start gap-1.5 text-[var(--c-warn-ink)] ">
            <Warning size={15} weight="fill" className="mt-[1px] shrink-0" aria-hidden />
            {flash.warn}
          </p>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="Close message" className="-m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]">
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading health records">
      <div className="h-[80px] w-full max-w-[320px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[150px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
        ))}
      </div>
      <div className="h-[360px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
    </div>
  );
}
