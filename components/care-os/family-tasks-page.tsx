"use client";

import { BellRinging, CheckCircle, Clock, ListChecks } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addFamilyTask, completeFamilyTask, getFamilyTasks, type FamilyTask } from "@/lib/care-features-api";
import { useFamily } from "@/components/dashboard/family-context";
import { cn } from "@/lib/utils";
import { Drawer, ErrorNote, INPUT, LABEL, OnWhatsApp, PageHeading, clock, dayKey, dayWord, parseIst, shortDate } from "./feature-kit";
import { callName, usePerson } from "./person-context";
import { Avatar, DarkButton, Panel, PanelTitle, PillTabs, SmallButton, Tag } from "./ui";

type Filter = "all" | "mine" | "others";
type Draft = { title: string; assignee: string; date: string; time: string; about: string };

export function FamilyTasksPage() {
  const { userId } = useFamily();
  const { familyId, selectedId, people, members, me } = usePerson();
  const myId = userId ?? people.find((p) => p.self)?.id ?? me.id;
  const [tasks, setTasks] = useState<FamilyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now());
  const subject = selectedId;

  const load = useCallback(async () => {
    if (!familyId || !subject) return;
    try {
      setTasks(await getFamilyTasks(familyId, subject));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load tasks");
    } finally {
      setLoading(false);
    }
  }, [familyId, subject]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const joined = useMemo(() => members.filter((m) => m.userId && m.status === "joined"), [members]);
  const nameOf = useCallback(
    (id: string | null) => {
      if (!id) return "Someone";
      if (id === myId) return "You";
      const m = members.find((x) => x.userId === id);
      return m ? [m.prefix, m.name].filter(Boolean).join(" ") || m.name : "Family member";
    },
    [members, myId],
  );
  const avatarOf = (id: string | null) => members.find((x) => x.userId === id)?.avatarUrl ?? null;
  const fullName = (id: string | null) => members.find((x) => x.userId === id)?.name ?? nameOf(id);
  const aboutOf = (id: string) => {
    const p = people.find((x) => x.id === id);
    return p ? (p.self ? "Self care" : callName(p)) : null;
  };

  const shown = useMemo(
    () => tasks.filter((t) => (filter === "mine" ? t.assignee === myId : filter === "others" ? t.assignee !== myId : true)),
    [tasks, filter, myId],
  );
  const open = useMemo(
    () =>
      shown
        .filter((t) => t.status === "open")
        .sort((a, b) => (a.due ? parseIst(a.due).getTime() : Infinity) - (b.due ? parseIst(b.due).getTime() : Infinity)),
    [shown],
  );
  const done = useMemo(
    () => shown.filter((t) => t.status !== "open").sort((a, b) => parseIst(b.updatedAt).getTime() - parseIst(a.updatedAt).getTime()).slice(0, 12),
    [shown],
  );
  const allOpen = tasks.filter((t) => t.status === "open");
  const overdue = allOpen.filter((t) => t.due && parseIst(t.due).getTime() < now).length;
  const mineOpen = allOpen.filter((t) => t.assignee === myId).length;
  const workload = joined
    .map((m) => ({ id: m.userId as string, name: nameOf(m.userId), full: m.name, src: m.avatarUrl, n: allOpen.filter((t) => t.assignee === m.userId).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  async function markDone(t: FamilyTask) {
    if (!familyId || !subject) return;
    setBusy(t.id);
    setError("");
    try {
      const updated = await completeFamilyTask(familyId, subject, t.id);
      setTasks((xs) => xs.map((x) => (x.id === t.id ? (updated ?? { ...x, status: "done", updatedAt: new Date().toISOString() }) : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't mark it done");
    } finally {
      setBusy(null);
    }
  }

  function openForm() {
    setFormError("");
    setDraft({ title: "", assignee: myId ?? joined[0]?.userId ?? "", date: "", time: "", about: selectedId ?? people[0]?.id ?? "" });
  }
  const closeForm = useCallback(() => setDraft(null), []);

  async function save() {
    if (!draft || !familyId) return;
    const about = draft.about || subject;
    if (!about) return;
    setSaving(true);
    setFormError("");
    try {
      const due = draft.date ? `${draft.date}T${draft.time || "09:00"}` : undefined;
      const created = await addFamilyTask(familyId, about, { title: draft.title.trim(), assignee: draft.assignee, due });
      if (created) setTasks((xs) => [created, ...xs.filter((x) => x.id !== created.id)]);
      else void load();
      setDraft(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Couldn't add the task");
    } finally {
      setSaving(false);
    }
  }

  const card = (t: FamilyTask) => {
    const due = t.due ? parseIst(t.due) : null;
    const late = t.status === "open" && due !== null && due.getTime() < now;
    const about = aboutOf(t.subjectId);
    return (
      <li key={t.id} className="rounded-[18px] bg-[var(--c-frame)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={cn("text-[15px] font-medium leading-snug", t.status !== "open" && "text-[var(--c-ink-2)] line-through decoration-[var(--c-ink-3)]")}>{t.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--c-ink-2)]">
              <span className="flex items-center gap-1.5">
                <Avatar name={fullName(t.assignee)} src={avatarOf(t.assignee)} size={20} /> {nameOf(t.assignee)}
              </span>
              {due && (
                <span className={cn("flex items-center gap-1 tabular-nums", late && "font-medium text-[var(--c-accent)]")}>
                  <Clock size={13} /> {dayWord(due, now)}, {clock(due)}
                </span>
              )}
              {about && <span className="rounded-full bg-[var(--c-card)] px-2 py-[3px] text-[11px] font-medium text-[var(--c-ink-2)]">For {about}</span>}
              {late && <Tag>Overdue</Tag>}
              {t.status === "cancelled" && <span className="rounded-full bg-[var(--c-card)] px-2 py-[3px] text-[11px] font-medium text-[var(--c-ink-2)]">Cancelled</span>}
              {t.status === "expired" && <span className="rounded-full bg-[var(--c-card)] px-2 py-[3px] text-[11px] font-medium text-[var(--c-ink-2)]">Expired</span>}
            </div>
            <p className="mt-2 text-[11px] text-[var(--c-ink-3)]">
              {t.status === "open"
                ? `Assigned by ${nameOf(t.assignedBy)} · ${shortDate(parseIst(t.createdAt))}`
                : `${t.status === "done" ? "Done" : "Closed"} ${shortDate(parseIst(t.updatedAt))}${t.note && t.note !== "done" ? ` · ${t.note}` : ""}`}
            </p>
          </div>
          {t.status === "open" ? (
            <SmallButton dark icon={CheckCircle} disabled={busy === t.id} onClick={() => void markDone(t)} className="shrink-0">
              {busy === t.id ? "Saving…" : "Mark done"}
            </SmallButton>
          ) : (
            t.status === "done" && <CheckCircle size={20} weight="fill" className="shrink-0 text-[var(--c-ink)]" />
          )}
        </div>
      </li>
    );
  };

  const today = dayKey(new Date(now));

  return (
    <div className="space-y-4">
      <PageHeading
        light="Family"
        dark="Tasks"
        sub="Who's doing what for the people you care for. Anyone in the family can pick up a task and mark it done."
        right={<DarkButton onClick={openForm} className="self-start lg:self-auto">New task</DarkButton>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <PillTabs<Filter>
            value={filter}
            onChange={setFilter}
            tabs={[
              { id: "all", label: `All · ${tasks.length}` },
              { id: "mine", label: `Mine · ${tasks.filter((t) => t.assignee === myId).length}` },
              { id: "others", label: `Others · ${tasks.filter((t) => t.assignee !== myId).length}` },
            ]}
          />
          {error && <ErrorNote>{error}</ErrorNote>}
          {loading ? (
            <div className="h-[300px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          ) : (
            <>
              <Panel>
                <PanelTitle title="Open" right={<span className="text-[11px] text-[var(--c-ink-3)]">{open.length} by due time</span>} />
                {open.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-frame)]">
                      <ListChecks size={24} />
                    </span>
                    <p className="mt-4 text-[16px] font-medium">Nothing open</p>
                    <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">Add a task for anyone in the family; Saheli reminds them on WhatsApp.</p>
                  </div>
                ) : (
                  <ul className="mt-4 space-y-2">{open.map(card)}</ul>
                )}
              </Panel>
              {done.length > 0 && (
                <Panel>
                  <PanelTitle title="Done recently" right={<span className="text-[11px] text-[var(--c-ink-3)]">{done.length}</span>} />
                  <ul className="mt-4 space-y-2">{done.map(card)}</ul>
                </Panel>
              )}
            </>
          )}
          <OnWhatsApp>tell Saheli &ldquo;Ravi, call Maa tonight at 8&rdquo;, or reply &ldquo;done&rdquo; to her reminder.</OnWhatsApp>
        </div>

        <aside className="space-y-4">
          <Panel accent className="flex flex-col">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Open tasks</p>
            <p className="c-num mt-4 text-[56px] leading-none text-white">{allOpen.length}</p>
            <p className="mt-2 text-[12px] text-white/80">
              {overdue ? `${overdue} overdue · ` : ""}
              {mineOpen} {mineOpen === 1 ? "is" : "are"} yours
            </p>
          </Panel>
          {workload.length > 0 && (
            <Panel>
              <PanelTitle title="Who has what" />
              <ul className="mt-3 space-y-3">
                {workload.map((x) => (
                  <li key={x.id} className="flex items-center gap-3">
                    <Avatar name={x.full} src={x.src} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="truncate">{x.name}</span>
                        <span className="c-num">{x.n}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-[var(--c-frame)]">
                        <div className={cn("h-full rounded-full", x.id === myId ? "bg-[var(--c-accent)]" : "bg-[var(--c-ink)]")} style={{ width: `${(x.n / allOpen.length) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel>
            <p className="flex items-center gap-2 text-[14px] font-medium">
              <BellRinging size={16} /> Reminders on WhatsApp
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">
              When a task is due, Saheli reminds the person it&apos;s assigned to on WhatsApp. They can reply &ldquo;done&rdquo; and it shows here.
            </p>
          </Panel>
        </aside>
      </div>

      <Drawer open={Boolean(draft)} light="New" dark="task" onClose={closeForm}>
        {draft && (
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label className="block">
              <span className={LABEL}>What needs doing</span>
              <input className={INPUT} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={140} placeholder="Call Maa tonight" required autoFocus />
            </label>
            <label className="block">
              <span className={LABEL}>Who does it</span>
              <select className={INPUT} value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} required>
                {joined.map((m) => (
                  <option key={m.userId} value={m.userId as string}>
                    {m.userId === myId ? `You (${m.name})` : m.name}
                    {m.role === "care_recipient" ? " · cared for" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className={LABEL}>Due date (optional)</span>
                <input type="date" className={INPUT} value={draft.date} min={today} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </label>
              <label className="block min-w-0">
                <span className={LABEL}>Time</span>
                <input type="time" className={INPUT} value={draft.time} disabled={!draft.date} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
              </label>
            </div>
            <label className="block">
              <span className={LABEL}>Who it&apos;s about</span>
              <select className={INPUT} value={draft.about} onChange={(e) => setDraft({ ...draft, about: e.target.value })}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.self ? "Self care (you)" : `${p.name}${p.relation ? ` · ${p.relation}` : ""}`}
                  </option>
                ))}
              </select>
            </label>
            <p className="flex items-start gap-2 rounded-[14px] bg-[var(--c-card)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">
              <BellRinging size={15} className="mt-[2px] shrink-0 text-[var(--c-accent)]" />
              {draft.date
                ? `Saheli reminds ${draft.assignee === myId ? "you" : nameOf(draft.assignee).split(" ")[0]} on WhatsApp at ${draft.time || "09:00"} on the day.`
                : "Saheli tells the assignee on WhatsApp. Add a due time and she reminds them when it's due."}
            </p>
            {formError && <ErrorNote>{formError}</ErrorNote>}
            <div className="mt-auto flex justify-end gap-2 pt-2">
              <SmallButton onClick={closeForm}>Cancel</SmallButton>
              <DarkButton type="submit" disabled={saving || !draft.title.trim() || !draft.assignee}>
                {saving ? "Adding…" : "Add task"}
              </DarkButton>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}
