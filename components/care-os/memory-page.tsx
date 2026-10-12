"use client";

import Link from "next/link";
import {
  ClockCounterClockwise,
  Fire,
  Heart,
  IdentificationBadge,
  Leaf,
  LockSimple,
  MagnifyingGlass,
  Microphone,
  MusicNotes,
  NotePencil,
  Plus,
  ShieldWarning,
  Sparkle,
  SunHorizon,
  UsersThree,
  WhatsappLogo,
  X,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DOMAIN_TITLE,
  SOURCE_LABEL,
  getPortrait,
  getRecentLearning,
  resolveFact,
  saveNote,
  type CareEvent,
  type CareFact,
  type MemoryNote,
  type Portrait,
} from "@/lib/care-memory-api";
import { useCareOverview } from "@/components/dashboard/saheli/saheli-shared";
import { cn } from "@/lib/utils";
import { MemoryHealthPanel } from "./memory-health-panel";
import { MemoryHistoryDrawer, RecentChangesPanel, type HistoryItem } from "./memory-history";
import { PanelBoundary } from "./panel-boundary";
import { SkillsPanel } from "./skills-panel";
import { useLoad } from "./care-kit";
import { callName, possessive, usePerson } from "./person-context";
import { Bubble, MoodLine, PersonPhoto, ScoreDots, cap } from "./portrait-kit";
import { DarkButton, Panel, PanelTitle, SmallButton } from "./ui";
import type { PortraitActivity } from "@/lib/care-memory-api";

const FILTERS: Array<{ id: string; label: string; domains: string[] | null }> = [
  { id: "all", label: "All", domains: null },
  { id: "health", label: "Health", domains: ["medicine", "allergy", "condition", "vital_target", "appointment", "doctor", "hospital", "profile"] },
  { id: "life", label: "Life", domains: ["routine", "home", "occasion", "diet", "language", "naming"] },
  { id: "people", label: "People", domains: ["family", "contact"] },
  { id: "likes", label: "Likes", domains: ["preference", "dish", "no_order"] },
];
const HEALTH = ["medicine", "allergy", "condition", "vital_target"];
const DOMAIN_ICON: Record<string, PhosphorIcon> = { medicine: Heart, allergy: ShieldWarning, condition: Heart, family: UsersThree, contact: UsersThree, preference: MusicNotes, dish: Leaf, routine: Sparkle };
const LOVE_TONES = ["bg-[#fff3ea] dark:bg-[#2a1d14]", "bg-[#eaf3ec] dark:bg-[#15261c]", "bg-[#f1eefb] dark:bg-[#1f1b2e]"];
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
const dayAndTime = (iso: string) => `${when(iso)}, ${clock(iso)}`;

/** Their people around their photo: household first, then the record's family, contacts and doctors. */
function PeopleOrbit({ people, center, centerPhoto, photos }: { people: Portrait["people"]; center: string; centerPhoto?: string | null; photos: Map<string, string | null | undefined> }) {
  const spots = ["left-[4%] top-[4%]", "right-[2%] top-[18%]", "left-[0%] bottom-[20%]", "right-[4%] bottom-[2%]"];
  const ring = people.slice(0, 4);
  const rest = people.slice(4);
  return (
    <>
      <div className="relative hidden h-[330px] sm:block">
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          <circle cx="50%" cy="50%" r="125" fill="none" stroke="var(--c-line)" strokeDasharray="4 6" />
        </svg>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <PersonPhoto name={center} src={centerPhoto} rounded="rounded-full" className="h-[104px] w-[104px] border-4 border-[var(--c-frame)] shadow-[0_0_0_8px_rgba(211,84,30,0.15),0_0_0_18px_rgba(211,84,30,0.07)]" text={34} />
          <b className="mt-2.5 text-[13px] font-medium">{center}</b>
        </div>
        {ring.map((x, i) => (
          <div key={`${x.kind}-${x.name}`} className={cn("absolute flex max-w-[48%] items-center gap-2 rounded-full bg-[var(--c-frame)] py-1 pl-1 pr-3.5 shadow-[0_10px_20px_-14px_rgba(0,0,0,0.4)]", spots[i])}>
            <PersonPhoto name={x.name} src={x.id ? photos.get(x.id) : null} rounded="rounded-full" className="h-[42px] w-[42px]" text={15} />
            <div className="min-w-0">
              <b className="block truncate text-[12.5px] font-medium">
                {x.name}
                {x.relation && <span className="font-normal capitalize text-[var(--c-ink-2)]"> · {x.relation}</span>}
              </b>
              {x.note && x.note !== x.name && <span className="block truncate text-[10.5px] text-[var(--c-ink-2)]">{x.note}</span>}
            </div>
          </div>
        ))}
      </div>
      <ul className={cn("mt-3 space-y-2", ring.length > 0 && "sm:hidden")}>
        {ring.map((x) => (
          <li key={`m-${x.kind}-${x.name}`} className="flex items-center gap-2.5 rounded-[16px] bg-[var(--c-frame)] p-2">
            <PersonPhoto name={x.name} src={x.id ? photos.get(x.id) : null} rounded="rounded-full" className="h-9 w-9" text={13} />
            <span className="min-w-0 truncate text-[13px]">
              <b className="font-medium">{x.name}</b> <span className="capitalize text-[var(--c-ink-2)]">{x.relation}</span>
            </span>
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <p className="mt-2 text-[12px] text-[var(--c-ink-2)]">
          Also: {rest.map((x) => `${x.name}${x.relation ? ` (${x.relation})` : ""}`).join(", ")}
        </p>
      )}
    </>
  );
}

const IST = "Asia/Kolkata";
const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST });

const IDENTITY = ["naming", "language", "family", "preference", "routine", "occasion", "home", "contact", "doctor", "hospital", "dish", "diet", "condition"];

const TOPIC_ICON: Array<[RegExp, PhosphorIcon]> = [
  [/food|dish|cook|kitchen/i, Leaf],
  [/family|grand|child|people|friend/i, UsersThree],
  [/health|history|medical/i, Heart],
];
const iconFor = (title: string) => TOPIC_ICON.find(([r]) => r.test(title))?.[1] ?? NotePencil;

type Editing = { subjectId: string; slug: string; title: string; body: string; isNew: boolean };

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 100) || "note";
}

function noteLines(body: string) {
  return body
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

export function MemoryPage() {
  const { familyId, selectedId, selected, isCaregiver } = usePerson();
  const { data, loading, reload } = useCareOverview(familyId, selectedId);
  const [learned, setLearned] = useState<CareEvent[]>([]);
  // search belongs to one person: switching person starts with an empty search
  const [search, setSearch] = useState<{ id: string | null; q: string }>({ id: null, q: "" });
  const q = search.id === selectedId ? search.q : "";
  const setQ = (value: string) => setSearch({ id: selectedId, q: value });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [historyOf, setHistoryOf] = useState<HistoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");
  const [deciding, setDeciding] = useState<string | null>(null);
  const name = callName(selected);
  const { members } = usePerson();
  const pkey = familyId && selectedId ? `${familyId}/${selectedId}` : null;
  const portrait = useLoad<Portrait>(pkey, useCallback(() => getPortrait(familyId!, selectedId!), [familyId, selectedId]));
  const p = portrait.data;
  const photos = useMemo(() => new Map(members.filter((m) => m.userId).map((m) => [m.userId as string, m.avatarUrl])), [members]);
  // only a message a fact was saved from counts as their words for the big quote (the re-read's pick may be loose)
  const ownWords = (p?.learned ?? []).filter((l) => l.said && !l.said.heard && l.statedBy);
  // the big quote: something everyday they said themselves (a health change waits in its own approval card)
  const theirs = (l: (typeof ownWords)[number]) => Boolean(l.statedBy && selected?.name && l.statedBy.split(" ")[0] === selected.name.split(" ")[0]);
  const everyday = (l: (typeof ownWords)[number]) => l.status === "active" && !HEALTH.includes(l.domain);
  const hero = ownWords.find((l) => theirs(l) && everyday(l)) ?? ownWords.find(everyday) ?? ownWords.find(theirs) ?? ownWords[0];
  const shownLearned = (p?.learned ?? []).filter((l) => {
    const f = FILTERS.find((x) => x.id === filter);
    return !f?.domains || f.domains.includes(l.domain);
  });
  async function decide(key: string, approve: boolean) {
    if (!familyId || !selectedId) return;
    setDeciding(key);
    try {
      await resolveFact(familyId, selectedId, key, approve);
      portrait.reload();
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work");
    } finally {
      setDeciding(null);
    }
  }

  useEffect(() => {
    if (!familyId || !selectedId) return;
    let off = false;
    getRecentLearning(familyId, selectedId)
      .then((ev) => !off && setLearned(ev))
      .catch(() => !off && setLearned([]));
    return () => {
      off = true;
    };
  }, [familyId, selectedId, data]);

  const term = q.trim().toLowerCase();
  const facts = useMemo(() => (data?.facts ?? []).filter((f) => f.status === "active"), [data]);
  const match = (s: string) => !term || s.toLowerCase().includes(term);
  const identity = IDENTITY.flatMap((d) => facts.filter((f) => f.domain === d && match(f.text)));
  const notes = (data?.notes ?? []).filter((n) => match(`${n.title}\n${n.body}`));
  const personNotes = notes.filter((n) => n.subjectId === selectedId);
  const familyNotes = notes.filter((n) => n.subjectId === "family");
  const [weekAgo] = useState(() => Date.now() - 7 * 86_400_000);
  const thisWeek = learned.filter((e) => new Date(e.at).getTime() > weekAgo).length;

  async function save() {
    if (!editing || !familyId || !selectedId) return;
    setSaving(true);
    setErr("");
    try {
      await saveNote(familyId, selectedId, {
        subjectId: editing.subjectId,
        slug: editing.isNew ? slugify(editing.title) : editing.slug,
        title: editing.title.trim(),
        body: editing.body,
      });
      setEditing(null);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block font-light text-[var(--c-ink-3)]">{possessive(selected)}</span>
            <span className="block font-medium">Story</span>
          </h1>
          <p className="mt-3 max-w-[580px] text-[13px] leading-relaxed text-[var(--c-ink-2)]">
            {selected?.self ? "Who you are" : `Who ${name || "they"} ${name === "You" ? "are" : "is"}`}, the people around {selected?.self ? "you" : "them"} and what Saheli has learned from {selected?.self ? "your" : "their"} own words. Everything here came from chats, photos or you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex h-12 w-[260px] items-center gap-2 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-4">
            <MagnifyingGlass size={16} className="text-[var(--c-ink-3)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search everything Saheli knows" className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--c-ink-3)]" />
          </label>
          <DarkButton onClick={() => setEditing({ subjectId: selectedId ?? "family", slug: "", title: "", body: "", isNew: true })}>Tell Saheli something</DarkButton>
        </div>
      </div>
      {err && <p className="rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2 text-[13px] text-[var(--c-accent-soft-ink)]">{err}</p>}

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[220px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <section className="relative min-h-[340px] min-w-0 overflow-hidden rounded-[30px] text-white">
              {selected?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.photo} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_30%]" />
              ) : (
                <div className="absolute inset-0 bg-[var(--c-solid)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,42,34,0.92)] via-[rgba(15,42,34,0.72)] to-[rgba(15,42,34,0.05)]" />
              <div className="relative flex h-full min-h-[340px] max-w-[640px] flex-col justify-between gap-6 p-6 sm:p-7">
                <span className="inline-flex w-max items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11.5px]">
                  <WhatsappLogo size={13} weight="fill" />
                  {hero?.said ? `In ${hero.statedBy && hero.statedBy !== selected?.name ? `${hero.statedBy.split(" ")[0]}'s` : selected?.self ? "your" : "their"} words · ${dayAndTime(hero.said.at)}` : "Getting to know them"}
                </span>
                {hero?.said ? (
                  <div>
                    <p className="text-[24px] leading-[1.2] tracking-[-0.02em] sm:text-[30px]">
                      <span className="mr-1 align-[-20px] text-[56px] leading-none text-[#ff9b6a]">“</span>
                      {hero.said.text}
                    </p>
                    <p className="mt-3 text-[13px] text-white/75">Saheli saved: {hero.text}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[26px] leading-tight tracking-[-0.02em]">Saheli is getting to know {name === "You" ? "you" : name}.</p>
                    <p className="mt-3 text-[13px] text-white/75">What {name === "You" ? "you share" : "they share"} on WhatsApp shows here in {name === "You" ? "your" : "their"} own words.</p>
                  </div>
                )}
                {hero?.said?.voice ? (
                  <span className="inline-flex w-max items-center gap-2 rounded-full bg-white/[0.12] py-1.5 pl-1.5 pr-4 text-[12px]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--c-accent)]">
                      <Microphone size={14} weight="fill" />
                    </span>
                    Said in a voice note
                  </span>
                ) : (
                  <span />
                )}
              </div>
            </section>

            <section className="flex min-w-0 flex-col rounded-[30px] bg-[var(--c-card)] p-5">
              <PanelTitle title={selected?.self ? "How you've been" : "How they've been"} right={<span className="text-[11.5px] text-[var(--c-ink-2)]">from the chats, 14 days</span>} />
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="c-num text-[44px] leading-none">{p?.mood.now?.word ? cap(p.mood.now.word) : "—"}</p>
                  <p className="mt-1.5 truncate text-[12px] text-[var(--c-ink-2)]">
                    {p?.mood.now ? `${clock(p.mood.now.at)} · ${p.mood.now.summary}` : "No mood heard in the last day"}
                  </p>
                </div>
                <ScoreDots score={p?.mood.now?.score ?? null} />
              </div>
              <div className="mt-3">
                <MoodLine days={p?.mood.days ?? []} />
              </div>
              <div className="mt-auto grid grid-cols-3 gap-2 pt-3">
                <div className="rounded-[16px] bg-[var(--c-frame)] px-3 py-2.5">
                  <b className="c-num block text-[22px] font-normal">{p?.stats.known ?? facts.length}</b>
                  <span className="text-[11px] text-[var(--c-ink-2)]">things Saheli knows</span>
                </div>
                <div className="rounded-[16px] bg-[var(--c-frame)] px-3 py-2.5">
                  <b className="c-num block text-[22px] font-normal">+{p?.stats.learnedWeek ?? thisWeek}</b>
                  <span className="text-[11px] text-[var(--c-ink-2)]">learned this week</span>
                </div>
                <Link href="/dashboard/saheli/care" className={cn("rounded-[16px] px-3 py-2.5", (p?.stats.pending ?? 0) > 0 ? "bg-[var(--c-accent-soft)] text-[var(--c-accent-soft-ink)]" : "bg-[var(--c-frame)]")}>
                  <b className="c-num block text-[22px] font-normal">{p?.stats.pending ?? 0}</b>
                  <span className="text-[11px]">need your OK</span>
                </Link>
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
            <Panel className="min-w-0">
              <PanelTitle title={selected?.self ? "Your people" : "Their people"} />
              {p && p.people.length ? (
                <PeopleOrbit people={p.people} center={name} centerPhoto={selected?.photo} photos={photos} />
              ) : (
                <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">Family, neighbours and doctors show here as Saheli hears about them.</p>
              )}
            </Panel>

            <Panel className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PanelTitle title="Learned from the chats" />
                <div className="flex flex-wrap gap-1.5">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={cn("h-7 rounded-full px-3 text-[11.5px]", filter === f.id ? "bg-[var(--c-solid)] text-[var(--c-on-solid)]" : "border border-[var(--c-line)] bg-[var(--c-frame)] text-[var(--c-ink-2)]")}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {shownLearned.length === 0 && (
                  <p className="rounded-[16px] bg-[var(--c-frame)] p-4 text-[13px] text-[var(--c-ink-2)]">
                    {portrait.error ? "Couldn't load what Saheli learned. The rest of the page works." : "Nothing new in the last two weeks."}
                  </p>
                )}
                {shownLearned.slice(0, 8).map((l) => {
                  const Icon = DOMAIN_ICON[l.domain] ?? NotePencil;
                  const pendingRow = l.status === "pending";
                  return (
                    <div key={l.id} className="grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_26px_minmax(0,1.05fr)]">
                      <div className="min-w-0">
                        <p className="mb-1 ml-0.5 text-[10.5px] text-[var(--c-ink-3)]">
                          {l.said?.heard ? "Heard in the chat" : (l.statedBy ?? SOURCE_LABEL[l.source] ?? "Saheli")} · {dayAndTime(l.said?.at ?? l.at)}
                          {l.said?.voice ? " · voice note" : ""}
                        </p>
                        {l.said ? (
                          <Bubble mine={!l.said.heard && l.source !== "caregiver_said" && l.source !== "dashboard"} className={l.said.heard ? "italic" : undefined}>
                            {l.said.text}
                          </Bubble>
                        ) : (
                          <p className="rounded-[14px] border border-dashed border-[var(--c-line)] px-3 py-2 text-[12px] text-[var(--c-ink-2)]">
                            {l.source === "caregiver_said" || l.source === "dashboard" ? `Added by ${l.statedBy ?? "the family"}` : (SOURCE_LABEL[l.source] ?? "Noted")}
                          </p>
                        )}
                      </div>
                      <span className="hidden h-[26px] w-[26px] items-center justify-center rounded-full bg-[var(--c-frame)] text-[13px] text-[var(--c-ink-3)] md:flex">→</span>
                      <div className={cn("flex items-center gap-2.5 rounded-[16px] px-3 py-2.5", pendingRow ? "bg-[var(--c-accent-soft)]" : "bg-[var(--c-frame)]")}>
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]", pendingRow ? "bg-[var(--c-frame)] text-[var(--c-accent-soft-ink)]" : "bg-[var(--c-card)]")}>
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium" title={l.text}>
                            {l.text}
                          </p>
                          <p className="truncate text-[11px] text-[var(--c-ink-2)]">
                            {DOMAIN_TITLE[l.domain] ?? cap(l.domain.replace(/_/g, " "))} · {pendingRow ? "waiting for your OK" : "saved"}
                          </p>
                        </div>
                        {isCaregiver &&
                          (pendingRow ? (
                            <button type="button" disabled={deciding === l.key} onClick={() => void decide(l.key, true)} className="h-8 shrink-0 rounded-full bg-[var(--c-ok-ink)] px-3 text-[12px] font-medium text-white disabled:opacity-50">
                              Approve
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setHistoryOf({ kind: "fact", target: l.key, subjectId: selectedId ?? "", owner: selectedId ?? "", label: l.text.slice(0, 40) })}
                              className="h-8 shrink-0 rounded-full border border-[var(--c-line)] px-3 text-[12px] font-medium"
                            >
                              Undo
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          {p && (p.enjoys.length > 0 || p.avoid.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {p.enjoys.slice(0, 3).map((e, i) => (
                <div key={e.key} className={cn("flex min-h-[150px] flex-col gap-2.5 rounded-[24px] p-5", LOVE_TONES[i % LOVE_TONES.length])}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--c-frame)]">{i === 0 ? <MusicNotes size={17} /> : i === 1 ? <Leaf size={17} /> : <Heart size={17} />}</span>
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">{e.domain === "dish" ? "Loves to eat" : e.domain === "occasion" ? "Remember" : "Enjoys"}</p>
                  <p className="text-[15px] font-medium leading-snug tracking-[-0.01em]">{e.text}</p>
                </div>
              ))}
              {p.avoid.length > 0 && (
                <div className="flex min-h-[150px] flex-col gap-2.5 rounded-[24px] bg-[#fdeeee] p-5 dark:bg-[#2a1617]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--c-frame)] text-[var(--c-danger-ink)]">
                    <LockSimple size={17} />
                  </span>
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">Please avoid</p>
                  <ul className="space-y-1 text-[13.5px] leading-snug">
                    {p.avoid.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <ProfileGroups facts={identity} self={!!selected?.self} name={name} onHistory={(f) => setHistoryOf({ kind: "fact", target: f.key, subjectId: selectedId ?? "", owner: selectedId ?? "", label: f.text })} />

          {(p?.activities ?? []).some((a) => !a.paused && a.kind !== "routine") && <HabitStrip acts={(p?.activities ?? []).filter((a) => !a.paused && a.kind !== "routine")} />}

          {/* keyed by person: nothing typed, opened or shown for one person carries over to the next; each panel that
              fails shows a note in its place and the rest of the page keeps working */}
          {familyId && selectedId && (
            <section className="rounded-[24px] bg-[var(--c-card)] p-5">
              <PanelTitle title={selected?.self ? "Saheli's way with you" : `Saheli's way with ${name || "them"}`} right={<span className="text-[11px] text-[var(--c-ink-3)]">tone, the card she reads first, and every change</span>} />
              <div className="mt-3 grid gap-3 xl:grid-cols-2 [&_section]:bg-[var(--c-frame)]">
                <div className="min-w-0 space-y-3">
                  <PanelBoundary key={`s-${selectedId}`} name="How they like things">
                    <SkillsPanel familyId={familyId} subjectId={selectedId} name={name} canEdit={isCaregiver} />
                  </PanelBoundary>
                  <PanelBoundary key={`r-${selectedId}`} name="Recent changes">
                    <RecentChangesPanel familyId={familyId} subjectId={selectedId} name={name} onChanged={reload} refresh={data} canEdit={isCaregiver} />
                  </PanelBoundary>
                </div>
                <div className="min-w-0">
                  <PanelBoundary key={`h-${selectedId}`} name="Saheli's card">
                    <MemoryHealthPanel familyId={familyId} subjectId={selectedId} name={name} canEdit={isCaregiver} />
                  </PanelBoundary>
                </div>
              </div>
            </section>
          )}

          <Journal
            groups={[
              { label: selected?.self ? "About you" : `About ${name || "them"}`, subject: selectedId ?? "", items: personNotes },
              { label: "About the family", subject: "family", items: familyNotes },
            ]}
            onAdd={(subject) => setEditing({ subjectId: subject, slug: "", title: "", body: "", isNew: true })}
            onEdit={(n) => setEditing({ subjectId: n.subjectId, slug: n.slug, title: n.title, body: n.body, isNew: false })}
            onHistory={(n) => setHistoryOf({ kind: "note", target: n.slug, subjectId: selectedId ?? "", owner: n.subjectId, label: n.title })}
          />
        </>
      )}

      {familyId && (
        <PanelBoundary name="History">
          <MemoryHistoryDrawer familyId={familyId} item={historyOf} onClose={() => setHistoryOf(null)} onChanged={reload} canEdit={isCaregiver} />
        </PanelBoundary>
      )}

      {editing && (
        <div className="fixed inset-0 z-[60]">
          <button type="button" aria-label="Close" onClick={() => setEditing(null)} className="absolute inset-0 bg-[rgba(20,42,34,0.28)]" />
          <aside role="dialog" aria-modal="true" aria-label="Edit note" className="care-os absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-[var(--c-frame)] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[28px] leading-tight tracking-[-0.03em]">
                <span className="font-light text-[var(--c-ink-3)]">{editing.isNew ? "New" : "Edit"} </span>
                <span className="font-medium">note</span>
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-line)]">
                <X size={18} />
              </button>
            </div>
            <label className="mt-6 block">
              <span className="mb-2 block px-1 text-[12px] font-medium">Topic</span>
              <input
                value={editing.title}
                disabled={!editing.isNew}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Food, Grandchildren, Daily routine…"
                className="h-12 w-full rounded-full border border-[var(--c-line)] bg-[var(--c-card)] px-5 text-[14px] outline-none focus:border-[var(--c-ink)] disabled:text-[var(--c-ink-2)]"
              />
            </label>
            <label className="mt-4 flex min-h-0 flex-1 flex-col">
              <span className="mb-2 block px-1 text-[12px] font-medium">One thing per line</span>
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                className="min-h-[240px] flex-1 resize-none rounded-[22px] border border-[var(--c-line)] bg-[var(--c-card)] p-5 text-[14px] leading-relaxed outline-none focus:border-[var(--c-ink)]"
                placeholder="- Makes besan chilla every Sunday&#10;- Loves old Hindi songs"
              />
            </label>
            {err && <p className="mt-3 rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2 text-[13px] text-[var(--c-accent-soft-ink)]">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <SmallButton onClick={() => setEditing(null)}>Cancel</SmallButton>
              <DarkButton disabled={saving || !editing.title.trim()} onClick={() => void save()}>
                {saving ? "Saving…" : "Save note"}
              </DarkButton>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}


/* ── who they are: the record grouped the way a family thinks about a person ─────────────────────────── */

const PROFILE_GROUPS: Array<{ title: string; icon: PhosphorIcon; domains: string[] }> = [
  { title: "Basics", icon: IdentificationBadge, domains: ["naming", "language", "home"] },
  { title: "Health", icon: Heart, domains: ["condition", "doctor", "hospital"] },
  { title: "Daily life", icon: SunHorizon, domains: ["routine", "occasion"] },
  { title: "Food & likes", icon: Leaf, domains: ["dish", "diet", "preference"] },
  { title: "People", icon: UsersThree, domains: ["family", "contact"] },
];

function ProfileGroups({ facts, self, name, onHistory }: { facts: CareFact[]; self: boolean; name: string; onHistory: (f: CareFact) => void }) {
  const groups = PROFILE_GROUPS.map((g) => ({ ...g, items: facts.filter((f) => g.domains.includes(f.domain)) })).filter((g) => g.items.length);
  return (
    <section className="rounded-[24px] bg-[var(--c-card)] p-5">
      <PanelTitle title={self ? "About you" : name ? `Who ${name} is` : "Who they are"} right={<span className="text-[11px] text-[var(--c-ink-3)]">{facts.length} things known</span>} />
      {groups.length === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">Name, language, routines, dishes and family rules show here as Saheli learns them.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title} className="rounded-[18px] bg-[var(--c-frame)] p-4">
              <p className="flex items-center gap-2 text-[12px] font-medium text-[var(--c-ink-2)]">
                <g.icon size={15} className="text-[var(--c-solid)]" aria-hidden />
                {g.title}
                <span className="text-[var(--c-ink-3)]">· {g.items.length}</span>
              </p>
              <ul className="mt-2.5 space-y-1">
                {g.items.slice(0, 8).map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onHistory(f)}
                      title="See where this came from and its history"
                      className="group flex w-full items-start gap-2 rounded-[10px] px-1.5 py-1 text-left text-[13px] leading-snug hover:bg-[var(--c-card)]"
                    >
                      <span className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", f.source === "inferred" ? "bg-[var(--c-ink-3)]" : "bg-[var(--c-solid)]")} />
                      <span className="min-w-0 flex-1">{f.text}</span>
                      <span className="shrink-0 text-[10.5px] text-[var(--c-ink-3)] opacity-0 transition-opacity group-hover:opacity-100">{SOURCE_LABEL[f.source] ?? f.source}</span>
                    </button>
                  </li>
                ))}
                {g.items.length > 8 && <li className="px-1.5 text-[11.5px] text-[var(--c-ink-3)]">+{g.items.length - 8} more in the care plan</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 flex items-center gap-3 text-[11px] text-[var(--c-ink-3)]">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--c-solid)]" /> told or confirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--c-ink-3)]" /> heard in the chats</span>
        <span>Tap one for where it came from.</span>
      </p>
    </section>
  );
}

function HabitStrip({ acts }: { acts: PortraitActivity[] }) {
  return (
    <section className="rounded-[24px] bg-[var(--c-card)] p-5">
      <PanelTitle title="Habits Saheli cheers on" right={<span className="text-[11px] text-[var(--c-ink-3)]">checks in after each one</span>} />
      <div className="c-scroll mt-3 flex gap-3 overflow-x-auto pb-1">
        {acts.map((a) => (
          <div key={a.key} className="min-w-[200px] max-w-[240px] flex-1 rounded-[18px] bg-[var(--c-frame)] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[14px] font-medium">{a.label}</p>
              <span className="flex shrink-0 items-center gap-1 text-[13px]">
                <Fire size={14} weight={a.streak ? "fill" : "regular"} className={a.streak ? "text-[var(--c-accent)]" : "text-[var(--c-ink-3)]"} aria-hidden />
                <span className="c-num">{a.streak}</span>
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--c-ink-2)]">{a.text.startsWith(a.label) ? a.text.slice(a.label.length).trim().replace(/^\(|\)$/g, "") : a.text}</p>
            {a.last?.summary && <p className="mt-2 line-clamp-2 text-[12px] leading-snug">&ldquo;{a.last.summary}&rdquo;</p>}
            <p className="mt-2 text-[11px] text-[var(--c-ink-3)]">{a.week_done} this week</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── notes as a journal: the topics, and the chosen one read like a diary ─────────────────────────────── */

function Journal({
  groups,
  onAdd,
  onEdit,
  onHistory,
}: {
  groups: Array<{ label: string; subject: string; items: MemoryNote[] }>;
  onAdd: (subject: string) => void;
  onEdit: (n: MemoryNote) => void;
  onHistory: (n: MemoryNote) => void;
}) {
  const all = groups.flatMap((g) => g.items);
  const [pick, setPick] = useState<string | null>(null);
  const current = all.find((n) => `${n.subjectId}/${n.slug}` === pick) ?? all[0] ?? null;
  const lines = current ? noteLines(current.body) : [];
  return (
    <section className="rounded-[24px] bg-[var(--c-card)] p-5">
      <PanelTitle title="Saheli's notebook" right={<span className="text-[11px] text-[var(--c-ink-3)]">{all.length} topics · written from the chats</span>} />
      {all.length === 0 ? (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-[18px] bg-[var(--c-frame)] p-5 text-[13px] text-[var(--c-ink-2)]">
          No notes yet. Saheli writes them from conversations; you can add your own.
          <SmallButton icon={Plus} onClick={() => onAdd(groups[0]?.subject ?? "family")}>
            Add a note
          </SmallButton>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label="Note topics" className="space-y-4">
            {groups.map((g) => (
              <div key={g.subject}>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <p className="text-[11.5px] font-medium uppercase tracking-[0.07em] text-[var(--c-ink-3)]">{g.label}</p>
                  <button type="button" onClick={() => onAdd(g.subject)} aria-label={`Add a note ${g.label.toLowerCase()}`} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--c-frame)]">
                    <Plus size={13} />
                  </button>
                </div>
                {g.items.length === 0 ? (
                  <p className="px-1 text-[12px] text-[var(--c-ink-3)]">Nothing yet</p>
                ) : (
                  <ul className="space-y-1">
                    {g.items.map((n) => {
                      const Icon = iconFor(n.title);
                      const on = current && n.subjectId === current.subjectId && n.slug === current.slug;
                      return (
                        <li key={`${n.subjectId}/${n.slug}`}>
                          <button
                            type="button"
                            onClick={() => setPick(`${n.subjectId}/${n.slug}`)}
                            aria-current={on ? "true" : undefined}
                            className={cn("flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors", on ? "bg-[var(--c-frame)] shadow-[var(--c-shadow)]" : "hover:bg-[var(--c-frame)]")}
                          >
                            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]", on ? "bg-[var(--c-solid)] text-[var(--c-on-solid)]" : "bg-[var(--c-solid-soft)] text-[var(--c-solid)]")}>
                              <Icon size={15} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-medium">{n.title}</span>
                              <span className="block text-[11px] text-[var(--c-ink-3)]">
                                {noteLines(n.body).length} things · {when(n.updatedAt)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </nav>
          {current && (
            <article className="min-w-0 rounded-[20px] bg-[var(--c-frame)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[20px] font-medium tracking-[-0.02em]">{current.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--c-ink-3)]">
                    {lines.length} {lines.length === 1 ? "thing" : "things"} · updated {when(current.updatedAt)} · version {current.version}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <SmallButton icon={ClockCounterClockwise} onClick={() => onHistory(current)}>
                    History
                  </SmallButton>
                  <SmallButton icon={NotePencil} onClick={() => onEdit(current)}>
                    Edit
                  </SmallButton>
                </div>
              </div>
              <ol className="relative mt-4 space-y-3 pl-5 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-[var(--c-line)]">
                {lines.map((l, i) => {
                  const m = l.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/);
                  return (
                    <li key={i} className="relative text-[13.5px] leading-relaxed">
                      <span className="absolute -left-5 top-[7px] h-[11px] w-[11px] rounded-full border-2 border-[var(--c-frame)] bg-[var(--c-accent)]" aria-hidden />
                      {m && <span className="mr-2 text-[11px] font-medium text-[var(--c-ink-3)]">{when(`${m[1]}T12:00:00+05:30`)}</span>}
                      {m ? m[2] : l}
                    </li>
                  );
                })}
              </ol>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
