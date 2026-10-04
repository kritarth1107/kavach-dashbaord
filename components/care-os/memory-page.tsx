"use client";

import Link from "next/link";
import {
  Brain,
  ClockCounterClockwise,
  Heart,
  Leaf,
  MagnifyingGlass,
  NotePencil,
  Plus,
  ShieldWarning,
  Sparkle,
  UsersThree,
  X,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { DOMAIN_TITLE, SOURCE_LABEL, getRecentLearning, saveNote, type CareEvent, type CareFact, type MemoryNote } from "@/lib/care-memory-api";
import { useCareOverview } from "@/components/dashboard/saheli/saheli-shared";
import { cn } from "@/lib/utils";
import { MemoryHealthPanel } from "./memory-health-panel";
import { MemoryHistoryDrawer, RecentChangesPanel, type HistoryItem } from "./memory-history";
import { SkillsPanel } from "./skills-panel";
import { callName, possessive, usePerson } from "./person-context";
import { DarkButton, Panel, PanelTitle, SmallButton, Tag } from "./ui";

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
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [historyOf, setHistoryOf] = useState<HistoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const name = callName(selected);

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
  const guards = facts.filter((f) => (f.domain === "allergy" || f.domain === "no_order") && match(f.text));
  const identity = IDENTITY.flatMap((d) => facts.filter((f) => f.domain === d && match(f.text)));
  const notes = (data?.notes ?? []).filter((n) => match(`${n.title}\n${n.body}`));
  const personNotes = notes.filter((n) => n.subjectId === selectedId);
  const familyNotes = notes.filter((n) => n.subjectId === "family");
  const [weekAgo] = useState(() => Date.now() - 7 * 86_400_000);
  const thisWeek = learned.filter((e) => new Date(e.at).getTime() > weekAgo).length;
  const totalPoints = facts.length + (data?.notes ?? []).reduce((n, x) => n + noteLines(x.body).length, 0);

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
        <div className="flex items-end gap-5">
          <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block font-light text-[var(--c-ink-3)]">{possessive(selected)}</span>
            <span className="block font-medium">Memory</span>
          </h1>
          <span className="mb-2 hidden h-[68px] w-[68px] items-center justify-center rounded-full bg-[var(--c-accent)] text-white sm:flex">
            <Brain size={32} weight="fill" />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex h-12 w-[280px] items-center gap-2 rounded-full bg-[var(--c-card)] px-4">
            <MagnifyingGlass size={16} className="text-[var(--c-ink-3)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search everything Saheli knows" className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--c-ink-3)]" />
          </label>
          <DarkButton onClick={() => setEditing({ subjectId: selectedId ?? "family", slug: "", title: "", body: "", isNew: true })}>New note</DarkButton>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[220px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr]">
            <Panel accent className="flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Things Saheli knows</p>
                <Sparkle size={18} weight="fill" className="text-white" />
              </div>
              <p className="c-num mt-6 text-[64px] leading-none text-white">{totalPoints}</p>
              <p className="mt-auto pt-6 text-[12px] text-white/80">
                {thisWeek ? `+${thisWeek} learned this week` : "Grows as they talk to Saheli"}
              </p>
            </Panel>
            <Panel className="flex flex-col">
              <PanelTitle title="Never forget" right={<ShieldWarning size={18} />} />
              {guards.length === 0 ? (
                <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">No allergies or never-order items saved. Saheli will not guess.</p>
              ) : (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {guards.map((f) => (
                    <li key={f.id} className="rounded-full bg-[var(--c-accent-soft)] px-3 py-1.5 text-[12.5px] text-[var(--c-accent-soft-ink)]">
                      {f.text}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/dashboard/saheli/care" className="mt-auto pt-5 text-[12px] font-medium hover:text-[var(--c-accent)]">
                Edit care record →
              </Link>
            </Panel>
            <Panel className="md:col-span-2 xl:col-span-1">
              <PanelTitle title="Recently learned" right={<span className="text-[11px] text-[var(--c-ink-3)]">from conversations</span>} />
              {learned.length === 0 ? (
                <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">Nothing new yet. Facts appear here the moment Saheli learns them.</p>
              ) : (
                <ol className="relative mt-4 space-y-3 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-[var(--c-line)]">
                  {learned.slice(0, 5).map((e) => (
                    <li key={e.id} className="relative flex gap-3 pl-6">
                      <span className={cn("absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[var(--c-card)]", e.kind === "fact_pending" ? "bg-[var(--c-accent)]" : "bg-[var(--c-ink)]")} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px]">{e.summary}</p>
                        <p className="text-[11px] text-[var(--c-ink-3)]">
                          {when(e.at)} · {e.kind === "fact_pending" ? "waiting for your OK" : e.kind === "fact_superseded" ? "updated" : e.kind === "fact_stopped" ? "stopped" : "learned"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelTitle title={selected?.self ? "About you" : name ? `Who ${name} is` : "Who they are"} right={<span className="text-[11px] text-[var(--c-ink-3)]">{identity.length} facts</span>} />
            {identity.length === 0 ? (
              <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">Name, language, routines, dishes and family rules show here as Saheli learns them.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {identity.map((f: CareFact) => (
                  <div key={f.id} className="rounded-[18px] bg-[var(--c-frame)] p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--c-ink-3)]">{DOMAIN_TITLE[f.domain] ?? f.domain}</p>
                    <p className="mt-2 text-[14px] font-medium leading-snug">{f.text}</p>
                    <p className="mt-2 text-[11px] text-[var(--c-ink-3)]">{SOURCE_LABEL[f.source] ?? f.source}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* keyed by person: nothing typed, opened or shown for one person carries over to the next */}
          {familyId && selectedId && <MemoryHealthPanel key={`h-${selectedId}`} familyId={familyId} subjectId={selectedId} name={name} canEdit={isCaregiver} />}
          {familyId && selectedId && <SkillsPanel key={`s-${selectedId}`} familyId={familyId} subjectId={selectedId} name={name} canEdit={isCaregiver} />}
          {familyId && selectedId && (
            <RecentChangesPanel key={`r-${selectedId}`} familyId={familyId} subjectId={selectedId} name={name} onChanged={reload} refresh={data} canEdit={isCaregiver} />
          )}

          {[
            { label: selected?.self ? "About you" : `About ${name || "them"}`, subject: selectedId ?? "", items: personNotes },
            { label: "About the family", subject: "family", items: familyNotes },
          ].map((g) => (
            <section key={g.subject}>
              <div className="mb-3 mt-2 flex items-center justify-between">
                <PanelTitle title={g.label} />
                <SmallButton icon={Plus} onClick={() => setEditing({ subjectId: g.subject, slug: "", title: "", body: "", isNew: true })}>
                  Add
                </SmallButton>
              </div>
              {g.items.length === 0 ? (
                <Panel className="c-hatch py-8 text-center text-[13px] text-[var(--c-ink-2)]">No notes yet. Saheli writes them from conversations; you can add your own.</Panel>
              ) : (
                <div className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4">
                  {g.items.map((n: MemoryNote) => {
                    const Icon = iconFor(n.title);
                    const lines = noteLines(n.body);
                    return (
                      <article key={`${n.subjectId}/${n.slug}`} className="break-inside-avoid rounded-[24px] bg-[var(--c-card)] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-frame)]">
                              <Icon size={18} />
                            </span>
                            <div>
                              <p className="text-[15px] font-medium">{n.title}</p>
                              <p className="text-[11px] text-[var(--c-ink-3)]">
                                {lines.length} {lines.length === 1 ? "thing" : "things"} · updated {when(n.updatedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setHistoryOf({ kind: "note", target: n.slug, subjectId: selectedId ?? "", owner: n.subjectId, label: n.title })}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] hover:bg-white"
                              aria-label={`History of ${n.title}`}
                            >
                              <ClockCounterClockwise size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing({ subjectId: n.subjectId, slug: n.slug, title: n.title, body: n.body, isNew: false })}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] hover:bg-white"
                              aria-label={`Edit ${n.title}`}
                            >
                              <NotePencil size={15} />
                            </button>
                          </div>
                        </div>
                        <ul className="mt-4 space-y-2">
                          {lines.slice(0, 8).map((l, i) => {
                            const m = l.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)$/);
                            return (
                              <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
                                <span className="min-w-0">
                                  {m ? m[2] : l}
                                  {m && <span className="ml-1.5 text-[11px] text-[var(--c-ink-3)]">{when(`${m[1]}T12:00:00+05:30`)}</span>}
                                </span>
                              </li>
                            );
                          })}
                          {lines.length > 8 && <li className="pl-4 text-[12px] text-[var(--c-ink-3)]">+{lines.length - 8} more</li>}
                        </ul>
                        <div className="mt-4">
                          <Tag tone="light">v{n.version}</Tag>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </>
      )}

      {familyId && <MemoryHistoryDrawer familyId={familyId} item={historyOf} onClose={() => setHistoryOf(null)} onChanged={reload} canEdit={isCaregiver} />}

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
