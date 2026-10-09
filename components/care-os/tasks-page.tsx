"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import { getWork, type WorkItem } from "@/lib/care-features-api";
import { taskInput } from "@/lib/care-memory-api";
import { ErrorNote, OnWhatsApp, PageHeading, ago, clock, dayWord, parseIst } from "./feature-kit";
import { usePerson } from "./person-context";
import { Panel, PanelTitle, SmallButton, Tag } from "./ui";

const KIND: Record<string, string> = {
  order: "Order", ride: "Ride", booking: "Booking", family_task: "Family task", appointment: "Appointment", refill: "Refill",
  delivery: "Delivery", question: "Question", follow_up: "Follow-up", check_in: "Check-in", confirm: "Confirm", watch: "Watching",
};

function due(item: WorkItem, now: number): string | null {
  if (!item.due_at) return null;
  const d = parseIst(item.due_at);
  const past = d.getTime() < now;
  const day = dayWord(d, now);
  return past ? `was due ${day === "Today" ? "" : `${day.toLowerCase()} `}${clock(d)}` : `${day === "Today" ? "" : `${day} `}${clock(d)}`;
}

function ItemRow({ item, tone, who, now, onDecide, busy }: { item: WorkItem; tone: "accent" | "light" | "ok"; who: string; now: number; onDecide?: (yes: boolean) => void; busy?: boolean }) {
  const when = due(item, now);
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--c-line)] py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13.5px] font-medium" title={item.title}>{item.title}</p>
        <p className="mt-0.5 text-[12px] text-[var(--c-ink-2)]">
          {KIND[item.kind] ?? "Task"}
          {item.updated_at ? ` · updated ${ago(parseIst(item.updated_at), now)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        {item.stuck ? <Tag tone="danger">Stuck · {item.stuck}</Tag> : <Tag tone={tone}>{who} · {item.next_action}</Tag>}
        {when && <span className="text-[12px] text-[var(--c-ink-2)]">{when}</span>}
        {onDecide && (
          <span className="flex gap-2">
            <SmallButton disabled={busy} onClick={() => onDecide(false)}>Decline</SmallButton>
            <SmallButton disabled={busy} onClick={() => onDecide(true)} className="border-transparent bg-[var(--c-accent)] text-[var(--c-accent-ink)] hover:bg-[var(--c-accent)] hover:opacity-90">
              Approve
            </SmallButton>
          </span>
        )}
      </div>
    </div>
  );
}

export function TasksPage() {
  const { userId } = useFamily();
  const { familyId, selectedId, me } = usePerson();
  const myId = userId ?? me.id;
  const [items, setItems] = useState<WorkItem[]>([]);
  const [doneWeek, setDoneWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!familyId || !selectedId) return;
    try {
      const all = await getWork(familyId, selectedId, true);
      setItems(all.items.filter((i) => i.state === "working" || i.state === "waiting"));
      setDoneWeek(all.items.filter((i) => i.state === "done" && i.updated_at && now - parseIst(i.updated_at).getTime() < 7 * 86_400_000).length);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load tasks");
    } finally {
      setLoading(false);
    }
  }, [familyId, selectedId, now]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const groups = useMemo(() => {
    const stuckFirst = (a: WorkItem, b: WorkItem) => Number(!!b.stuck) - Number(!!a.stuck) || (a.due_at ?? "9").localeCompare(b.due_at ?? "9");
    const mine = items.filter((i) => i.owner === myId).sort(stuckFirst);
    const saheli = items.filter((i) => i.owner === "saheli").sort(stuckFirst);
    const others = new Map<string, WorkItem[]>();
    for (const i of items) {
      if (i.owner && i.owner !== myId && i.owner !== "saheli") others.set(i.owner, [...(others.get(i.owner) ?? []), i]);
    }
    return { mine, saheli, others: [...others.entries()].map(([id, list]) => ({ id, name: list[0].ownerName ?? "Family member", list: list.sort(stuckFirst) })) };
  }, [items, myId]);

  async function decide(item: WorkItem, yes: boolean) {
    if (!familyId || !selectedId) return;
    setBusy(item.id);
    try {
      await taskInput(familyId, selectedId, item.id.replace(/^task:/, ""), "approve", yes ? "yes" : "no");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your answer");
    } finally {
      setBusy(null);
    }
  }

  const stuck = items.filter((i) => i.stuck).length;
  const first = (name: string) => name.split(" ")[0];

  return (
    <div className="space-y-5">
      <PageHeading
        light="Tasks"
        dark="Everything handed over"
        sub="Every job shows who acts next, what, and by when. Stuck ones come first."
        right={
          <div className="flex flex-wrap gap-2">
            <Tag tone="light">Open {items.length}</Tag>
            {stuck > 0 && <Tag tone="danger">Stuck {stuck}</Tag>}
            <Tag tone="light">Done this week {doneWeek}</Tag>
          </div>
        }
      />
      {error && <ErrorNote>{error}</ErrorNote>}
      {!loading && !items.length && (
        <Panel>
          <p className="text-[13px] text-[var(--c-ink-2)]">Nothing open right now. Orders, rides, reminders, family tasks and questions show up here with who acts next.</p>
        </Panel>
      )}
      {!!groups.mine.length && (
        <Panel>
          <PanelTitle title="Needs you" />
          <div className="mt-3">
            {groups.mine.map((i) => (
              <ItemRow key={i.id} item={i} tone="accent" who="You" now={now} busy={busy === i.id}
                onDecide={i.source === "task" && i.next_action?.startsWith("approve") ? (yes) => void decide(i, yes) : undefined} />
            ))}
          </div>
        </Panel>
      )}
      {groups.others.map((g) => (
        <Panel key={g.id}>
          <PanelTitle title={`Waiting on ${first(g.name)}`} />
          <div className="mt-3">
            {g.list.map((i) => <ItemRow key={i.id} item={i} tone="light" who={first(g.name)} now={now} />)}
          </div>
        </Panel>
      ))}
      {!!groups.saheli.length && (
        <Panel>
          <PanelTitle title="Saheli is on it" />
          <div className="mt-3">
            {groups.saheli.map((i) => <ItemRow key={i.id} item={i} tone="ok" who="Saheli" now={now} />)}
          </div>
        </Panel>
      )}
      <OnWhatsApp>“kya baaki hai?” or “mujhe kya karna hai?”</OnWhatsApp>
    </div>
  );
}
