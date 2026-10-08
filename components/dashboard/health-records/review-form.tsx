"use client";

import { CaretDown, Info, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import type { DraftMedicine, DraftReading, DraftValue, LabDecisionInput, MedicineSlot, RecordKind } from "@/lib/api";
import {
  computeFlag,
  defaultTime,
  fmtClock,
  fmtIsoDate,
  FOOD_LABEL,
  isClock,
  nextVisitDate,
  roughly,
  SLOTS,
  slotOf,
  TYPE_OPTIONS,
} from "@/lib/health-records";
import { cn } from "@/lib/utils";
import { DarkButton, PanelTitle } from "@/components/care-os/ui";
import { ConfirmBar, FlagTag, Lbl, PILL_BUTTON, TickBox, type RecordPerson } from "./record-bits";

type Row = DraftValue & { id: string };
type Med = DraftMedicine & { id: string };
type Point = { id: string; text: string };
type Options = { save: boolean; remember: boolean; addMedicines: boolean; nextVisit: boolean; notify: boolean };

export type ReviewBusy = null | "save" | "file" | "discard" | "reread" | "person";

const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const hasDigit = (s: string) => /\d/.test(s);

/* ── inputs ────────────────────────────────────────────────────────────── */

const FIELD = "h-[38px] w-full min-w-0 rounded-[12px] border border-[var(--c-line)] bg-[var(--c-frame)] pl-2.5 pr-8 text-[13px] text-[var(--c-ink)] outline-none transition-colors placeholder:text-[var(--c-ink-3)] hover:border-[var(--c-ink-3)] focus:border-[var(--c-ink)]";

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id}>
        <Lbl className="mb-1">{label}</Lbl>
      </label>
      <div className="relative">
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={FIELD} />
        <PencilSimple size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-ink-3)]" />
      </div>
    </div>
  );
}

/** Shows "5 Oct 2026"; the real date input sits on top, so a click or the keyboard opens the date picker. */
function DateField({ label, iso, fallback, onChange }: { label: string; iso: string | null; fallback: string | null; onChange: (iso: string | null) => void }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id}>
        <Lbl className="mb-1">{label}</Lbl>
      </label>
      <div className="group relative">
        <div aria-hidden className={cn(FIELD, "flex items-center group-hover:border-[var(--c-ink-3)] group-focus-within:border-[var(--c-ink)]", !iso && "text-[var(--c-ink-3)]")}>
          <span className="truncate">{iso ? fmtIsoDate(iso) : fallback || "Add the date"}</span>
        </div>
        <PencilSimple size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-ink-3)]" />
        <input
          id={id}
          type="date"
          value={iso ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker?.();
            } catch {
              /* the browser opens it its own way */
            }
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}

function TypeField({ value, onChange }: { value: RecordKind; onChange: (k: RecordKind) => void }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id}>
        <Lbl className="mb-1">Type</Lbl>
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as RecordKind)} className={cn(FIELD, "appearance-none")}>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <CaretDown size={13} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-ink-3)]" />
      </div>
    </div>
  );
}

/** Looks like text until hovered or focused, then like a field. */
const CELL =
  "w-full min-w-0 rounded-[10px] border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-[var(--c-ink)] outline-none transition-colors placeholder:text-[var(--c-ink-3)] hover:border-[var(--c-line)] focus:border-[var(--c-ink)] focus:bg-[var(--c-frame)]";

function Section({ title, count, right, children, className }: { title: string; count?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[22px] bg-[var(--c-card)] p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <PanelTitle title={title} />
          {count != null && <span className="text-[12px] text-[var(--c-ink-2)]">{count}</span>}
        </div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const EDIT_HINT = (
  <span className="flex items-center gap-1 text-[12px] text-[var(--c-ink-2)]">
    <PencilSimple size={13} aria-hidden /> Tap any field to fix it
  </span>
);

function OptionRow({ checked, onChange, disabled, title, children }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; title: string; children?: React.ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3 rounded-[16px] bg-[var(--c-frame)] p-3", disabled && "opacity-70")}>
      <TickBox id={id} checked={checked} onChange={onChange} disabled={disabled} className="mt-[1px]" />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className={cn("block text-[13.5px] font-medium", !disabled && "cursor-pointer")}>
          {title}
        </label>
        {children}
      </div>
    </div>
  );
}

const Desc = ({ children }: { children: React.ReactNode }) => <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--c-ink-2)]">{children}</p>;

/* ── the form ──────────────────────────────────────────────────────────── */

/**
 * Everything Saheli read, editable, and what to do with it. Nothing is sent until a button is pressed.
 * Re-created (keyed) when a fresh reading arrives.
 */
export function ReviewForm({
  reading,
  person,
  busy,
  error,
  onSave,
  onKeepFile,
  onDiscard,
}: {
  reading: DraftReading;
  person: RecordPerson;
  busy: ReviewBusy;
  error: string;
  onSave: (input: LabDecisionInput) => void;
  onKeepFile: () => void;
  onDiscard: () => void;
}) {
  const pron = person.pronouns;
  const seq = useRef(0);
  const nextId = (p: string) => `${p}${++seq.current}`;

  const [base, setBase] = useState<DraftReading>(reading);
  const [rows, setRows] = useState<Row[]>(() => reading.values.map((v, i) => ({ ...v, id: `v${i}` })));
  const [meds, setMeds] = useState<Med[]>(() => reading.medicines.map((m, i) => ({ ...m, add: m.alreadyOnSchedule ? false : m.add, id: `m${i}` })));
  const [points, setPoints] = useState<Point[]>(() => reading.memoryPoints.map((t, i) => ({ id: `p${i}`, text: t })));
  const [opts, setOpts] = useState<Options>(() => ({
    save: true,
    remember: reading.memoryPoints.length > 0,
    addMedicines: reading.medicines.some((m) => m.add && !m.alreadyOnSchedule),
    nextVisit: Boolean(reading.nextVisit),
    notify: false,
  }));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [problem, setProblem] = useState("");
  const [focusRow, setFocusRow] = useState<string | null>(null);

  const kind = base.kind;
  const isRx = kind === "prescription";
  const set = (patch: Partial<DraftReading>) => setBase((b) => ({ ...b, ...patch }));
  const opt = (k: keyof Options) => (v: boolean) => setOpts((o) => ({ ...o, [k]: v }));

  const flagged = rows.map((r) => ({ ...r, flag: computeFlag(r.value, r.range, r.flag) }));
  const odd = flagged.filter((r) => r.flag === "low" || r.flag === "high").length;
  const ticked = meds.filter((m) => m.add && !m.alreadyOnSchedule);
  const addable = meds.filter((m) => !m.alreadyOnSchedule);
  const willAdd = opts.addMedicines ? ticked.length : 0;
  const visitIso = base.nextVisit ? nextVisitDate(base) : null;
  const nothingChosen = !opts.save && !(opts.remember && points.some((p) => p.text.trim())) && willAdd === 0 && !(opts.nextVisit && base.nextVisit) && !opts.notify;
  const working = busy !== null;

  /* rows */
  const updateRow = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => {
    const id = nextId("n");
    setRows((rs) => [...rs, { id, name: "", value: "", unit: null, range: null, flag: null }]);
    setFocusRow(id);
  };

  /* medicines */
  const updateMed = (id: string, patch: Partial<Med>) => setMeds((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const toggleSlot = (m: Med, slot: MedicineSlot) => {
    const on = m.times.some((t) => isClock(t) && slotOf(t) === slot);
    const times = on ? m.times.filter((t) => !isClock(t) || slotOf(t) !== slot) : [...m.times, defaultTime(slot, m.food)].sort();
    updateMed(m.id, { times });
  };

  function build(): DraftReading {
    return {
      ...base,
      values: flagged
        .filter((r) => r.name.trim() && r.value.trim())
        .map((r) => ({ name: r.name.trim(), value: r.value.trim(), unit: r.unit?.trim() || null, range: r.range?.trim() || null, flag: r.flag })),
      medicines: meds.map(({ id, ...m }) => {
        const original = reading.medicines[Number(id.slice(1))];
        const times = [...new Set(m.times.filter(isClock))].sort();
        return {
          ...m,
          // An empty name would drop the medicine on the server and shift the others: keep what was read.
          name: m.name.trim() || original?.name || m.name,
          times,
          slots: [...new Set(times.map(slotOf))],
          add: m.add && !m.alreadyOnSchedule,
        };
      }),
      memoryPoints: points.map((p) => p.text.trim()).filter(Boolean),
    };
  }

  function save() {
    const bad = rows.filter((r) => (r.name.trim() && !hasDigit(r.value)) || (!r.name.trim() && r.value.trim()));
    if (bad.length) {
      setProblem(bad.length === 1 ? "One value needs a test name and a number. Fix it or remove it." : `${bad.length} values need a test name and a number. Fix them or remove them.`);
      return;
    }
    if (opts.addMedicines) {
      const noTime = ticked.filter((m) => !m.times.some(isClock));
      if (noTime.length) {
        setProblem(`Pick a time for ${listJoin(noTime.map((m) => m.name))}, or untick ${noTime.length === 1 ? "it" : "them"}.`);
        return;
      }
    }
    setProblem("");
    const r = build();
    onSave({
      action: "save",
      reading: r,
      saveValues: opts.save,
      remember: opts.remember && r.memoryPoints.length > 0,
      addMedicines: opts.addMedicines && willAdd > 0,
      nextVisitReminder: opts.nextVisit && Boolean(r.nextVisit),
      notifyFamily: opts.notify,
    });
  }

  const medsSummary = (() => {
    if (!ticked.length) return "Tick a medicine above to add it.";
    const days = [...new Set(ticked.map((m) => m.durationDays))];
    const sameDays = days.length === 1 && days[0] ? days[0] : null;
    const items = ticked.map((m) => {
      const times = m.times.filter(isClock).sort().map(fmtClock);
      const when = m.instructions || (m.food ? FOOD_LABEL[m.food] : "");
      const own = !sameDays && m.durationDays ? ` for ${plural(m.durationDays, "day")}` : "";
      return `${m.name} ${times.length ? listJoin(times) : "(no time yet)"}${when ? ` (${when.toLowerCase()})` : ""}${own}`;
    });
    return `${listJoin(items)}${sameDays ? `, for ${plural(sameDays, "day")}` : ""}.`;
  })();

  const saveTitle = isRx ? `Save the prescription to ${pron.possessive} health record` : `Save to ${pron.possessive} health record`;
  const saveDesc = rows.length
    ? `The report and its ${plural(flagged.filter((r) => r.name.trim() && r.value.trim()).length, "value")}. The cards and trends on the records page update.`
    : isRx
      ? null
      : "The report and what it says, so you can find it later.";
  const primary = opts.save ? (willAdd ? `Save and add ${plural(willAdd, "medicine")}` : "Save") : willAdd ? `Add ${plural(willAdd, "medicine")}` : "Continue";
  const unread = (base.unread ?? []).filter((u) => u !== "the page");

  const medsOption = addable.length > 0 && (
    <OptionRow
      key="meds"
      checked={opts.addMedicines && ticked.length > 0}
      onChange={opt("addMedicines")}
      disabled={!ticked.length}
      title={ticked.length ? (ticked.length === 1 ? `Add the ticked medicine to ${pron.possessive} schedule` : `Add the ${ticked.length} ticked medicines to ${pron.possessive} schedule`) : `Add medicines to ${pron.possessive} schedule`}
    >
      <Desc>{medsSummary}</Desc>
    </OptionRow>
  );

  return (
    <div className="space-y-3">
      {/* Report fields */}
      <Section title={isRx ? "Prescription" : "Report"} right={EDIT_HINT}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isRx ? (
            <>
              <TextField label="Doctor" value={base.doctor ?? ""} onChange={(v) => set({ doctor: v || null })} placeholder="Add the doctor" />
              <DateField label="Date" iso={base.recordDate} fallback={base.recordDateText} onChange={(v) => set({ recordDate: v })} />
              <TextField label="Clinic" value={base.provider ?? ""} onChange={(v) => set({ provider: v || null })} placeholder="Add the clinic" />
              <TextField label="Next visit" value={base.nextVisit?.text ?? ""} onChange={(v) => set({ nextVisit: v.trim() ? { text: v, date: null } : null })} placeholder="e.g. in 1 month" />
            </>
          ) : (
            <>
              <TypeField value={kind} onChange={(k) => set({ kind: k })} />
              <DateField label="Date" iso={base.recordDate} fallback={base.recordDateText} onChange={(v) => set({ recordDate: v })} />
              <TextField
                label={kind === "lab" ? "Lab / doctor" : kind === "other" ? "From" : "Hospital / doctor"}
                value={base.provider ?? base.doctor ?? ""}
                onChange={(v) => set({ provider: v || null })}
                placeholder="Add who it is from"
              />
              {kind === "discharge" ? (
                <TextField label="Next visit" value={base.nextVisit?.text ?? ""} onChange={(v) => set({ nextVisit: v.trim() ? { text: v, date: null } : null })} placeholder="e.g. in 2 weeks" />
              ) : kind === "other" ? (
                <TextField label="Title" value={base.title} onChange={(v) => set({ title: v })} placeholder="What it is" />
              ) : (
                <TextField label={kind === "scan" ? "What was scanned" : "Tests"} value={base.tests ?? ""} onChange={(v) => set({ tests: v || null })} placeholder="Add the tests" />
              )}
            </>
          )}
        </div>
        {unread.length > 0 && <p className="mt-2.5 text-[12px] text-[var(--c-ink-2)]">I couldn&apos;t read the {listJoin(unread)}. Add it if you can.</p>}
      </Section>

      {/* Values */}
      {(rows.length > 0 || kind === "lab") && (
        <Section title="Values I read" count={rows.length ? `${rows.length}${odd ? ` · ${odd} outside normal` : ""}` : undefined}>
          {rows.length > 0 ? (
            <div className="overflow-hidden rounded-[16px] bg-[var(--c-frame)]">
              <div className="hidden grid-cols-[1.4fr_.8fr_.8fr_.9fr_.7fr_32px] gap-2 border-b border-[var(--c-line)] px-3 py-2 sm:grid" aria-hidden>
                {["Test", "Result", "Unit", "Normal range", "", ""].map((h, i) => (
                  <Lbl key={i} className="px-1.5">
                    {h}
                  </Lbl>
                ))}
              </div>
              <ul>
                {flagged.map((r) => {
                  const bad = (r.name.trim() && !hasDigit(r.value)) || (!r.name.trim() && r.value.trim());
                  const label = r.name.trim() || "new value";
                  return (
                    <li
                      key={r.id}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_auto_32px] items-center gap-x-2 gap-y-1 border-b border-[var(--c-line)] px-3 py-1.5 last:border-0 focus-within:bg-[#fffaf5] sm:grid-cols-[1.4fr_.8fr_.8fr_.9fr_.7fr_32px] dark:focus-within:bg-[rgba(211,84,30,0.08)]",
                        problem && bad && "bg-[#fff6f6]",
                      )}
                    >
                      <input
                        aria-label={`Test name (${label})`}
                        value={r.name}
                        placeholder="Test"
                        autoFocus={focusRow === r.id}
                        onChange={(e) => updateRow(r.id, { name: e.target.value })}
                        className={CELL}
                      />
                      <div className="order-last col-span-3 grid grid-cols-3 gap-2 sm:order-none sm:col-span-1 sm:contents">
                        <input
                          aria-label={`Result for ${label}`}
                          value={r.value}
                          placeholder="Result"
                          inputMode="decimal"
                          onChange={(e) => updateRow(r.id, { value: e.target.value })}
                          className={cn(CELL, "c-num", (r.flag === "low" || r.flag === "high") && "font-medium")}
                        />
                        <input aria-label={`Unit for ${label}`} value={r.unit ?? ""} placeholder="Unit" onChange={(e) => updateRow(r.id, { unit: e.target.value })} className={cn(CELL, "text-[var(--c-ink-2)]")} />
                        <input
                          aria-label={`Normal range for ${label}`}
                          value={r.range ?? ""}
                          placeholder="Range"
                          onChange={(e) => updateRow(r.id, { range: e.target.value })}
                          className={cn(CELL, "c-num text-[var(--c-ink-2)]")}
                        />
                      </div>
                      <span className="px-1.5">
                        <FlagTag flag={r.flag} />
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${label}`}
                        onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--c-ink-3)] outline-none transition-colors hover:bg-[var(--c-card)] hover:text-[var(--c-ink)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]"
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="rounded-[16px] bg-[var(--c-frame)] px-4 py-4 text-[12.5px] text-[var(--c-ink-2)]">I didn&apos;t find any values on it. Add the ones you see.</p>
          )}
          <button
            type="button"
            onClick={addRow}
            className="mt-2 inline-flex items-center gap-1 rounded-full px-1 py-1 text-[12.5px] text-[var(--c-ink-2)] outline-none hover:text-[var(--c-ink)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]"
          >
            <Plus size={13} aria-hidden /> Add a value I missed
          </button>
        </Section>
      )}

      {/* Medicines */}
      {meds.length > 0 && (
        <Section title="Medicines I read" count={meds.length} right={EDIT_HINT}>
          <ul className="space-y-2">
            {meds.map((m) => (
              <MedicineRow key={m.id} med={m} person={person} onChange={(patch) => updateMed(m.id, patch)} onToggleSlot={(s) => toggleSlot(m, s)} />
            ))}
          </ul>
        </Section>
      )}

      {/* What it says, when there are no values or medicines (scans, letters) */}
      {rows.length === 0 && meds.length === 0 && kind !== "lab" && (
        <Section title="What I read">
          <label className="sr-only" htmlFor="review-summary">
            Summary
          </label>
          <textarea
            id="review-summary"
            value={base.summary}
            onChange={(e) => set({ summary: e.target.value })}
            rows={4}
            placeholder="A short summary of the report"
            className="w-full rounded-[16px] border border-[var(--c-line)] bg-[var(--c-frame)] px-3.5 py-3 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-[var(--c-ink-3)] focus:border-[var(--c-ink)]"
          />
        </Section>
      )}

      {/* What to do */}
      <Section title="What should I do with it?">
        <div className="space-y-2.5">
          {isRx && medsOption}
          <OptionRow checked={opts.save} onChange={opt("save")} title={saveTitle}>
            {saveDesc && <Desc>{saveDesc}</Desc>}
          </OptionRow>
          <OptionRow checked={opts.remember && points.length > 0} onChange={opt("remember")} disabled={!points.length} title="Let Saheli remember it">
            {points.length > 0 ? (
              <>
                <Desc>So she can answer &ldquo;what was my last report?&rdquo; and mention it at the right time. She will remember:</Desc>
                <ul className={cn("mt-2 space-y-1.5", !opts.remember && "opacity-60")}>
                  {points.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-1 rounded-[10px] bg-[var(--c-card)] pl-1 pr-1">
                      <input
                        aria-label={`What Saheli will remember, line ${i + 1}`}
                        value={p.text}
                        onChange={(e) => setPoints((ps) => ps.map((x) => (x.id === p.id ? { ...x, text: e.target.value } : x)))}
                        className={cn(CELL, "py-1.5 text-[12.5px]")}
                      />
                      <button
                        type="button"
                        aria-label={`Don't remember line ${i + 1}`}
                        onClick={() => setPoints((ps) => ps.filter((x) => x.id !== p.id))}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--c-ink-3)] outline-none hover:bg-[var(--c-frame)] hover:text-[var(--c-ink)] focus-visible:ring-2 focus-visible:ring-[var(--c-accent)]"
                      >
                        <X size={13} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Desc>Nothing left for her to remember.</Desc>
            )}
          </OptionRow>
          {!isRx && medsOption}
          {base.nextVisit && (
            <OptionRow checked={opts.nextVisit} onChange={opt("nextVisit")} title="Remind before the next visit">
              <Desc>
                {base.followUps.length ? `Book ${listJoin(base.followUps)} a week before the visit` : "A reminder for you a week before the visit"}
                {visitIso ? ` (${roughly(visitIso)})` : ""}.
              </Desc>
            </OptionRow>
          )}
          <OptionRow checked={opts.notify} onChange={opt("notify")} title="Tell the family on WhatsApp">
            <Desc>{odd ? `${plural(odd, "value")} ${odd === 1 ? "is" : "are"} outside normal. Off by default; Saheli alerts only for red flags.` : "Off by default. Saheli sends the family a short note."}</Desc>
          </OptionRow>
        </div>

        {(problem || error) && (
          <p role="alert" className="mt-3 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">
            {problem || error}
          </p>
        )}

        <div className="mt-4">
          {confirmDiscard ? (
            <ConfirmBar
              text="Discard this report? The file and everything Saheli read from it are deleted. Nothing is kept."
              confirmLabel="Discard"
              busyLabel="Discarding…"
              busy={busy === "discard"}
              onConfirm={onDiscard}
              onCancel={() => setConfirmDiscard(false)}
            />
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button type="button" className={PILL_BUTTON} onClick={onKeepFile} disabled={working}>
                  {busy === "file" ? "Keeping the file…" : "Keep only the file"}
                </button>
                <button type="button" className={PILL_BUTTON} onClick={() => setConfirmDiscard(true)} disabled={working}>
                  <Trash size={15} aria-hidden />
                  Discard
                </button>
              </div>
              <DarkButton onClick={save} disabled={working || nothingChosen} className="justify-between self-stretch sm:self-auto">
                {busy === "save" ? "Saving…" : primary}
              </DarkButton>
            </div>
          )}
          {nothingChosen && !confirmDiscard && <p className="mt-2 text-right text-[12px] text-[var(--c-ink-2)]">Tick at least one thing, or keep only the file.</p>}
        </div>
      </Section>
    </div>
  );
}

function MedicineRow({ med: m, person, onChange, onToggleSlot }: { med: Med; person: RecordPerson; onChange: (patch: Partial<Med>) => void; onToggleSlot: (s: MedicineSlot) => void }) {
  const pron = person.pronouns;
  const strengthField = m.strength != null ? "strength" : "dose";
  const doseValue = (m.strength ?? m.dose) || "";
  const validTimes = m.times.filter(isClock);
  const when = m.instructions || (m.food ? FOOD_LABEL[m.food] : "");
  return (
    <li className="rounded-[16px] bg-[var(--c-frame)] p-3">
      <div className="flex items-start gap-3">
        <TickBox
          checked={m.add && !m.alreadyOnSchedule}
          disabled={m.alreadyOnSchedule}
          onChange={(v) => onChange({ add: v })}
          label={m.alreadyOnSchedule ? `${m.name} is already on the schedule` : `Add ${m.name || "this medicine"} to the schedule`}
          className="mt-[10px]"
        />
        <div className="grid min-w-0 flex-1 grid-cols-2 items-center gap-2 lg:grid-cols-[1.2fr_.8fr_auto_.7fr]">
          <input
            aria-label="Medicine name"
            value={m.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={cn(FIELD, "col-span-2 pr-2.5 font-medium lg:col-span-1")}
          />
          <input
            aria-label={`Dose of ${m.name}`}
            value={doseValue}
            placeholder="Dose"
            onChange={(e) => onChange({ [strengthField]: e.target.value || null } as Partial<Med>)}
            className={cn(FIELD, "pr-2.5")}
          />
          <div className="order-last col-span-2 flex flex-wrap gap-1.5 lg:order-none lg:col-span-1" role="group" aria-label={`When ${m.name} is taken`}>
            {SLOTS.map((s) => {
              const on = validTimes.some((t) => slotOf(t) === s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggleSlot(s.id)}
                  className={cn(
                    "h-[30px] rounded-full px-2.5 text-[11.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--c-accent)] focus-visible:ring-offset-1",
                    on ? "bg-[var(--c-ink)] text-[var(--c-frame)]" : "border border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink-2)] hover:text-[var(--c-ink)]",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <input
              aria-label={`How many days of ${m.name}`}
              inputMode="numeric"
              value={m.durationDays ?? ""}
              placeholder="Days"
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ""));
                onChange({ durationDays: n > 0 ? Math.min(n, 3650) : null });
              }}
              className={cn(FIELD, "pr-12")}
            />
            {m.durationDays != null && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--c-ink-2)]">days</span>}
          </div>
        </div>
      </div>
      <div className="ml-[30px] mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-[var(--c-ink-2)]">
        {m.alreadyOnSchedule ? (
          <span className="flex items-center gap-1 text-[#9a6700] dark:text-[#f5c862]">
            <Info size={13} aria-hidden />
            Already on {pron.possessive} schedule · not added again
          </span>
        ) : (
          <>
            {m.times.map((t, i) => (
              <label key={i} className="inline-flex h-7 items-center rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-2 focus-within:border-[var(--c-ink)]">
                <span className="sr-only">
                  Reminder time {i + 1} for {m.name}
                </span>
                <input
                  type="time"
                  value={t}
                  onChange={(e) => onChange({ times: m.times.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="c-num bg-transparent text-[12px] text-[var(--c-ink)] outline-none"
                />
              </label>
            ))}
            <span className={cn(m.add && !validTimes.length && "text-[#9a6700] dark:text-[#f5c862]")}>
              {[
                when,
                !m.add ? "Not added to the schedule" : validTimes.length ? `Saheli will remind ${pron.object} on WhatsApp` : `Pick a time so Saheli can remind ${pron.object}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </>
        )}
      </div>
    </li>
  );
}
