"use client";

import { ChatCircleDots, Fire, HeartHalf, SealCheck, WarningCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getWellbeing, type Wellbeing } from "@/lib/care-features-api";
import { cn } from "@/lib/utils";
import { ErrorNote, IST, OnWhatsApp, PageHeading, ago, clock, dayWord, parseIst, shortDate } from "./feature-kit";
import { callName, possessive, usePerson } from "./person-context";
import { Panel, PanelTitle, PillTabs } from "./ui";

type Range = "14" | "30";
type Day = Wellbeing["days"][number];

function cellClass(d: Day) {
  if (d.level === "concern") return "bg-[var(--c-accent)]";
  if (d.level === "watch") return "border-2 border-[var(--c-accent)] bg-[var(--c-frame)]";
  return d.talked ? "bg-[var(--c-ink)]" : "bg-[var(--c-line)]";
}
const dayDate = (day: string) => parseIst(day);
const weekday = (day: string) => dayDate(day).toLocaleDateString("en-IN", { weekday: "narrow", timeZone: IST });
const dom = (day: string) => Number(day.slice(8, 10));

export function WellbeingPage() {
  const { familyId, selectedId, selected } = usePerson();
  const [range, setRange] = useState<Range>("14");
  const [result, setResult] = useState<{ key: string; data: Wellbeing | null; error: string } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const key = `${selectedId}:${range}`;
  const self = Boolean(selected?.self);
  const name = callName(selected);

  const load = useCallback(async () => {
    if (!familyId || !selectedId) return;
    try {
      setResult({ key, data: await getWellbeing(familyId, selectedId, Number(range)), error: "" });
    } catch (e) {
      setResult({ key, data: null, error: e instanceof Error ? e.message : "Couldn't load wellbeing" });
    }
  }, [familyId, selectedId, range, key]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const loading = !result || result.key !== key;
  const data = loading ? null : result.data;
  const days = useMemo(() => [...(data?.days ?? [])].sort((a, b) => a.day.localeCompare(b.day)), [data]);
  const moods = useMemo(() => [...(data?.recentMood ?? [])].sort((a, b) => parseIst(b.at).getTime() - parseIst(a.at).getTime()), [data]);
  const concerns = useMemo(() => [...(data?.concerns ?? [])].sort((a, b) => parseIst(b.at).getTime() - parseIst(a.at).getTime()), [data]);
  const shownDay = days.find((d) => d.day === picked) ?? days[days.length - 1];
  const lastHeard = data?.lastHeard ? parseIst(data.lastHeard) : null;
  const dense = days.length > 16;

  return (
    <div className="space-y-4">
      <PageHeading
        light={possessive(selected)}
        dark="Wellbeing"
        sub={
          self
            ? "How you've been, from your chats with Saheli. Every Sunday she sends you a short check-in on WhatsApp."
            : `How ${name || "they"} has been, from conversations with Saheli: when they talked, their mood and anything worth watching.`
        }
        right={
          <PillTabs<Range>
            value={range}
            onChange={(r) => {
              setRange(r);
              setPicked(null);
            }}
            tabs={[
              { id: "14", label: "14 days" },
              { id: "30", label: "30 days" },
            ]}
          />
        }
      />

      {result?.error && !loading && <ErrorNote>{result.error}</ErrorNote>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[200px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr]">
            <Panel accent className="flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">{self ? "Last chat with Saheli" : "Last heard"}</p>
                <ChatCircleDots size={18} weight="fill" className="text-white" />
              </div>
              <p className="c-num mt-6 text-[40px] leading-none text-white sm:text-[44px]">{lastHeard ? ago(lastHeard, now) : "Not yet"}</p>
              <p className="mt-auto pt-6 text-[12px] text-white/80">
                {lastHeard ? `${dayWord(lastHeard, now)} at ${clock(lastHeard)}` : self ? "Say hi to Saheli on WhatsApp" : "No conversation in this period"}
              </p>
            </Panel>
            <Panel className="flex flex-col">
              <PanelTitle title={self ? "Your rhythm" : "Talking with Saheli"} right={<Fire size={18} />} />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div>
                  <p className="c-num text-[44px] leading-none">{data.streak}</p>
                  <p className="mt-1.5 text-[12px] text-[var(--c-ink-2)]">{data.streak === 1 ? "day" : "days"} in a row</p>
                </div>
                <div>
                  <p className="c-num text-[44px] leading-none">
                    {data.daysTalked}
                    <span className="text-[20px] text-[var(--c-ink-3)]">/{days.length || range}</span>
                  </p>
                  <p className="mt-1.5 text-[12px] text-[var(--c-ink-2)]">days talked</p>
                </div>
              </div>
              <div className="mt-auto pt-5">
                <div className="h-1.5 rounded-full bg-[var(--c-frame)]">
                  <div className="h-full rounded-full bg-[var(--c-ink)]" style={{ width: `${days.length ? (data.daysTalked / days.length) * 100 : 0}%` }} />
                </div>
              </div>
            </Panel>
            <Panel className="md:col-span-2 xl:col-span-1">
              <PanelTitle title="Worth a look" right={<WarningCircle size={18} />} />
              {concerns.length === 0 ? (
                <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--c-ink-2)]">
                  <SealCheck size={16} /> Nothing worrying in the last {range} days.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {concerns.slice(0, 4).map((c, i) => (
                    <li key={`${c.at}-${i}`} className="flex items-start gap-3 rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--c-accent)]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-snug">{c.text}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--c-ink-3)]">{dayWord(parseIst(c.at), now)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelTitle title={`The last ${days.length || range} days`} right={<span className="text-[11px] text-[var(--c-ink-3)]">tap a day</span>} />
            <div className={cn("mt-5 flex items-end", dense ? "gap-[3px] sm:gap-1.5" : "gap-1 sm:gap-2")}>
              {days.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setPicked(d.day)}
                  aria-label={`${shortDate(dayDate(d.day))}: ${d.talked ? "talked" : "did not talk"}${d.level !== "info" ? `, ${d.level}` : ""}`}
                  aria-pressed={shownDay?.day === d.day}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2"
                >
                  <span
                    className={cn(
                      "block h-16 w-full max-w-[34px] rounded-[10px] transition-transform sm:h-20",
                      dense && "rounded-[6px]",
                      cellClass(d),
                      shownDay?.day === d.day && "ring-2 ring-[var(--c-ink)] ring-offset-2 ring-offset-[var(--c-card)]",
                    )}
                  />
                  <span className="text-[10px] leading-none text-[var(--c-ink-3)] sm:text-[11px]">{!dense ? weekday(d.day) : ""}</span>
                  <span className={cn("text-[10px] leading-none tabular-nums sm:text-[11px]", shownDay?.day === d.day ? "font-medium text-[var(--c-ink)]" : "text-[var(--c-ink-3)]")}>
                    {!dense || dom(d.day) % 5 === 0 || d === days[days.length - 1] ? dom(d.day) : ""}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[var(--c-ink-2)]">
              {[
                { c: "bg-[var(--c-ink)]", l: "Talked" },
                { c: "bg-[var(--c-line)]", l: "No chat" },
                { c: "border-2 border-[var(--c-accent)] bg-[var(--c-frame)]", l: "Watch" },
                { c: "bg-[var(--c-accent)]", l: "Concern" },
              ].map((x) => (
                <span key={x.l} className="flex items-center gap-1.5">
                  <span className={cn("h-3 w-3 rounded-[4px]", x.c)} /> {x.l}
                </span>
              ))}
            </div>
            {shownDay && (
              <div className="mt-4 rounded-[18px] bg-[var(--c-frame)] p-4">
                <p className="text-[13px] font-medium">
                  {dayWord(dayDate(shownDay.day), now)} · {shownDay.talked ? "talked with Saheli" : "no chat"}
                </p>
                {shownDay.mood.length + shownDay.symptoms.length === 0 ? (
                  <p className="mt-1 text-[12.5px] text-[var(--c-ink-2)]">{shownDay.talked ? "Nothing of note." : `Saheli did not hear from ${self ? "you" : "them"} this day.`}</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {shownDay.mood.map((m) => (
                      <li key={`m-${m}`} className="rounded-full bg-[var(--c-card)] px-3 py-1 text-[12px]">
                        {m}
                      </li>
                    ))}
                    {shownDay.symptoms.map((s) => (
                      <li key={`s-${s}`} className="rounded-full bg-[var(--c-accent-soft)] px-3 py-1 text-[12px] text-[var(--c-accent-soft-ink)]">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelTitle title="Mood over time" right={<HeartHalf size={18} />} />
            {moods.length === 0 ? (
              <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">No mood notes yet. Saheli notes how {self ? "you" : "they"} sound as {self ? "you" : "they"} chat.</p>
            ) : (
              <ol className="relative mt-4 space-y-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-[var(--c-line)]">
                {moods.map((m, i) => {
                  const d = parseIst(m.at);
                  return (
                    <li key={`${m.at}-${i}`} className="relative flex gap-3 pl-6">
                      <span
                        className={cn(
                          "absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[var(--c-card)]",
                          m.level === "info" ? "bg-[var(--c-ink)]" : "bg-[var(--c-accent)]",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] leading-snug">{m.text}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--c-ink-3)]">
                          {dayWord(d, now)}, {clock(d)}
                          {m.level !== "info" ? ` · ${m.level}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </>
      ) : null}

      <OnWhatsApp>
        {self ? <>reply to Saheli&apos;s Sunday check-in, or just tell her &ldquo;feeling tired today&rdquo;.</> : <>ask Saheli &ldquo;How has {name || "Maa"} been this week?&rdquo;</>}
      </OnWhatsApp>
    </div>
  );
}
