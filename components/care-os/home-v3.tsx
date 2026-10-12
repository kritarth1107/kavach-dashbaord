"use client";
/**
 * Home, reimagined (founder 2026-10-13): led by how the person is today, built only from what Kavach knows about them
 * (no medicine panel without medicines), habits shown as good things with streaks rather than reminders, and a gentle
 * ask for what Saheli does not know yet.
 */

import {
  ArrowRight,
  Barbell,
  Bed,
  Briefcase,
  ChatCircleDots,
  CheckCircle,
  CloudRain,
  CloudSun,
  FirstAid,
  Fire,
  ForkKnife,
  HandHeart,
  Heartbeat,
  House,
  type Icon as PhosphorIcon,
  Lightbulb,
  PaintBrush,
  Phone,
  Prohibit,
  Sparkle,
  Sun,
  UsersThree,
  WhatsappLogo,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { CareHomeSummary, GapKey, Portrait, PortraitActivity, VitalSummary } from "@/lib/care-memory-api";
import { cn } from "@/lib/utils";
import { telHref } from "./care-kit";
import { cap, PersonPhoto, Ring } from "./portrait-kit";
import { ServiceLogo } from "./service-logo";
import { Panel, PanelTitle, SmallButton, Tag } from "./ui";

const IST = "Asia/Kolkata";
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
const istHour = () => Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: IST }));
const todayIst = () => new Date().toLocaleDateString("en-CA", { timeZone: IST });

function ago(iso: string | null): string | null {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} d ago`;
}

export type HomeV3Person = { id: string; name: string; callAs: string; self: boolean; photo?: string | null; phone?: string | null };

type Tone = "bright" | "steady" | "low" | "unknown";
const toneOf = (score?: number | null): Tone => (!score ? "unknown" : score >= 4 ? "bright" : score === 3 ? "steady" : "low");
const TONE: Record<Tone, { panel: string; chip: string; icon: PhosphorIcon }> = {
  bright: { panel: "bg-[var(--c-ok-soft)]", chip: "bg-[var(--c-frame)] text-[var(--c-ok-ink)]", icon: Sun },
  steady: { panel: "bg-[var(--c-card)]", chip: "bg-[var(--c-frame)] text-[var(--c-ink-2)]", icon: CloudSun },
  low: { panel: "bg-[var(--c-accent-soft)]", chip: "bg-[var(--c-frame)] text-[var(--c-accent-soft-ink)]", icon: CloudRain },
  unknown: { panel: "bg-[var(--c-card)]", chip: "bg-[var(--c-frame)] text-[var(--c-ink-2)]", icon: ChatCircleDots },
};

function waLink(number: string | null, text: string) {
  const n = (number || "").replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

export function HomeV3({
  person,
  me,
  home,
  portrait,
  saheliSays,
  kavachNumber,
  onDecide,
  busy,
}: {
  person: HomeV3Person;
  me: string;
  home: CareHomeSummary;
  portrait: Portrait | null;
  saheliSays: string | null;
  kavachNumber: string | null;
  onDecide: (id: string, approve: boolean) => void;
  busy: string | null;
}) {
  const acts = (portrait?.activities ?? []).filter((a) => !a.paused);
  const habits = acts.filter((a) => a.kind !== "routine");
  const routines = acts.filter((a) => a.kind === "routine");
  const vitals = (Object.entries(home.vitals) as Array<[string, VitalSummary]>).filter(([, v]) => v);
  const moduleCount = [home.doses.length, habits.length, vitals.length, home.followUps.length, home.tasks.length, home.timeline.length].filter(Boolean).length;
  const ask = person.self ? "" : `How is ${person.callAs} today?`;

  return (
    <div className="space-y-4">
      <MoodHero person={person} me={me} home={home} portrait={portrait} saheliSays={saheliSays} habits={habits} askHref={waLink(kavachNumber, ask)} />

      {home.needsYou.length > 0 && <NeedsYou items={home.needsYou} onDecide={onDecide} busy={busy} />}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {habits.length > 0 && <Habits person={person} habits={habits} routines={routines} />}
          {vitals.length > 0 && <Readings person={person} vitals={vitals} />}
          {home.timeline.length > 0 && <Timeline items={home.timeline} />}
          {moduleCount === 0 && <QuietDay person={person} askHref={waLink(kavachNumber, person.self ? "Hi Saheli" : `Hi Saheli, please check on ${person.callAs}`)} />}
        </div>
        <div className="space-y-4 lg:col-span-5">
          {home.doses.length > 0 && <Medicines person={person} home={home} />}
          {home.followUps.length > 0 && <ComingUp items={home.followUps} />}
          {home.tasks.length > 0 && <Errands tasks={home.tasks} />}
          {portrait?.gaps && <KnowMore person={person} gaps={portrait.gaps} kavachNumber={kavachNumber} />}
        </div>
      </div>
    </div>
  );
}

/* ── hero: how they are today ─────────────────────────────────────────────── */

function MoodHero({
  person,
  me,
  home,
  portrait,
  saheliSays,
  habits,
  askHref,
}: {
  person: HomeV3Person;
  me: string;
  home: CareHomeSummary;
  portrait: Portrait | null;
  saheliSays: string | null;
  habits: PortraitActivity[];
  askHref: string | null;
}) {
  const mood = home.mood;
  const tone = toneOf(mood?.score);
  const T = TONE[tone];
  const h = istHour();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const word = mood?.word?.toLowerCase();
  const heardToday = !!home.lastHeardAt && new Date(home.lastHeardAt).toLocaleDateString("en-CA", { timeZone: IST }) === todayIst();
  const headline = word
    ? person.self
      ? `You seem ${word} today`
      : `${person.callAs} seems ${word} today`
    : heardToday
      ? person.self
        ? "Saheli has been with you today"
        : `${person.callAs} has been chatting with Saheli`
      : person.self
        ? "Saheli hasn't heard from you today"
        : `No word from ${person.callAs} yet today`;
  const lowLine = person.self
    ? "Go easy on yourself today. Saheli will check in gently, and you can always just talk to her."
    : `A short call from you would mean a lot today.`;
  const best = [...habits].sort((a, b) => b.streak - a.streak)[0];
  return (
    <section className={cn("rounded-[28px] p-5 sm:p-7", T.panel)} aria-label="How they are today">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
        <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
          <PersonPhoto name={person.name} src={person.photo} rounded="rounded-[20px] sm:rounded-[26px]" className="h-[60px] w-[60px] sm:h-[108px] sm:w-[108px]" text={24} />
          <div className="min-w-0">
            <p className="text-[13px] text-[var(--c-ink-2)]">
              {greeting}
              {me ? `, ${me}` : ""}
            </p>
            <h1 className="mt-1 text-[30px] font-medium leading-[1.08] tracking-[-0.03em] sm:text-[38px]">{headline}</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--c-ink-2)]">
              {mood?.summary || saheliSays || (person.self ? "Tell Saheli how your day is going on WhatsApp." : `Saheli will check in with ${person.callAs}.`)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {mood && (
                <span className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium", T.chip)}>
                  <T.icon size={15} weight="fill" aria-hidden />
                  {cap(mood.word || "mood")} · {hm(mood.at)}
                </span>
              )}
              {home.lastHeardAt && (
                <span className="inline-flex h-8 items-center rounded-full bg-[var(--c-frame)] px-3 text-[12.5px] text-[var(--c-ink-2)]">
                  Last heard {ago(home.lastHeardAt)}
                </span>
              )}
              {best && best.streak >= 2 && (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--c-frame)] px-3 text-[12.5px] text-[var(--c-ink-2)]">
                  <Fire size={14} weight="fill" className="text-[var(--c-accent)]" aria-hidden />
                  {best.label} · {best.streak} in a row
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <MoodWeek days={portrait?.mood.days ?? []} />
          <div className="mt-4 flex flex-wrap gap-2">
            {askHref && (
              <a
                href={askHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--c-solid)] px-4 text-[13px] font-medium text-[var(--c-on-solid)] transition-opacity hover:opacity-90"
              >
                <WhatsappLogo size={16} weight="fill" aria-hidden />
                Ask Saheli
              </a>
            )}
            {!person.self && person.phone && (
              <a
                href={telHref(person.phone)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[13px] font-medium transition-colors hover:bg-[var(--c-card)]"
              >
                <Phone size={15} weight="fill" aria-hidden />
                Call {person.callAs}
              </a>
            )}
            <Link
              href={`/dashboard/saheli?recipient=${person.id}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-4 text-[13px] font-medium transition-colors hover:bg-[var(--c-card)]"
            >
              Full day
              <ArrowRight size={13} weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
      {tone === "low" && (
        <p className="mt-5 flex items-start gap-2.5 rounded-[18px] bg-[var(--c-frame)] px-4 py-3 text-[13.5px]">
          <HandHeart size={18} weight="fill" className="mt-0.5 shrink-0 text-[var(--c-accent)]" aria-hidden />
          {lowLine}
        </p>
      )}
    </section>
  );
}

/** The last seven days of mood as short bars (taller is better), today last. */
function MoodWeek({ days }: { days: Array<{ day?: string; score: number | null; word: string | null }> }) {
  const byDay = new Map(days.filter((d) => d.day).map((d) => [d.day!, d]));
  const now = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86_400_000);
    const key = d.toLocaleDateString("en-CA", { timeZone: IST });
    return { key, label: d.toLocaleDateString("en-IN", { weekday: "narrow", timeZone: IST }), mood: byDay.get(key) };
  });
  const any = week.some((w) => w.mood?.score);
  return (
    <div className="rounded-[20px] bg-[var(--c-frame)] p-4">
      <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[var(--c-ink-3)]">Mood this week</p>
      {any ? (
        <div className="mt-3 flex h-[64px] items-end justify-between gap-2">
          {week.map((w, i) => {
            const s = w.mood?.score ?? 0;
            const t = toneOf(s || null);
            return (
              <div key={w.key} className="flex flex-1 flex-col items-center gap-1.5" title={w.mood?.word ? `${cap(w.mood.word)} (${s}/5)` : "No mood heard"}>
                <span
                  className={cn(
                    "w-full max-w-[22px] rounded-[7px]",
                    !s && "bg-[var(--c-line)]",
                    t === "bright" && "bg-[var(--c-ok-ink)]",
                    t === "steady" && "bg-[var(--c-ink-3)]",
                    t === "low" && "bg-[var(--c-accent)]",
                  )}
                  style={{ height: s ? 10 + s * 9 : 6 }}
                />
                <span className={cn("text-[10.5px]", i === 6 ? "font-semibold text-[var(--c-ink)]" : "text-[var(--c-ink-3)]")}>{w.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-[12.5px] text-[var(--c-ink-2)]">Fills in as Saheli hears how they feel in the chats.</p>
      )}
    </div>
  );
}

/* ── needs you ────────────────────────────────────────────────────────────── */

function NeedsYou({ items, onDecide, busy }: { items: CareHomeSummary["needsYou"]; onDecide: (id: string, approve: boolean) => void; busy: string | null }) {
  const labels = (n: CareHomeSummary["needsYou"][number]) =>
    n.kind === "refill"
      ? ["Reorder", "Later"]
      : n.kind === "appointment"
        ? ["Open", "Later"]
        : n.kind === "task"
          ? n.input === "confirm"
            ? ["Confirm", "Decline"]
            : ["Open", "Later"]
          : ["Approve", "Reject"];
  return (
    <Panel className="bg-[var(--c-accent-wash)] shadow-[inset_0_0_0_1px_var(--c-accent-soft)]">
      <PanelTitle title="Needs you" right={<Tag>{items.length}</Tag>} />
      <ul className="mt-3 divide-y divide-[var(--c-line)]">
        {items.map((n) => {
          const [yes, no] = labels(n);
          return (
            <li key={n.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{n.title}</p>
                {n.meta && <p className="mt-0.5 text-[12px] text-[var(--c-ink-2)]">{n.meta}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <SmallButton dark disabled={busy === n.id} onClick={() => onDecide(n.id, true)}>
                  {yes}
                </SmallButton>
                <SmallButton disabled={busy === n.id} onClick={() => onDecide(n.id, false)}>
                  {no}
                </SmallButton>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ── habits: good things, with streaks ────────────────────────────────────── */

const CATEGORY_ICON: Record<string, PhosphorIcon> = {
  fitness: Barbell,
  health: Heartbeat,
  mind: Lightbulb,
  spiritual: Sparkle,
  food: ForkKnife,
  sleep: Bed,
  social: UsersThree,
  work: Briefcase,
  home: House,
  quit: Prohibit,
  hobby: PaintBrush,
  care: FirstAid,
};

function TodayBadge({ a }: { a: PortraitActivity }) {
  if (a.today === "done") return <Tag tone="ok">{a.kind === "quit" ? "Held on today" : "Done today"}</Tag>;
  if (a.today === "skipped") return <Tag tone="light">{a.kind === "quit" ? "Slipped today" : "Skipped today"}</Tag>;
  if (a.today === "off") return <Tag tone="light">Rest day</Tag>;
  if (a.today === "upcoming") return <Tag tone="light">{a.start ? `At ${a.start}` : "Later today"}</Tag>;
  if (a.today === "not_heard") return <Tag tone="accent">Saheli will ask</Tag>;
  return null;
}

/** "every day, 07:00–07:40" from the engine's "Morning walk (every day, 07:00–07:40)". */
const schedule = (a: PortraitActivity) => (a.text.startsWith(a.label) && a.text.endsWith(")") ? a.text.slice(a.label.length).trim().replace(/^\(|\)$/g, "") : a.text);

function Habits({ person, habits, routines }: { person: HomeV3Person; habits: PortraitActivity[]; routines: PortraitActivity[] }) {
  const done = habits.filter((h) => h.today === "done").length;
  const due = habits.filter((h) => h.today !== "off").length;
  return (
    <Panel>
      <PanelTitle
        title={person.self ? "Your habits" : `${person.callAs}'s habits`}
        right={due > 0 ? <span className="text-[12px] text-[var(--c-ink-2)]">{done} of {due} today</span> : undefined}
      />
      <ul className="mt-3 space-y-2">
        {habits.map((a) => {
          const Icon = CATEGORY_ICON[a.category] ?? Sparkle;
          return (
            <li key={a.key} className="flex items-start gap-3 rounded-[18px] bg-[var(--c-frame)] p-3.5">
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]", a.today === "done" ? "bg-[var(--c-solid)] text-[var(--c-on-solid)]" : "bg-[var(--c-solid-soft)] text-[var(--c-solid)]")}>
                {a.today === "done" ? <CheckCircle size={20} weight="fill" /> : <Icon size={19} weight="regular" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-[14px] font-medium">{a.label}</p>
                  <TodayBadge a={a} />
                </div>
                <p className="mt-0.5 truncate text-[12px] text-[var(--c-ink-2)]">
                  {schedule(a)}
                  {a.goal ? ` · goal: ${a.goal}` : ""}
                </p>
                {a.last?.summary && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-[var(--c-ink)]">&ldquo;{a.last.summary}&rdquo;</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                <span className={cn("inline-flex items-center gap-1 text-[15px] font-medium", a.streak ? "text-[var(--c-ink)]" : "text-[var(--c-ink-3)]")}>
                  <Fire size={15} weight={a.streak ? "fill" : "regular"} className={a.streak ? "text-[var(--c-accent)]" : ""} aria-hidden />
                  <span className="c-num">{a.streak}</span>
                </span>
                <span className="text-[11px] text-[var(--c-ink-3)]">{a.week_done} this week</span>
              </div>
            </li>
          );
        })}
      </ul>
      {routines.length > 0 && (
        <p className="mt-3 text-[12px] text-[var(--c-ink-2)]">
          <span className="font-medium text-[var(--c-ink)]">Their day: </span>
          {routines
            .filter((r) => r.start)
            .sort((a, b) => String(a.start).localeCompare(String(b.start)))
            .map((r) => `${r.start} ${r.label.toLowerCase()}`)
            .join(" · ")}
        </p>
      )}
      <p className="mt-3 text-[11.5px] text-[var(--c-ink-3)]">
        Saheli checks in after each one and keeps what {person.self ? "you tell" : "they tell"} her. Add one by telling her, e.g. &ldquo;I walk at 7 every morning&rdquo;.
      </p>
    </Panel>
  );
}

/* ── readings ─────────────────────────────────────────────────────────────── */

const VITAL_LABEL: Record<string, string> = { bp: "Blood pressure", sugar: "Sugar", weight: "Weight", temperature: "Temperature", spo2: "SpO2" };

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 90;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const y = (v: number) => (max === min ? h / 2 : h - 3 - ((v - min) / (max - min)) * (h - 6));
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="overflow-visible">
      <polyline points={values.map((v, i) => `${(i / (values.length - 1)) * w},${y(v)}`).join(" ")} fill="none" stroke="var(--c-solid)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={w} cy={y(values[values.length - 1])} r="3" fill="var(--c-accent)" />
    </svg>
  );
}

function Readings({ person, vitals }: { person: HomeV3Person; vitals: Array<[string, VitalSummary]> }) {
  return (
    <Panel>
      <PanelTitle
        title="Latest readings"
        right={
          <Link href={`/dashboard/record?recipient=${person.id}`} className="text-[12px] text-[var(--c-ink-2)] underline-offset-2 hover:underline">
            Health records
          </Link>
        }
      />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {vitals.map(([k, v]) => (
          <div key={k} className="flex items-end justify-between gap-3 rounded-[18px] bg-[var(--c-frame)] p-3.5">
            <div className="min-w-0">
              <p className="text-[12px] text-[var(--c-ink-2)]">{VITAL_LABEL[k] ?? k}</p>
              <p className="mt-1 leading-none">
                <span className="c-num text-[26px] font-medium">{v!.value.replace(/\s*(kg|mmhg|mg\/dl|%|°f|°c)$/i, "")}</span>
                {v!.unit && <span className="ml-1 text-[11.5px] text-[var(--c-ink-2)]">{v!.unit}</span>}
              </p>
              <p className="mt-1.5 text-[11px] text-[var(--c-ink-3)]">
                {new Date(v!.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST })}
                {v!.change ? ` · ${v!.change.dir === "up" ? "+" : "−"}${v!.change.pct}%` : ""}
                {v!.redFlag ? " · needs a look" : ""}
              </p>
            </div>
            <Spark values={v!.trend} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ── medicines ────────────────────────────────────────────────────────────── */

const DOSE_TONE: Record<string, { label: string; tone: "ok" | "danger" | "accent" | "light" | "warn" }> = {
  taken: { label: "Taken", tone: "ok" },
  missed: { label: "Missed", tone: "danger" },
  due: { label: "Due now", tone: "accent" },
  reminded: { label: "Reminded", tone: "warn" },
  upcoming: { label: "Later", tone: "light" },
  skipped: { label: "Skipped", tone: "light" },
  unmarked: { label: "Not marked", tone: "light" },
};

function Medicines({ person, home }: { person: HomeV3Person; home: CareHomeSummary }) {
  const taken = home.doses.filter((d) => d.status === "taken").length;
  const pct = home.doses.length ? (taken / home.doses.length) * 100 : 0;
  const weekPct = home.week.scheduled ? Math.round((home.week.taken / home.week.scheduled) * 100) : null;
  return (
    <Panel>
      <PanelTitle
        title="Medicines today"
        right={
          <Link href={`/dashboard/saheli/care?recipient=${person.id}`} className="text-[12px] text-[var(--c-ink-2)] underline-offset-2 hover:underline">
            Care plan
          </Link>
        }
      />
      <div className="mt-3 flex items-center gap-4">
        <Ring pct={pct} size={76} label={`${taken}/${home.doses.length}`} />
        <div className="text-[12.5px] text-[var(--c-ink-2)]">
          {weekPct != null && (
            <p>
              <span className="c-num text-[18px] font-medium text-[var(--c-ink)]">{weekPct}%</span> taken this week
            </p>
          )}
          {home.week.streakDays > 1 && <p className="mt-0.5">{home.week.streakDays} days in a row with every dose</p>}
        </div>
      </div>
      <ul className="mt-3 divide-y divide-[var(--c-line)]">
        {home.doses.map((d) => {
          const t = DOSE_TONE[d.status] ?? DOSE_TONE.unmarked;
          return (
            <li key={d.id} className="flex items-center gap-3 py-2.5">
              <span className="c-num w-12 shrink-0 text-[13px] text-[var(--c-ink-2)]">{d.time}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">
                {d.name}
                {d.dose ? <span className="text-[var(--c-ink-2)]"> · {d.dose}</span> : null}
              </span>
              <Tag tone={t.tone}>{t.label}</Tag>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ── coming up, errands, timeline ─────────────────────────────────────────── */

function ComingUp({ items }: { items: CareHomeSummary["followUps"] }) {
  const sorted = [...items].sort((a, b) => String(a.wakeAt ?? "9").localeCompare(String(b.wakeAt ?? "9"))).slice(0, 5);
  return (
    <Panel>
      <PanelTitle title="Saheli will check" />
      <ul className="mt-3 space-y-1.5">
        {sorted.map((f) => (
          <li key={f.id} className="flex items-start gap-3 rounded-[14px] bg-[var(--c-frame)] px-3.5 py-2.5">
            <span className="c-num w-[52px] shrink-0 pt-px text-[12.5px] text-[var(--c-ink-2)]">
              {f.wakeAt ? (new Date(f.wakeAt).toLocaleDateString("en-CA", { timeZone: IST }) === todayIst() ? hm(f.wakeAt) : new Date(f.wakeAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST })) : "soon"}
            </span>
            <span className="min-w-0 flex-1 text-[13px] leading-snug">{f.title.replace(/\s*\(ask:.*\)\s*$/, "")}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

const TASK_STATUS: Record<string, { label: string; tone: "ok" | "danger" | "accent" | "light" | "warn" }> = {
  queued: { label: "Starting", tone: "light" },
  running: { label: "Working", tone: "light" },
  needs_input: { label: "Needs you", tone: "accent" },
  awaiting_confirm: { label: "Confirm", tone: "accent" },
  done: { label: "Done", tone: "ok" },
  failed: { label: "Didn't work", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "light" },
};

function Errands({ tasks }: { tasks: CareHomeSummary["tasks"] }) {
  return (
    <Panel>
      <PanelTitle
        title="Orders & rides"
        right={
          <Link href="/dashboard/saheli/tasks" className="text-[12px] text-[var(--c-ink-2)] underline-offset-2 hover:underline">
            All
          </Link>
        }
      />
      <ul className="mt-3 space-y-1.5">
        {tasks.slice(0, 4).map((t) => {
          const s = TASK_STATUS[t.status] ?? TASK_STATUS.running;
          return (
            <li key={t.id} className="flex items-center gap-3 rounded-[14px] bg-[var(--c-frame)] px-3 py-2.5">
              <ServiceLogo service={t.service} label={t.serviceLabel} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{t.goal}</span>
                <span className="block truncate text-[11.5px] text-[var(--c-ink-2)]">{t.serviceLabel}</span>
              </span>
              <Tag tone={s.tone}>{s.label}</Tag>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Timeline({ items }: { items: CareHomeSummary["timeline"] }) {
  return (
    <Panel>
      <PanelTitle title="Today so far" />
      <ol className="relative mt-3 space-y-0 pl-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-[var(--c-line)]">
        {items.slice(0, 7).map((t) => (
          <li key={t.id} className="relative flex gap-3 py-1.5">
            <span className="absolute -left-4 top-[11px] h-[9px] w-[9px] rounded-full border-2 border-[var(--c-card)] bg-[var(--c-ink-3)]" aria-hidden />
            <span className="c-num w-11 shrink-0 text-[12.5px] text-[var(--c-ink-2)]">{hm(t.at)}</span>
            <span className="min-w-0 text-[13px] leading-snug">{t.kind === "reminder_sent" ? t.text.replace(/^dose due:\s*/i, "Reminder sent: ") : t.text}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function QuietDay({ person, askHref }: { person: HomeV3Person; askHref: string | null }) {
  return (
    <Panel className="flex flex-col items-start gap-3 p-6">
      <p className="text-[16px] font-medium">{person.self ? "A quiet day so far" : `A quiet day for ${person.callAs} so far`}</p>
      <p className="max-w-md text-[13px] text-[var(--c-ink-2)]">
        Medicines, habits, readings and orders show here as soon as Saheli has them. The quickest way is to tell her on WhatsApp.
      </p>
      {askHref && (
        <a href={askHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--c-solid)] px-4 text-[13px] font-medium text-[var(--c-on-solid)]">
          <WhatsappLogo size={16} weight="fill" aria-hidden />
          Message Saheli
        </a>
      )}
    </Panel>
  );
}

/* ── what Saheli doesn't know yet ─────────────────────────────────────────── */

const GAP_COPY: Record<GapKey, { label: string; why: string; say: (self: boolean, n: string) => string; href?: string }> = {
  medicine: { label: "Medicines", why: "Reminders on time, and a missed dose noticed", say: (s, n) => (s ? "I take these medicines: " : `${n} takes these medicines: `), href: "/dashboard/saheli/care" },
  allergy: { label: "Allergies", why: "On the emergency card and checked before every order", say: (s, n) => (s ? "My allergies are: " : `${n}'s allergies are: `) },
  condition: { label: "Health conditions", why: "So Saheli knows what to watch for", say: (s, n) => (s ? "My health conditions: " : `${n}'s health conditions: `) },
  blood_group: { label: "Blood group", why: "The first thing a hospital asks", say: (s, n) => (s ? "My blood group is " : `${n}'s blood group is `) },
  emergency_contact: { label: "Someone to call", why: "Who a helper calls first in an emergency", say: (s, n) => (s ? "In an emergency call " : `In an emergency for ${n}, call `), href: "/dashboard/family" },
  doctor: { label: "Doctor", why: "For appointments and the doctor's report", say: (s, n) => (s ? "My doctor is " : `${n}'s doctor is `), href: "/dashboard/care-team" },
  hospital: { label: "Preferred hospital", why: "Shown with directions on the emergency card", say: (s, n) => (s ? "My preferred hospital is " : `${n}'s preferred hospital is `) },
  address: { label: "Home address", why: "For deliveries, rides and the emergency card", say: (s, n) => (s ? "My home address is " : `${n}'s home address is `), href: "/dashboard/addresses" },
  routine: { label: "Daily routine & habits", why: "Gym, walks, prayer, meals: Saheli cheers them on", say: (s) => (s ? "My daily routine: I wake up at " : "Their daily routine: they wake up at ") },
  weight: { label: "A recent weight", why: "Starts the trend in Health Records", say: (s, n) => (s ? "My weight today is " : `${n}'s weight today is `) },
  enjoys: { label: "What they enjoy", why: "So Saheli's chats are about what they love", say: (s, n) => (s ? "I enjoy " : `${n} enjoys `) },
  language: { label: "Language", why: "Every message in the language they like", say: (s, n) => (s ? "Please talk to me in " : `Please talk to ${n} in `) },
};

function KnowMore({ person, gaps, kavachNumber }: { person: HomeV3Person; gaps: NonNullable<Portrait["gaps"]>; kavachNumber: string | null }) {
  const missing = gaps.items.filter((i) => !i.known);
  const pct = gaps.total ? (gaps.known / gaps.total) * 100 : 0;
  if (!missing.length) {
    return (
      <Panel className="flex items-center gap-4">
        <Ring pct={100} size={64} label="✓" />
        <p className="text-[13px] text-[var(--c-ink-2)]">Saheli knows the essentials about {person.self ? "you" : person.callAs}. Keep chatting and she keeps learning.</p>
      </Panel>
    );
  }
  return (
    <Panel>
      <PanelTitle title={person.self ? "Help Saheli know you better" : `Help Saheli know ${person.callAs} better`} />
      <div className="mt-3 flex items-center gap-4">
        <Ring pct={pct} size={68} label={`${gaps.known}/${gaps.total}`} />
        <p className="text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">
          Each one makes Saheli&apos;s help sharper. Tap one to tell her on WhatsApp; she saves it straight to the record.
        </p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {missing.slice(0, 4).map((g) => {
          const c = GAP_COPY[g.key];
          if (!c) return null;
          const wa = waLink(kavachNumber, c.say(person.self, person.callAs));
          const href = wa ?? (c.href ? `${c.href}?recipient=${person.id}` : null);
          const inner = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium">{c.label}</span>
                <span className="block text-[11.5px] text-[var(--c-ink-2)]">{c.why}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--c-accent-text)]">
                {wa ? "Tell Saheli" : "Add"}
                <ArrowRight size={12} weight="bold" aria-hidden />
              </span>
            </>
          );
          return (
            <li key={g.key}>
              {href ? (
                wa ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[14px] bg-[var(--c-frame)] px-3.5 py-2.5 transition-colors hover:bg-[var(--c-accent-wash)]">
                    {inner}
                  </a>
                ) : (
                  <Link href={href} className="flex items-center gap-3 rounded-[14px] bg-[var(--c-frame)] px-3.5 py-2.5 transition-colors hover:bg-[var(--c-accent-wash)]">
                    {inner}
                  </Link>
                )
              ) : (
                <div className="flex items-center gap-3 rounded-[14px] bg-[var(--c-frame)] px-3.5 py-2.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {missing.length > 4 && <p className="mt-2 text-[11.5px] text-[var(--c-ink-3)]">{missing.length - 4} more after these</p>}
    </Panel>
  );
}
