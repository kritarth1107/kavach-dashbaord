"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDailySnapshot, type DailySnapshot } from "@/lib/activity-api";
import { getCareHome, resolveFact, taskInput, type CareHomeSummary } from "@/lib/care-memory-api";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { CareHome, type HomeData } from "./home";
import { callName, usePerson } from "./person-context";
import { DarkButton, Panel } from "./ui";

const IST = "Asia/Kolkata";
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST });
const fmtDay = (day: string) => new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST });

function ago(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} d ago`;
}

function when(iso: string | null) {
  if (!iso) return "open";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? fmtTime(iso) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: IST });
}

const STATUS_LABEL: Record<string, string> = {
  queued: "starting",
  running: "working",
  needs_input: "needs you",
  awaiting_confirm: "confirm",
  done: "done",
  failed: "failed",
  cancelled: "cancelled",
};

function toHomeData(s: CareHomeSummary, person: { id: string; name: string; callAs: string }, snap: DailySnapshot | null): HomeData {
  const bp = s.vitals.bp;
  const sugar = s.vitals.sugar;
  const weight = s.vitals.weight;
  const timelineText = (k: string, t: string) => (k === "reminder_sent" ? t.replace(/^dose due:\s*/i, "Reminder sent: ") : t);
  return {
    person,
    saheliSays:
      snap?.summary?.trim() ||
      (s.timeline.length ? `${s.timeline.length} things logged today. Open the full day to see each one.` : `Nothing logged yet today. Saheli will check in with ${person.callAs}.`),
    mood: snap?.mood ? snap.mood.charAt(0).toUpperCase() + snap.mood.slice(1) : undefined,
    lastHeard: ago(s.lastHeardAt),
    doses: s.doses.map((d) => ({ ...d, dose: d.dose ?? undefined })),
    week: { ...s.week, labels: s.week.days.map(fmtDay) },
    trends: {
      bp: bp?.trend.length ? { values: bp.trend, labels: bp.trend.map(() => ""), unit: "mmHg" } : undefined,
      sugar: sugar?.trend.length ? { values: sugar.trend, labels: sugar.trend.map(() => ""), unit: "mg/dL" } : undefined,
    },
    bp: bp
      ? {
          value: bp.value,
          at: `${fmtDay(bp.at.slice(0, 10))}, ${fmtTime(bp.at)}`,
          trend: bp.trend,
          change: bp.change ? `${bp.change.pct}%` : undefined,
          changeDir: bp.change?.dir,
          state: bp.redFlag ? (/low/i.test(bp.redFlag) ? "low" : "high") : "in range",
        }
      : undefined,
    sugar: sugar ? { value: sugar.value.replace(/[^\d.]/g, "") || sugar.value, note: `${fmtDay(sugar.at.slice(0, 10))}, ${fmtTime(sugar.at)}`, change: sugar.change ? `${sugar.change.dir === "up" ? "+" : "−"}${sugar.change.pct}% from last reading` : undefined } : undefined,
    weight: weight ? { value: weight.value.replace(/[^\d.]/g, "") || weight.value, note: fmtDay(weight.at.slice(0, 10)), change: weight.change ? `${weight.change.dir === "up" ? "+" : "−"}${weight.change.pct}% from last reading` : undefined } : undefined,
    needsYou: s.needsYou.map((n) => ({
      id: n.id,
      title: n.title,
      meta: n.meta,
      approveLabel:
        n.kind === "refill" ? "Reorder" : n.kind === "appointment" ? "Open" : n.kind === "task" ? (n.input === "confirm" ? "Confirm" : "Open") : "Approve",
      declineLabel:
        n.kind === "refill" || n.kind === "appointment" ? "Later" : n.kind === "task" && n.input === "confirm" ? "Decline" : n.kind === "task" ? "Later" : "Reject",
    })),
    followUps: s.followUps.map((f) => ({ id: f.id, title: f.title, when: when(f.wakeAt) })),
    tasks: s.tasks.slice(0, 4).map((t) => ({ id: t.id, label: `${t.goal} · ${t.serviceLabel}`, status: STATUS_LABEL[t.status] ?? t.status, total: t.result?.total })),
    timeline: s.timeline.map((t) => ({ id: String(t.id), time: fmtTime(t.at), text: timelineText(t.kind, t.text) })),
  };
}

export function CareHomePage() {
  const { familyId, selected, selectedId, isCaregiver, isRecipient, loading, people } = usePerson();
  const router = useRouter();
  const [state, setState] = useState<{ key: string; data: CareHomeSummary | null; snap: DailySnapshot | null; error: string }>({ key: "", data: null, snap: null, error: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const req = useRef(0);
  const key = `${familyId}|${selectedId}`;

  useEffect(() => {
    if (!familyId || !selectedId || !isCaregiver) return;
    const id = ++req.current;
    Promise.all([getCareHome(familyId, selectedId), getDailySnapshot(familyId, selectedId).catch(() => null)])
      .then(([data, snap]) => id === req.current && setState({ key, data, snap, error: "" }))
      .catch((err: unknown) => id === req.current && setState((s) => ({ ...s, key, error: err instanceof Error ? err.message : "Couldn't load" })));
  }, [familyId, selectedId, isCaregiver, key, tick]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const decide = useCallback(
    async (id: string, approve: boolean) => {
      if (!familyId || !selectedId || !state.data) return;
      const item = state.data.needsYou.find((n) => n.id === id);
      if (!item) return;
      if (item.kind === "refill" || item.kind === "appointment") {
        if (approve) router.push(item.kind === "refill" ? `/dashboard/saheli/care?recipient=${selectedId}` : `/dashboard/care-team?recipient=${selectedId}`);
        else setDismissed((d) => [...d, id]);
        return;
      }
      if (item.kind === "task" && item.input !== "confirm") {
        router.push(`/dashboard/saheli/tasks?recipient=${selectedId}`);
        return;
      }
      setBusy(id);
      try {
        if (item.kind === "fact" && item.key) await resolveFact(familyId, selectedId, item.key, approve);
        if (item.kind === "task" && item.taskId) await taskInput(familyId, selectedId, item.taskId, "confirm", approve ? "yes" : "no");
        setTick((n) => n + 1);
      } finally {
        setBusy(null);
      }
    },
    [familyId, selectedId, state.data, router],
  );

  if (isRecipient) return <DashboardHome />;
  if (loading) return <Skeleton />;
  if (!people.length || !selected) {
    return (
      <Panel className="flex flex-col items-start gap-4 p-8">
        <h1 className="text-[40px] leading-[1.05] tracking-[-0.035em]">
          <span className="block font-light text-[var(--c-ink-3)]">Welcome to</span>
          <span className="block font-medium">Kavach CareOS</span>
        </h1>
        <p className="max-w-md text-[14px] text-[var(--c-ink-2)]">Add the person you care for. Saheli starts looking after them on WhatsApp as soon as they join.</p>
        <Link href="/dashboard/family">
          <DarkButton>Add family member</DarkButton>
        </Link>
      </Panel>
    );
  }
  const fresh = state.key === key;
  if (!fresh || !state.data) {
    if (fresh && state.error) {
      return (
        <Panel className="p-8">
          <p className="text-[16px] font-medium">Couldn&apos;t load {callName(selected)}&apos;s day</p>
          <p className="mt-1 text-[13px] text-[var(--c-ink-2)]">{state.error}</p>
        </Panel>
      );
    }
    return <Skeleton />;
  }
  return (
    <CareHome
      data={toHomeData(
        { ...state.data, needsYou: state.data.needsYou.filter((n) => !dismissed.includes(n.id)) },
        { id: selected.id, name: selected.name, callAs: callName(selected) },
        state.snap,
      )}
      onDecide={decide}
      busy={busy}
    />
  );
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-[110px] w-[320px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
      <div className="grid gap-4 xl:grid-cols-[1fr_2fr_1fr]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[420px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
        ))}
      </div>
    </div>
  );
}
