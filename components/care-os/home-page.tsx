"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFamilyIntegrations } from "@/lib/api";
import { forPerson, getCareHome, getCareOverview, getPortrait, latestDiaryLine, resolveFact, taskInput, type CareHomeSummary, type Portrait } from "@/lib/care-memory-api";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { HomeV3 } from "./home-v3";
import { callName, usePerson } from "./person-context";
import { DarkButton, Panel } from "./ui";

export function CareHomePage() {
  const { familyId, selected, selectedId, isCaregiver, isRecipient, loading, people, members, me } = usePerson();
  const router = useRouter();
  const [state, setState] = useState<{ key: string; data: CareHomeSummary | null; snap: string | null; portrait: Portrait | null; error: string }>({
    key: "",
    data: null,
    snap: null,
    portrait: null,
    error: "",
  });
  const [kavachNumber, setKavachNumber] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const req = useRef(0);
  const key = `${familyId}|${selectedId}`;

  useEffect(() => {
    if (!familyId || !selectedId || !isCaregiver) return;
    const id = ++req.current;
    // Saheli's line about the day: the diary her nightly dream keeps in the care record (trust plan A1).
    const diary = getCareOverview(familyId, selectedId).then((o) => latestDiaryLine(o.notes, selectedId)).catch(() => null);
    const home = getCareHome(familyId, selectedId).then(
      (data) => ({ data, error: "" }),
      (err: unknown) => ({ data: null, error: err instanceof Error ? err.message : "Couldn't load" }),
    );
    Promise.all([home, diary, getPortrait(familyId, selectedId).catch(() => null)]).then(([h, snap, portrait]) => {
      if (id !== req.current) return;
      // A failed refresh keeps what this person already showed, never the person before (audit 2026-10-14: B's Home
      // showed A's mood and doses when B's load failed).
      setState((s) => {
        const same = s.key === key;
        return { key, data: h.data ?? (same ? s.data : null), snap: snap ?? (same ? s.snap : null), portrait: portrait ?? (same ? s.portrait : null), error: h.error };
      });
    });
  }, [familyId, selectedId, isCaregiver, key, tick]);

  useEffect(() => {
    if (!familyId) return;
    getFamilyIntegrations(familyId)
      .then(({ data }) => setKavachNumber(data?.whatsapp.kavachNumber ?? null))
      .catch(() => setKavachNumber(null));
  }, [familyId]);

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
      // stuck work, a task that wants more than a yes, or a kind the engine added later: it is handled on Orders & rides
      if (item.kind !== "fact" && (item.kind !== "task" || item.input !== "confirm")) {
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
  // When the day's summary fails, the page still shows what did load, with a note and a retry in its place.
  if (!fresh || (!state.data && !state.error)) return <Skeleton />;
  const member = members.find((m) => m.userId === selected.id);
  const phone = member?.phone ? `${member.phoneCountryCode ?? ""}${member.phone}` : null;
  let home: CareHomeSummary | null = null;
  if (state.data) {
    // only this person's orders and rides, and only their decisions (founder 2026-10-13: his own showed on his mother's page)
    const tasks = forPerson(state.data.tasks, selected.id);
    const others = new Set(state.data.tasks.filter((t) => !tasks.includes(t)).map((t) => t.id));
    const needsYou = state.data.needsYou.filter((n) => !dismissed.includes(n.id) && !(n.kind === "task" && n.taskId && others.has(n.taskId)));
    home = { ...state.data, tasks, needsYou };
  }
  return (
    <HomeV3
      person={{ id: selected.id, name: selected.name, callAs: callName(selected), self: !!selected.self, photo: selected.photo, phone }}
      me={(me.name || "").split(" ")[0]}
      home={home}
      portrait={state.portrait}
      saheliSays={state.snap || null}
      kavachNumber={kavachNumber}
      onDecide={decide}
      onRetry={() => setTick((n) => n + 1)}
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
