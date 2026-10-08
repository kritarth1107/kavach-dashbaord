"use client";

import { ArrowClockwise, ArrowLeft, Check, CheckCircle, CircleNotch, Info, LockSimple, Trash, UserSwitch, Warning, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  decideRecipientLab,
  getRecipientLabDetail,
  getRecipientLabDownloadPath,
  rereadRecipientLab,
  setRecipientLabPerson,
  type LabDecisionInput,
  type LabDecisionResult,
  type LabDocument,
  type LabDocumentDetail,
  type LabPersonInput,
  ApiError,
} from "@/lib/api";
import { firstNameOf, friendlyError, kindLabel } from "@/lib/health-records";
import { cn } from "@/lib/utils";
import { useLoad } from "@/components/care-os/care-kit";
import { usePerson } from "@/components/care-os/person-context";
import { DarkButton, Panel, SmallButton, Tag } from "@/components/care-os/ui";
import { ConfirmBar, DARK_PILL_BUTTON, makeRecordPerson, PILL_BUTTON, RecordFile, recordsHref, reviewHref, setRecordsFlash, type RecordPerson, type RecordsFlash, type RecordsFrom } from "./record-bits";
import { ReviewForm, type ReviewBusy } from "./review-form";

const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/* ── data ──────────────────────────────────────────────────────────────── */

/** /dashboard/record/review/[documentId]?recipient=…: check what Saheli read, then choose what to do. */
export function RecordReviewPage({ documentId }: { documentId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { familyId, selectedId, people, members, me, loading: peopleLoading } = usePerson();
  const rid = params.get("recipient") ?? selectedId;
  const from: RecordsFrom = params.get("from") === "family" ? "family" : null;

  const person = useMemo<RecordPerson | null>(() => {
    if (!rid) return null;
    const p = people.find((x) => x.id === rid);
    const m = members.find((x) => x.userId === rid);
    if (!p && !m) return null;
    return makeRecordPerson({ id: rid, name: m?.name || p?.name || "", relation: p?.relation ?? (m?.relationship || undefined), self: p?.self ?? rid === me.id });
  }, [rid, people, members, me.id]);

  const candidates = useMemo(
    () =>
      people
        .filter((p) => p.id !== rid)
        .map((p) => ({ id: p.id, name: firstNameOf(members.find((m) => m.userId === p.id)?.name || p.name) || p.name, self: Boolean(p.self) })),
    [people, members, rid],
  );

  const key = familyId && rid ? `${familyId}/${rid}/${documentId}` : null;
  const load = useCallback(async () => {
    const { data } = await getRecipientLabDetail(familyId!, rid!, documentId);
    if (!data) throw new Error("empty");
    return data;
  }, [familyId, rid, documentId]);
  const rec = useLoad<LabDocumentDetail>(key, load);
  const update = rec.update;

  const back = rid ? recordsHref(rid, from) : "/dashboard/record";

  if (!rec.data) {
    if (rec.error || (!peopleLoading && (!rid || !person))) {
      const notFound = rec.error && /not found/i.test(rec.error);
      return (
        <div className="space-y-4">
          <Breadcrumb href={back} />
          <Panel className="flex flex-col items-center py-14 text-center">
            <p className="text-[18px] font-medium">{notFound ? "This report isn't here any more" : "Couldn't open this report"}</p>
            <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">
              {notFound ? "It may have been discarded or moved to someone else in the family." : friendlyError(rec.error ? new Error(rec.error) : null, "Please try again in a moment.")}
            </p>
            <div className="mt-5 flex gap-2">
              {!notFound && rec.error && (
                <SmallButton icon={ArrowClockwise} onClick={rec.reload}>
                  Try again
                </SmallButton>
              )}
              <Link href={back} className={DARK_PILL_BUTTON}>
                Go to health records
              </Link>
            </div>
          </Panel>
        </div>
      );
    }
    return <ReviewSkeleton />;
  }
  if (!person || !familyId || !rid) return <ReviewSkeleton />;

  return (
    <ReviewScreen
      doc={rec.data}
      person={person}
      candidates={candidates}
      recordsHref={back}
      addPersonHref="/dashboard/family/new"
      fileSrc={getRecipientLabDownloadPath(familyId, rid, documentId, { inline: true })}
      downloadSrc={getRecipientLabDownloadPath(familyId, rid, documentId)}
      api={{
        decide: async (input) => (await decideRecipientLab(familyId, rid, documentId, input)).data!,
        setPerson: async (input) => (await setRecipientLabPerson(familyId, rid, documentId, input)).data!,
        reread: async () => (await rereadRecipientLab(familyId, rid, documentId)).data!,
      }}
      onDoc={(doc) => update((prev) => ({ ...prev, ...doc, raw_text: doc.raw_text ?? prev.raw_text }))}
      onReload={rec.reload}
      onFinished={(flash) => {
        setRecordsFlash(flash);
        router.push(back);
      }}
      onMoved={(to) => router.push(reviewHref(documentId, to))}
    />
  );
}

/* ── view ──────────────────────────────────────────────────────────────── */

export type ReviewApi = {
  decide: (input: LabDecisionInput) => Promise<LabDecisionResult>;
  setPerson: (input: LabPersonInput) => Promise<{ recipient_user_id: string; document: LabDocument | null }>;
  reread: () => Promise<LabDocument>;
};

export type ReviewScreenProps = {
  doc: LabDocument & { raw_text?: string | null };
  person: RecordPerson;
  /** Others in the family a report can be moved to. */
  candidates: Array<{ id: string; name: string; self?: boolean }>;
  recordsHref: string;
  addPersonHref: string;
  fileSrc: string | null;
  downloadSrc?: string | null;
  api: ReviewApi;
  onDoc: (doc: LabDocument) => void;
  onReload: () => void;
  onFinished: (flash: RecordsFlash) => void;
  onMoved: (recipientId: string) => void;
};

function savedSummary(res: LabDecisionResult, req: LabDecisionInput, person: RecordPerson): RecordsFlash {
  const p = person.pronouns.possessive;
  const parts = [req.saveValues === false ? "Done." : `Saved to ${p} health record.`];
  if (res.scheduled.length) parts.push(`Added ${listJoin(res.scheduled)} to ${p} schedule.`);
  if (res.remembered) parts.push("Saheli will remember it.");
  if (res.reminder) parts.push("You'll get a reminder a week before the next visit.");
  if (res.notified) parts.push("The family was told on WhatsApp.");
  const warn: string[] = [];
  if (res.scheduleProblems.length) {
    warn.push(`Couldn't add ${listJoin(res.scheduleProblems)} to the schedule. Add ${res.scheduleProblems.length === 1 ? "it" : "them"} from Medicines and care.`);
  }
  if (req.remember && !res.remembered) warn.push("Saheli couldn't remember it just now.");
  if (req.nextVisitReminder && !res.reminder) warn.push("The visit reminder couldn't be set.");
  if (req.notifyFamily && !res.notified) warn.push("The message to the family didn't go out.");
  return { text: parts.join(" "), warn: warn.join(" ") || undefined };
}

export function ReviewScreen(props: ReviewScreenProps) {
  const { doc, person, api } = props;
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<ReviewBusy>(null);
  const [error, setError] = useState("");

  const reading = doc.reading ?? null;
  const waiting = doc.review_status === "needs_review";
  const failed = doc.extraction_status === "failed" || (waiting && !reading);
  const decided = !failed && !waiting;
  const pc = doc.person_check;
  const blocked = waiting && !failed && pc?.status === "mismatch" && !pc.confirmedBy;

  async function run(kind: Exclude<ReviewBusy, null>, job: () => Promise<void>, fallback: string) {
    setBusy(kind);
    setError("");
    try {
      await job();
    } catch (err) {
      if (err instanceof ApiError && err.code === "person_mismatch") props.onReload();
      setError(friendlyError(err, fallback));
    } finally {
      setBusy(null);
    }
  }

  const save = (input: LabDecisionInput) =>
    run(
      "save",
      async () => {
        const res = await api.decide(input);
        props.onFinished(savedSummary(res, input, person));
      },
      "Couldn't save it. Please try again.",
    );

  const keepFile = () =>
    run(
      "file",
      async () => {
        await api.decide({ action: "file_only" });
        props.onFinished({ text: `Kept as a file. Nothing from it was added to ${person.pronouns.possessive} cards, schedule or Saheli's memory.` });
      },
      "Couldn't keep it as a file. Please try again.",
    );

  const discard = () =>
    run(
      "discard",
      async () => {
        await api.decide({ action: "discard" });
        props.onFinished({ text: "Discarded. The file and everything read from it are gone." });
      },
      "Couldn't discard it. Please try again.",
    );

  const reread = () =>
    run(
      "reread",
      async () => {
        const fresh = await api.reread();
        props.onDoc(fresh);
        setVersion((v) => v + 1);
      },
      "Couldn't read it again. Please try again.",
    );

  const theirs = () =>
    run(
      "person",
      async () => {
        const res = await api.setPerson({ action: "theirs" });
        if (res.document) props.onDoc(res.document);
        else props.onReload();
      },
      "Couldn't confirm that. Please try again.",
    );

  const move = (toUserId: string) =>
    run(
      "person",
      async () => {
        const res = await api.setPerson({ action: "move", toUserId });
        props.onMoved(res.recipient_user_id || toUserId);
      },
      "Couldn't move it. Please try again.",
    );

  return (
    <div className="space-y-4">
      <Breadcrumb href={props.recordsHref} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-[26px] leading-[1.05] tracking-[-0.03em] sm:text-[30px]">
          <span className="block font-light text-[var(--c-ink-3)]">{failed ? "I tried to read it." : decided ? "Already sorted." : "Here's what I read."}</span>
          <span className="block font-medium">{failed ? "Choose what to do with it." : decided ? "Nothing to review here." : "Check it, then choose what to do."}</span>
        </h1>
        {!decided && (
          <Tag tone="dark" className="gap-1 self-start sm:self-auto">
            <LockSimple size={11} weight="bold" aria-hidden />
            Nothing saved yet
          </Tag>
        )}
      </div>

      {waiting && !failed && (
        <PersonBanner
          doc={doc}
          person={person}
          candidates={props.candidates}
          addPersonHref={props.addPersonHref}
          busy={busy}
          error={blocked ? error : ""}
          onTheirs={theirs}
          onMove={move}
          onDiscard={discard}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <RecordFile doc={doc} src={props.fileSrc} downloadSrc={props.downloadSrc} rawText={doc.raw_text} tilt />
        {decided ? (
          <DecidedPanel doc={doc} person={person} href={props.recordsHref} />
        ) : failed ? (
          <FailedPanel doc={doc} person={person} busy={busy} error={error} recordsHref={props.recordsHref} onReread={reread} onKeepFile={keepFile} onDiscard={discard} />
        ) : (
          <div inert={blocked} aria-disabled={blocked || undefined} className={cn(blocked && "pointer-events-none select-none opacity-40")}>
            <ReviewForm
              key={`${doc.document_id}:${version}`}
              reading={reading!}
              person={person}
              busy={busy}
              error={blocked ? "" : error}
              onSave={(input) => void save(input)}
              onKeepFile={() => void keepFile()}
              onDiscard={() => void discard()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Breadcrumb({ href }: { href: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12.5px] text-[var(--c-ink-2)]">
      <Link href={href} className="inline-flex items-center gap-2 rounded-sm outline-none hover:text-[var(--c-ink)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]">
        <ArrowLeft size={14} aria-hidden />
        Health records
      </Link>
      <span className="text-[var(--c-ink-3)]" aria-hidden>
        /
      </span>
      <span aria-current="page" className="text-[var(--c-ink)]">
        Review what Saheli read
      </span>
    </nav>
  );
}

/* ── whose report is it ────────────────────────────────────────────────── */

function PersonBanner({
  doc,
  person,
  candidates,
  addPersonHref,
  busy,
  error,
  onTheirs,
  onMove,
  onDiscard,
}: {
  doc: LabDocument;
  person: RecordPerson;
  candidates: ReviewScreenProps["candidates"];
  addPersonHref: string;
  busy: ReviewBusy;
  error: string;
  onTheirs: () => void;
  onMove: (id: string) => void;
  onDiscard: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const pc = doc.person_check;
  const r = doc.reading;
  const onReport = pc?.nameOnReport || r?.patientName || doc.patient_name || "";
  const who = person.self ? "you" : `${person.name}${person.relation ? ` (${person.relation})` : ""}`;

  if (pc?.status === "mismatch" && !pc.confirmedBy) {
    const extra = [r?.patientAge?.replace(/\s*(y|yrs?|years?)\b\.?/i, ""), r?.patientSex?.charAt(0).toUpperCase()].filter(Boolean).join(" ");
    const shownName = `${onReport}${extra ? ` (${extra})` : ""}`;
    const sorted = [...candidates].sort((a, b) => Number(b.id === pc.suggestedUserId) - Number(a.id === pc.suggestedUserId));
    const working = busy !== null;
    return (
      <div role="region" aria-label="Whose report is this?" className="rounded-[22px] border-2 border-[var(--c-danger-line)] bg-[var(--c-danger-wash)] p-4 sm:p-5 dark:border-[rgba(180,35,42,0.4)] dark:bg-[rgba(180,35,42,0.1)]">
        <div className="flex items-start gap-3">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--c-danger-soft)] text-[var(--c-danger-ink)] sm:flex" aria-hidden>
            <Warning size={20} weight="fill" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-medium">This report looks like it&apos;s for someone else</p>
            <p className="mt-1 text-[13px] text-[var(--c-ink-2)]">
              The name on it is <b className="font-medium text-[var(--c-ink)]">{shownName || "someone else"}</b>, but {doc.via === "whatsapp" ? "it came in on WhatsApp for" : "you are uploading to"}{" "}
              <b className="font-medium text-[var(--c-ink)]">{person.self ? "yourself" : person.name}</b>. Nothing from it has been saved or shared with Saheli.
            </p>
            {confirming ? (
              <ConfirmBar
                className="mt-4 bg-[var(--c-frame)]"
                text="Discard this report? The file and everything read from it are deleted."
                confirmLabel="Discard"
                busyLabel="Discarding…"
                busy={busy === "discard"}
                onConfirm={onDiscard}
                onCancel={() => setConfirming(false)}
              />
            ) : (
              <div className="mt-4 grid gap-2.5 md:grid-cols-3">
                <div className="rounded-[16px] bg-[var(--c-frame)] p-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-medium">
                    <UserSwitch size={15} aria-hidden /> It&apos;s for someone else in the family
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--c-ink-2)]">
                    {sorted.length ? "Move it to: " : "No one else is in the family yet · "}
                    {sorted.map((c, i) => (
                      <span key={c.id}>
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => onMove(c.id)}
                          className="rounded-sm text-[var(--c-ink)] underline underline-offset-2 outline-none hover:text-[var(--c-accent)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] disabled:opacity-50"
                        >
                          {c.self ? `${c.name} (you)` : c.name}
                        </button>
                        {i < sorted.length - 1 ? ", " : ""}
                      </span>
                    ))}
                    {sorted.length ? " · " : ""}
                    <Link href={addPersonHref} className="rounded-sm underline underline-offset-2 outline-none hover:text-[var(--c-ink)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]">
                      add a person
                    </Link>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={working}
                  onClick={onTheirs}
                  className="rounded-[16px] bg-[var(--c-frame)] p-3 text-left outline-none transition-colors hover:bg-[var(--c-danger-wash)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] disabled:opacity-60"
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-medium">
                    {busy === "person" ? <CircleNotch size={14} className="animate-spin" aria-hidden /> : <Check size={14} weight="bold" aria-hidden />}
                    {person.self ? "It is mine" : `It is ${person.pronouns.owned}`}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[var(--c-ink-2)]">The name is written differently. Continue to the review.</span>
                </button>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setConfirming(true)}
                  className="rounded-[16px] bg-[var(--c-solid)] p-3 text-left text-[var(--c-on-solid)] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-medium">
                    <Trash size={14} aria-hidden /> Discard it
                  </span>
                  <span className="mt-0.5 block text-[12px] opacity-70">Delete the file and everything read from it.</span>
                </button>
              </div>
            )}
            {error && (
              <p role="alert" className="mt-3 text-[12.5px] text-[var(--c-danger-ink)]">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (pc?.status === "match" || (pc?.status === "mismatch" && pc.confirmedBy)) {
    return (
      <div className="flex items-start gap-3 rounded-[18px] bg-[var(--c-ok-soft)] px-4 py-3 text-[13px] text-[var(--c-ok-ink)] dark:bg-[rgba(31,122,77,0.2)] ">
        <CheckCircle size={18} weight="fill" className="mt-[1px] shrink-0" aria-hidden />
        <span>
          {pc.confirmedBy && onReport ? (
            <>
              You confirmed this is {person.self ? "yours" : `${person.first}'s`}. The name on it is <b className="font-medium">{onReport}</b>.
            </>
          ) : onReport ? (
            <>
              Name on the report: <b className="font-medium">{onReport}</b>, matches {who}.
            </>
          ) : (
            <>You confirmed this report is {person.self ? "yours" : `${person.first}'s`}.</>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-[18px] bg-[var(--c-card)] px-4 py-3 text-[13px] text-[var(--c-ink-2)]">
      <Info size={18} className="mt-[1px] shrink-0" aria-hidden />
      <span>No name found on it — make sure it is {person.self ? "yours" : `${person.first}'s`}.</span>
    </div>
  );
}

/* ── when the read failed ─────────────────────────────────────────────── */

function FailedPanel({
  doc,
  person,
  busy,
  error,
  recordsHref,
  onReread,
  onKeepFile,
  onDiscard,
}: {
  doc: LabDocument;
  person: RecordPerson;
  busy: ReviewBusy;
  error: string;
  recordsHref: string;
  onReread: () => void;
  onKeepFile: () => void;
  onDiscard: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  // Records saved before the review step can be read again or deleted, but are already kept as they are.
  const legacy = doc.review_status !== "needs_review";
  const working = busy !== null;
  return (
    <section className="rounded-[22px] bg-[var(--c-card)] p-5" aria-live="polite">
      {busy === "reread" ? (
        <div role="status" className="flex flex-col items-center py-10 text-center">
          <CircleNotch size={28} className="animate-spin text-[var(--c-accent)]" aria-hidden />
          <p className="mt-4 text-[15px] font-medium">Saheli is reading it again…</p>
          <p className="mt-1 text-[12.5px] text-[var(--c-ink-2)]">This can take up to 40 seconds.</p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--c-danger-soft)] text-[var(--c-danger-ink)]" aria-hidden>
              <WarningCircle size={20} weight="fill" />
            </span>
            <div className="min-w-0">
              <p className="text-[16px] font-medium">I couldn&apos;t read this one.</p>
              <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-[var(--c-ink-2)]">
                The photo may be blurry, dark or cut off. I can try again, or you can keep the file as it is. Nothing from it is on {person.pronouns.possessive} record or in Saheli&apos;s memory.
              </p>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">
              {error}
            </p>
          )}
          <div className="mt-5">
            {confirming ? (
              <ConfirmBar
                text={legacy ? "Delete this file for good? It can't be undone." : "Discard this report? The file is deleted and nothing is kept."}
                confirmLabel={legacy ? "Delete" : "Discard"}
                busyLabel={legacy ? "Deleting…" : "Discarding…"}
                busy={busy === "discard"}
                onConfirm={onDiscard}
                onCancel={() => setConfirming(false)}
              />
            ) : (
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {legacy ? (
                    <Link href={recordsHref} className={PILL_BUTTON}>
                      Keep it as it is
                    </Link>
                  ) : (
                    <button type="button" className={PILL_BUTTON} onClick={onKeepFile} disabled={working}>
                      {busy === "file" ? "Keeping the file…" : "Keep only the file"}
                    </button>
                  )}
                  <button type="button" className={PILL_BUTTON} onClick={() => setConfirming(true)} disabled={working}>
                    <Trash size={15} aria-hidden />
                    {legacy ? "Delete" : "Discard"}
                  </button>
                </div>
                <DarkButton onClick={onReread} disabled={working} className="justify-between self-stretch sm:self-auto">
                  Read again
                </DarkButton>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function DecidedPanel({ doc, person, href }: { doc: LabDocument; person: RecordPerson; href: string }) {
  const fileOnly = doc.review_status === "file_only";
  return (
    <section className="rounded-[22px] bg-[var(--c-card)] p-5">
      <p className="text-[16px] font-medium">{fileOnly ? "This report is kept as a file." : `This ${kindLabel(doc.kind).toLowerCase()} is already saved.`}</p>
      <p className="mt-1 text-[13px] text-[var(--c-ink-2)]">
        {fileOnly
          ? `Nothing from it is on ${person.pronouns.possessive} cards or in Saheli's memory.`
          : `You can see it, and delete it if you need to, on ${person.self ? "your" : `${person.first}'s`} health records page.`}
      </p>
      <Link href={href} className={cn(DARK_PILL_BUTTON, "mt-4")}>
        Go to health records
      </Link>
    </section>
  );
}

function ReviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading the report">
      <div className="h-4 w-56 animate-pulse rounded-full bg-[var(--c-card)]" />
      <div className="h-[72px] w-full max-w-[420px] animate-pulse rounded-[20px] bg-[var(--c-card)]" />
      <div className="h-[48px] animate-pulse rounded-[18px] bg-[var(--c-card)]" />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="h-[380px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
        <div className="h-[520px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
      </div>
    </div>
  );
}
