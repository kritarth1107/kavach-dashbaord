"use client";

/**
 * Saheli reminders on the Day page (founder 2026-10-12): every reminder that is not a medicine, in its own words, at its
 * times, with what happened to each; skip one time, change the time or stop it here (or by telling Saheli on WhatsApp).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Alarm, ArrowsClockwise, CheckCircle, Prohibit, SkipForward, X } from "@phosphor-icons/react";
import {
  changeReminder,
  deliveryTicks,
  getReminderDay,
  listReminders,
  skipReminder,
  stopReminder,
  WEEKDAYS,
  type Reminder,
  type ReminderDay,
  type ReminderOccurrence,
} from "@/lib/reminders-api";
import { cn } from "@/lib/utils";
import { Panel, PanelTitle, SmallButton, Tag } from "./ui";

const IST = "Asia/Kolkata";

export const STATUS_WORD: Record<ReminderOccurrence["status"], string> = {
  scheduled: "Scheduled",
  sent: "Sent",
  failed: "Not delivered",
  not_sent: "Not sent",
  skipped: "Skipped",
  done: "Already done",
};

/** WhatsApp's ticks for a sent reminder, as WhatsApp draws them: ✓ sent, ✓✓ delivered, ✓✓ in blue once read. */
export function Ticks({ delivery }: { delivery?: ReminderOccurrence["delivery"] }) {
  const t = deliveryTicks(delivery);
  if (!t || !t.ticks) return null;
  return (
    <span title={`WhatsApp: ${t.word}`} aria-label={`WhatsApp: ${t.word}`} className={cn("ml-1 font-semibold tracking-[-0.12em]", t.read ? "text-[#34b7f1]" : "text-[var(--c-ink-3)]")}>
      {t.ticks}
    </span>
  );
}

/** "sent ✓✓ read" for places that hold plain text. */
export function deliveryText(o: Pick<ReminderOccurrence, "status" | "delivery">): string {
  const t = deliveryTicks(o.delivery);
  if (o.status !== "sent" || !t) return o.status === "sent" ? " ✓" : "";
  return t.ticks ? ` ${t.ticks}${t.word === "sent" ? "" : ` ${t.word}`}` : ` (${t.word})`;
}

export function dayWord(day: string, today: string): string {
  if (day === today) return "today";
  const t = new Date(`${today}T12:00:00+05:30`);
  t.setUTCDate(t.getUTCDate() + 1);
  if (day === t.toLocaleDateString("en-CA", { timeZone: IST })) return "tomorrow";
  return new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: IST });
}

/** The day's reminder times with their status, refreshed with the page. */
export function useReminderDay(familyId: string | null, subjectId: string | null, day: string, pollMs = 0) {
  const [data, setData] = useState<ReminderDay | null>(null);
  const [tick, setTick] = useState(0);
  const req = useRef(0);
  useEffect(() => {
    if (!familyId || !subjectId) return;
    const id = ++req.current;
    getReminderDay(familyId, subjectId, day)
      .then((d) => id === req.current && setData(d))
      .catch(() => id === req.current && setData((cur) => (cur && cur.day === day ? cur : { day, occurrences: [], reminders: [] })));
  }, [familyId, subjectId, day, tick]);
  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => setTick((n) => n + 1), pollMs);
    return () => clearInterval(t);
  }, [pollMs]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data: data && data.day === day ? data : null, reload };
}

export function useAllReminders(familyId: string | null, subjectId: string | null, tick: number) {
  const [rows, setRows] = useState<Reminder[] | null>(null);
  useEffect(() => {
    if (!familyId || !subjectId) return;
    let live = true;
    listReminders(familyId, subjectId, true)
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [familyId, subjectId, tick]);
  return rows;
}

type Act = { familyId: string; subjectId: string; onDone: () => void };

function useActions({ familyId, subjectId, onDone }: Act) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const run = async (key: string, fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(key);
    setErr("");
    try {
      await fn();
      onDone();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work. Try again.");
      return false;
    } finally {
      setBusy("");
    }
  };
  return {
    busy,
    err,
    skip: (r: Reminder, opts: { day?: string; time?: string; undo?: boolean } = {}) =>
      run(`skip:${r.reminderId}`, () => skipReminder(familyId, subjectId, r.reminderId, opts)),
    stop: (r: Reminder) => run(`stop:${r.reminderId}`, () => stopReminder(familyId, subjectId, r.reminderId)),
    change: (r: Reminder, change: Parameters<typeof changeReminder>[3]) =>
      run(`change:${r.reminderId}`, () => changeReminder(familyId, subjectId, r.reminderId, change)),
  };
}

/** The confirm before a stop: what stops, and that nothing already sent is lost. */
function StopDialog({ reminder, onCancel, onStop, busy }: { reminder: Reminder; onCancel: () => void; onStop: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="stop-title">
      <div className="w-full max-w-[440px] rounded-[22px] bg-[var(--c-frame)] p-6 shadow-xl">
        <h3 id="stop-title" className="text-[19px] font-medium tracking-[-0.01em]">Stop this reminder?</h3>
        <p className="mt-3 text-[14px] font-medium">{reminder.text}</p>
        <p className="mt-0.5 text-[12px] text-[var(--c-ink-2)]">
          {reminder.schedule}
          {reminder.next ? ` · next would be ${new Date(`${reminder.next.day}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: IST })}` : ""}
        </p>
        <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">No more reminders from now. What was already sent stays in the history. To start it again, ask Saheli or set it again.</p>
        <div className="mt-5 flex justify-end gap-2">
          <SmallButton onClick={onCancel}>Keep it</SmallButton>
          <button
            type="button"
            disabled={busy}
            onClick={onStop}
            className="inline-flex h-8 items-center rounded-full bg-[#b4232a] px-3.5 text-[12px] font-medium text-white disabled:opacity-50"
          >
            {busy ? "Stopping…" : "Stop reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Change the time(s), the days, the date or the end date; what is left out stays. */
function ChangeEditor({ reminder, onSave, onCancel, busy }: { reminder: Reminder; onSave: (c: Parameters<typeof changeReminder>[3]) => void; onCancel: () => void; busy: boolean }) {
  const hourly = reminder.kind === "hourly_window";
  const toHm = (m: number | null) => (m == null ? "" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  const [times, setTimes] = useState<string[]>(reminder.times.length ? reminder.times : ["09:00"]);
  const [from, setFrom] = useState(toHm(reminder.windowStartMinutes));
  const [to, setTo] = useState(toHm(reminder.windowEndMinutes));
  const [days, setDays] = useState<number[]>(reminder.daysOfWeek);
  const [date, setDate] = useState(reminder.date ?? "");
  const [until, setUntil] = useState(reminder.endDate ?? "");
  const input = "h-8 rounded-[10px] border border-[var(--c-line)] bg-[var(--c-frame)] px-2 text-[12.5px]";
  return (
    <div className="mt-3 space-y-3 rounded-[14px] border border-[var(--c-line)] p-3">
      {hourly ? (
        <div className="flex items-center gap-2 text-[12px]">
          Every hour from <input aria-label="From" type="time" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
          to <input aria-label="To" type="time" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <input aria-label={`Time ${i + 1}`} type="time" className={input} value={t} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} />
              {times.length > 1 && (
                <button type="button" aria-label="Remove time" className="text-[var(--c-ink-3)] hover:text-[var(--c-ink)]" onClick={() => setTimes(times.filter((_, j) => j !== i))}>
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          <button type="button" className="text-[12px] text-[var(--c-ink-2)] underline" onClick={() => setTimes([...times, "12:00"])}>
            add a time
          </button>
        </div>
      )}
      {reminder.repeat === "weekly" && (
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
              className={cn("h-7 rounded-full px-2.5 text-[11.5px]", days.includes(d) ? "bg-[var(--c-solid)] text-white" : "border border-[var(--c-line)] bg-[var(--c-frame)]")}
            >
              {WEEKDAYS[d]}
            </button>
          ))}
        </div>
      )}
      {reminder.repeat === "once" ? (
        <label className="flex items-center gap-2 text-[12px]">
          On <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      ) : (
        <label className="flex items-center gap-2 text-[12px]">
          Until <input type="date" className={input} value={until} onChange={(e) => setUntil(e.target.value)} />
          <span className="text-[var(--c-ink-3)]">(optional)</span>
        </label>
      )}
      <div className="flex justify-end gap-2">
        <SmallButton onClick={onCancel}>Cancel</SmallButton>
        <SmallButton
          dark
          disabled={busy}
          onClick={() =>
            onSave({
              ...(hourly ? { windowStart: from, windowEnd: to } : { times: times.filter(Boolean) }),
              ...(reminder.repeat === "weekly" ? { days } : {}),
              ...(reminder.repeat === "once" ? { date } : { endDate: until || null }),
            })
          }
        >
          {busy ? "Saving…" : "Save"}
        </SmallButton>
      </div>
    </div>
  );
}

/** The side panel for one reminder picked on the calendar. */
export function ReminderDetail({
  reminder,
  occurrences,
  day,
  today,
  personWord,
  familyId,
  subjectId,
  onDone,
  onClose,
}: {
  reminder: Reminder;
  occurrences: ReminderOccurrence[];
  day: string;
  today: string;
  personWord: string;
  familyId: string;
  subjectId: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const a = useActions({ familyId, subjectId, onDone });
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const mine = occurrences.filter((o) => o.reminderId === reminder.reminderId);
  const active = reminder.status === "active";
  const sentNow = mine.filter((o) => o.status === "sent");
  const upcomingHere = mine.find((o) => o.status === "scheduled");
  const skippedHere = mine.find((o) => o.status === "skipped");
  return (
    <Panel>
      <PanelTitle title="Reminder" right={<button type="button" aria-label="Close" onClick={onClose} className="text-[var(--c-ink-3)] hover:text-[var(--c-ink)]"><X size={14} /></button>} />
      <div className="mt-3 rounded-[16px] bg-[var(--c-frame)] p-3.5">
        <p className="text-[15px] font-medium leading-snug">{reminder.text}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Tag tone="dark">{reminder.schedule}</Tag>
          {!active && <Tag tone="light">{reminder.status === "completed" ? "Finished" : "Stopped"}</Tag>}
        </div>
        <dl className="mt-3 grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          <dt className="text-[var(--c-ink-2)]">For</dt>
          <dd className="font-medium">{personWord}</dd>
          {reminder.createdAt && (
            <>
              <dt className="text-[var(--c-ink-2)]">Set</dt>
              <dd className="font-medium">{new Date(reminder.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST })}</dd>
            </>
          )}
          <dt className="text-[var(--c-ink-2)]">{day === today ? "Today" : dayWord(day, today)}</dt>
          <dd className="font-medium">
            {mine.length ? (
              <>
                {mine.slice(0, 6).map((o, i) => (
                  <span key={o.time}>
                    {i > 0 && " · "}
                    {o.time} {(STATUS_WORD[o.status] ?? String(o.status).replace(/_/g, " ")).toLowerCase()}
                    {o.status === "sent" && <Ticks delivery={o.delivery ?? "sent"} />}
                  </span>
                ))}
                {mine.length > 6 ? ` · +${mine.length - 6}` : ""}
              </>
            ) : (
              "nothing this day"
            )}
          </dd>
          {active && (
            <>
              <dt className="text-[var(--c-ink-2)]">Next</dt>
              <dd className="font-medium">{reminder.next ? `${dayWord(reminder.next.day, today)}, ${reminder.next.time}` : "nothing left to send"}</dd>
            </>
          )}
        </dl>
        {active && !editing && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {skippedHere ? (
                <SmallButton icon={ArrowsClockwise} disabled={!!a.busy} onClick={() => a.skip(reminder, { day, time: skippedHere.time, undo: true })}>
                  Undo skip ({skippedHere.time})
                </SmallButton>
              ) : upcomingHere ? (
                <SmallButton icon={SkipForward} disabled={!!a.busy} onClick={() => a.skip(reminder, { day, time: upcomingHere.time })}>
                  Skip {day === today ? "today's" : "this"} {upcomingHere.time}
                </SmallButton>
              ) : reminder.next ? (
                <SmallButton icon={SkipForward} disabled={!!a.busy} onClick={() => a.skip(reminder, { day: reminder.next!.day, time: reminder.next!.time })}>
                  Skip {dayWord(reminder.next.day, today)}&apos;s
                </SmallButton>
              ) : null}
              <SmallButton icon={Alarm} onClick={() => setEditing(true)}>
                Change time
              </SmallButton>
            </div>
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-[#f0c4c6] bg-[var(--c-frame)] text-[12px] font-medium text-[#b4232a] hover:bg-[#fff5f5]"
            >
              <Prohibit size={14} weight="bold" /> Stop this reminder
            </button>
          </>
        )}
        {editing && <ChangeEditor reminder={reminder} busy={!!a.busy} onCancel={() => setEditing(false)} onSave={(c) => a.change(reminder, c).then((ok) => ok && setEditing(false))} />}
        {a.err && <p className="mt-2 text-[12px] text-[#b4232a]">{a.err}</p>}
        {sentNow.length > 0 && (
          <p className="mt-2 flex items-center gap-1 text-[11.5px] text-[var(--c-ink-2)]">
            <CheckCircle size={12} weight="fill" />
            {sentNow.some((o) => o.delivery === "read") ? "Read on WhatsApp" : sentNow.some((o) => o.delivery === "delivered") ? "Delivered on WhatsApp (not read yet)" : "Sent on WhatsApp"}
          </p>
        )}
        <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--c-ink-2)]">Same on WhatsApp: tell Saheli &quot;skip it tomorrow&quot;, &quot;change it to 7 pm&quot; or &quot;stop this reminder&quot;.</p>
      </div>
      {confirm && <StopDialog reminder={reminder} busy={!!a.busy} onCancel={() => setConfirm(false)} onStop={() => a.stop(reminder).then((ok) => ok && setConfirm(false))} />}
    </Panel>
  );
}

/** Every reminder of the person: what, when, the next time, skip / change / stop. */
export function AllReminders({ rows, today, familyId, subjectId, onDone, onPick }: { rows: Reminder[] | null; today: string; familyId: string; subjectId: string; onDone: () => void; onPick: (r: Reminder) => void }) {
  const a = useActions({ familyId, subjectId, onDone });
  const [confirm, setConfirm] = useState<Reminder | null>(null);
  const [showOld, setShowOld] = useState(false);
  if (!rows) return <p className="px-5 py-6 text-[13px] text-[var(--c-ink-3)]">Loading reminders…</p>;
  const active = rows.filter((r) => r.status === "active");
  const old = rows.filter((r) => r.status !== "active");
  const row = (r: Reminder) => (
    <li key={r.reminderId} className={cn("grid grid-cols-[minmax(150px,0.9fr)_minmax(200px,2fr)_minmax(110px,0.8fr)_auto] items-center gap-3 rounded-[14px] bg-[var(--c-frame)] px-4 py-3", r.status !== "active" && "opacity-70")}>
      <span className="text-[12.5px] font-medium">{r.schedule}</span>
      <button type="button" className="text-left text-[13px] font-medium hover:underline" onClick={() => onPick(r)}>
        {r.text}
      </button>
      <span className="text-[12px] text-[var(--c-ink-2)]">
        {r.status === "active" ? (r.next ? `${dayWord(r.next.day, today)} ${r.next.time}` : "nothing left") : r.status === "completed" ? "finished" : "stopped"}
      </span>
      <span className="flex justify-end gap-3 whitespace-nowrap text-[12px] font-medium">
        {r.status === "active" && r.next && r.repeat !== "once" && (
          <button type="button" disabled={!!a.busy} onClick={() => a.skip(r, { day: r.next!.day, time: r.next!.time })} className="hover:underline disabled:opacity-40">
            Skip next
          </button>
        )}
        {r.status === "active" && (
          <button type="button" onClick={() => setConfirm(r)} className="text-[#b4232a] hover:underline">
            {r.repeat === "once" ? "Cancel" : "Stop"}
          </button>
        )}
      </span>
    </li>
  );
  return (
    <div className="p-4">
      {active.length === 0 ? (
        <p className="px-1 py-6 text-[13px] text-[var(--c-ink-2)]">No reminders yet. Tell Saheli on WhatsApp what to remind about and when; they appear here.</p>
      ) : (
        <ul className="space-y-2">{active.map(row)}</ul>
      )}
      {a.err && <p className="mt-2 text-[12px] text-[#b4232a]">{a.err}</p>}
      <p className="mt-3 px-1 text-[12px] text-[var(--c-ink-2)]">
        {old.length > 0 && (
          <button type="button" className="underline" onClick={() => setShowOld(!showOld)}>
            Stopped and finished ({old.length})
          </button>
        )}
        {old.length > 0 ? " · " : ""}Medicine reminders follow the medicine: change or stop them on the Medicines page.
      </p>
      {showOld && <ul className="mt-2 space-y-2">{old.map(row)}</ul>}
      {confirm && <StopDialog reminder={confirm} busy={!!a.busy} onCancel={() => setConfirm(null)} onStop={() => a.stop(confirm).then((ok) => ok && setConfirm(null))} />}
    </div>
  );
}
