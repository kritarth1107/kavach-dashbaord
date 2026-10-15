"use client";

import { useEffect, useState } from "react";
import { getConversations, type ConversationLoop, type ConversationRow, type ConversationsDay } from "@/lib/care-memory-api";

const IST = "Asia/Kolkata";

/** Known nudge kinds. Anything else still shows: the words she sent, then the kind with spaces. */
const KIND_LABEL: Record<string, string> = {
  follow_up: "Follow-up",
  upcoming: "Coming up",
  collect: "Check-in",
  habit: "Habit",
  reflect: "Reflection",
  know: "Something to know",
  delight: "A small note",
  early_bird: "Early hello",
  reminder_followup: "Reminder",
  doses: "Medicine",
  meal: "A meal",
  regular: "A message",
};

const LOOP_LABEL: Record<string, string> = {
  question: "Question",
  followup: "Follow-up",
  confirm_fact: "Needs a yes",
  task: "Task",
  watch: "Watching",
};

const REASON_LABEL: Record<string, string> = {
  window_closed: "the chat was closed",
  talking: "they were already talking",
  busy: "something else was in progress",
  asleep: "quiet hours",
  ladder: "waiting after unanswered messages",
  cadence: "a message already went",
  asked_stop: "they asked her to stop",
  not_delivered: "it did not go out",
};

function words(raw: string): string {
  const t = raw.replace(/_/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? (words(kind) || "A message");
}

function loopLabel(kind: string): string {
  return LOOP_LABEL[kind] ?? (words(kind) || "Open");
}

function reasonLine(reason: string): string {
  if (!reason) return "";
  if (reason.startsWith("waiting:")) return "Reopen template sent";
  if (reason.startsWith("guard:")) return "held back";
  return REASON_LABEL[reason] ?? reason.replaceAll("_", " ");
}

function istParts(iso: string | null | undefined): { day: string; time: string } | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const when = new Date(t);
  const day = when.toLocaleDateString("en-CA", { timeZone: IST });
  const time = when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return { day, time };
}

function shiftDay(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00+05:30`) + n * 86_400_000).toLocaleDateString("en-CA", { timeZone: IST });
}

/** A time on the day being viewed, "yesterday, 14:00", or a short date. Never "Invalid Date". */
function sincePhrase(iso: string | null | undefined, day: string): string {
  const p = istParts(iso);
  if (!p) return "";
  if (p.day === day) return p.time;
  if (p.day === shiftDay(day, -1)) return `yesterday, ${p.time}`;
  const t = Date.parse(iso || "");
  const date = new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST });
  return /^\d/.test(date) ? `${date}, ${p.time}` : p.time;
}

function rowTitle(row: ConversationRow): string {
  if (row.kind in KIND_LABEL) return KIND_LABEL[row.kind];
  return row.text || kindLabel(row.kind);
}

function rowSaid(row: ConversationRow): string {
  if (!(row.kind in KIND_LABEL)) return "";
  return row.text && row.text !== KIND_LABEL[row.kind] ? row.text : "";
}

function rowState(row: ConversationRow): { label: string; tone: "yes" | "wait" | "plain" } {
  if (row.repliedAt) return { label: "Answered", tone: "yes" };
  if (String(row.reason || "").startsWith("waiting:")) return { label: "Waiting", tone: "wait" };
  if (row.status === "sent") return { label: "Waiting", tone: "wait" };
  if (row.status === "planned") return { label: "Planned", tone: "plain" };
  if (row.status === "skipped" || row.status === "failed" || row.status === "shadow") return { label: "Not sent", tone: "plain" };
  return { label: row.status ? words(row.status) : "Not sent", tone: "plain" };
}

function rowMeta(row: ConversationRow): string {
  if (row.repliedAt) {
    const time = istParts(row.repliedAt)?.time;
    const quote = row.reply ? ` · “${row.reply}”` : "";
    return `${time ? `Answered ${time}` : "Answered"}${quote}`;
  }
  if (String(row.reason || "").startsWith("waiting:")) return "Reopen template sent";
  if (row.status === "planned") return "Planned · not sent yet";
  if (row.status === "sent") return "Waiting";
  const why = reasonLine(row.reason);
  if (row.status === "skipped" || row.status === "failed" || !row.status) return why ? `Not sent · ${why}` : "Not sent";
  return why || words(row.status);
}

function loopMeta(loop: ConversationLoop, day: string): string {
  const label = loopLabel(loop.kind);
  const wake = istParts(loop.wakeAt);
  if (wake && loop.wakeAt && Date.parse(loop.wakeAt) >= Date.parse(`${day}T00:00:00+05:30`)) {
    return `${label} · asks again ${wake.day === day ? wake.time : sincePhrase(loop.wakeAt, day)}`;
  }
  const since = sincePhrase(loop.since, day);
  return since ? `${label} · since ${since}` : `${label} · still open`;
}

function windowCopy(open: boolean, name: string, last: string | null, templateAt: string | null, day: string): string {
  const who = name || "They";
  const self = who === "You";
  if (!open) {
    const when = sincePhrase(last, day);
    let line = when ? `${who} ${self ? "haven't" : "hasn't"} replied since ${when}.` : "WhatsApp is closed. No reply yet.";
    const at = istParts(templateAt)?.time;
    if (templateAt) line += at ? ` Saheli sent a reopen template at ${at}. Waiting.` : " Saheli sent a reopen template. Waiting.";
    return line;
  }
  const time = istParts(last);
  if (time && time.day === day) return `${who} replied at ${time.time}. Saheli can message in the chat.`;
  const when = sincePhrase(last, day);
  return when ? `Last reply ${when}. Saheli can message in the chat.` : "WhatsApp is open. Saheli can message in the chat.";
}

function mineOf(data: ConversationsDay | null, subjectId: string): ConversationsDay | null {
  if (!data) return null;
  if (data.personId && data.personId !== subjectId) {
    return { ...data, started: [], loops: [], template: null, window: { open: true, lastInboundAt: null, answeredToday: false } };
  }
  return {
    ...data,
    started: (data.started ?? []).filter((r) => !r.personId || r.personId === subjectId),
    loops: (data.loops ?? []).filter((l) => !l.subjectId || l.subjectId === subjectId),
  };
}

export function ConversationsToday({ familyId, subjectId, day, name }: { familyId: string; subjectId: string; day: string; name: string }) {
  const [data, setData] = useState<ConversationsDay | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState("");
  const key = `${familyId}|${subjectId}|${day}|${tick}`;

  useEffect(() => {
    if (!familyId || !subjectId) return;
    let live = true;
    getConversations(familyId, subjectId, day)
      .then((d) => {
        if (!live) return;
        setData(d);
        setError(false);
        setLoaded(key);
      })
      .catch(() => {
        if (!live) return;
        setError(true);
        setLoaded(key);
      });
    return () => {
      live = false;
    };
  }, [familyId, subjectId, day, tick, key]);

  const state = loaded !== key ? "loading" : error ? "error" : "ready";

  const mine = mineOf(data, subjectId);
  const answered = Boolean(mine?.window.answeredToday) || (mine?.started ?? []).some((r) => istParts(r.repliedAt)?.day === day);
  // An answer on this day opens the window, even if a stale closed flag arrived with it.
  const open = state === "ready" && (answered || Boolean(mine?.window.open));
  const template = open || !mine?.template || !String(mine.template.reason || "").startsWith("waiting:") ? null : mine.template;
  const started = mine?.started ?? [];
  const loops = mine?.loops ?? [];
  const about = name === "You" ? "you" : name || "them";
  const answeredWord = name === "You" ? "you" : name || "they";

  return (
    <section data-testid="saheli-conversations" className="space-y-3" aria-label="Saheli's conversations">
      <div>
        <h2 className="text-[22px] font-medium tracking-[-0.03em]">Saheli&apos;s conversations</h2>
        <p className="mt-1 max-w-[62ch] text-[14px] leading-snug text-[var(--c-ink-2)]">
          About {about}. What Saheli started, whether {answeredWord} answered, and what is still open.
        </p>
      </div>

      {state === "loading" && <p className="text-[13px] text-[var(--c-ink-3)]">Loading conversations…</p>}

      {state === "error" && (
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-frame)] px-4 py-3">
          <p className="text-[14px]">Couldn&apos;t load Saheli&apos;s conversations.</p>
          <button type="button" onClick={() => setTick((n) => n + 1)} className="mt-2 text-[13px] font-medium text-[var(--c-ink)] underline">
            Try again
          </button>
        </div>
      )}

      {state === "ready" && (
        <>
          <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-frame)] px-4 py-3">
            <span
              data-testid="conversations-window"
              className={
                open
                  ? "inline-flex rounded-full bg-[var(--c-ok-soft)] px-2 py-[3px] text-[11px] font-medium text-[var(--c-ok-ink)]"
                  : "inline-flex rounded-full bg-[var(--c-accent)] px-2 py-[3px] text-[11px] font-medium text-[var(--c-accent-ink)]"
              }
            >
              {open ? "Window open" : "Window closed"}
            </span>
            <p className="mt-2 text-[15px] leading-snug">{windowCopy(open, name, mine?.window.lastInboundAt ?? null, template ? template.at : null, day)}</p>
          </div>

          {started.length === 0 && loops.length === 0 ? (
            <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-frame)] px-4 py-4">
              <p className="text-[15px] font-medium">Nothing started today</p>
              <p className="mt-1 max-w-[62ch] text-[13px] leading-snug text-[var(--c-ink-2)]">
                Greetings, check-ins and questions show up here with the time and whether {answeredWord} answered. A closed WhatsApp window says so. A reopen template shows only when one was sent.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-[var(--c-line)] bg-[var(--c-frame)]">
                <h3 className="flex items-center gap-2 px-4 py-3 text-[15px] font-medium">
                  <span className="h-2 w-2 rounded-full bg-[var(--c-solid)]" /> What she started
                </h3>
                {started.length === 0 && <p className="border-t border-[var(--c-line)] px-4 py-3 text-[13px] text-[var(--c-ink-2)]">Nothing started today</p>}
                {started.map((row) => {
                  const st = rowState(row);
                  const said = rowSaid(row);
                  return (
                    <div key={row.id} className="flex items-start gap-3 border-t border-[var(--c-line)] px-4 py-3">
                      <div className="w-12 shrink-0 pt-0.5 text-[13px] tabular-nums text-[var(--c-ink-2)]">{istParts(row.at)?.time || "—"}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium">{rowTitle(row)}</div>
                        {said && <div className="mt-0.5 text-[13px] text-[var(--c-ink-2)]">{said}</div>}
                        <div className="mt-0.5 text-[12px] text-[var(--c-ink-3)]">{rowMeta(row)}</div>
                      </div>
                      <span
                        className={
                          st.tone === "yes"
                            ? "shrink-0 rounded-full bg-[var(--c-ok-soft)] px-2 py-[3px] text-[11px] font-medium text-[var(--c-ok-ink)]"
                            : st.tone === "wait"
                              ? "shrink-0 rounded-full bg-[var(--c-accent)] px-2 py-[3px] text-[11px] font-medium text-[var(--c-accent-ink)]"
                              : "shrink-0 rounded-full bg-[var(--c-chip)] px-2 py-[3px] text-[11px] font-medium text-[var(--c-ink-2)]"
                        }
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {loops.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-[var(--c-line)] bg-[var(--c-frame)]">
                  <h3 className="flex items-center gap-2 px-4 py-3 text-[15px] font-medium">
                    <span className="h-2 w-2 rounded-full bg-[var(--c-solid)]" /> Following up
                  </h3>
                  {loops.map((loop) => (
                    <div key={loop.id} className="flex items-start gap-3 border-t border-[var(--c-line)] px-4 py-3">
                      <div className="w-12 shrink-0 pt-0.5 text-[12px] text-[var(--c-ink-3)]">Open</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium">{loop.title || "Something still open"}</div>
                        <div className="mt-0.5 text-[12px] text-[var(--c-ink-3)]">{loopMeta(loop, day)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
