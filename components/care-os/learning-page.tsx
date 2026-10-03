"use client";

import { Brain, ChartLineUp, Clock, Wrench } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { request } from "@/lib/activity-api";
import { cn } from "@/lib/utils";
import { ErrorNote, PageHeading } from "./feature-kit";
import { Panel, PanelTitle, SmallButton, Tag } from "./ui";

type Playbook = {
  version: number;
  status: "draft" | "rejected" | "canary" | "live" | "retired" | "blocked";
  createdAt: string;
  note: string;
  lessons: Record<string, string[]>;
  examples: Record<string, Array<{ context: string; reply: string; lang: string }>>;
  gate: { passed?: boolean; lessons?: Record<string, string[]> };
  canary: { n_canary?: number; n_live?: number; mean_canary?: number; mean_live?: number; decision?: string; z?: number };
  approvedBy: string | null;
  liveSince: string | null;
};
type Overview = {
  messages: number;
  scored: number;
  avgScore: number | null;
  corpus: number;
  playbooks: Playbook[];
  trend: Array<{ week: string; situation: string; n: number; avgScore: number }>;
  gaps: Array<{ category: string; asks: number; families: number; examples: string[] }>;
  timing: Array<{ situation: string; windows: Array<{ from: string; to: string; sent: number; replyRate: number | null }> }>;
};

const STATUS_TONE: Record<Playbook["status"], "accent" | "dark" | "light" | "danger"> = {
  live: "dark",
  canary: "accent",
  draft: "light",
  retired: "light",
  rejected: "danger",
  blocked: "danger",
};
const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const sc = (x: number | null | undefined) => (x == null ? "—" : x.toFixed(2));

export function LearningPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData((await request<Overview>("/api/admin/learning?weeks=8", {}, 45_000)) ?? null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (version: number, action: "approve" | "block") => {
    setBusy(version);
    try {
      await request(`/api/admin/learning/playbooks/${version}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  };

  // Latest week vs the week before, per situation.
  const trend = useMemo(() => {
    const weeks = [...new Set((data?.trend ?? []).map((t) => t.week))].sort();
    const [prev, last] = [weeks[weeks.length - 2], weeks[weeks.length - 1]];
    const by = new Map<string, { last?: number; prev?: number; n: number }>();
    for (const t of data?.trend ?? []) {
      const row = by.get(t.situation) ?? { n: 0 };
      if (t.week === last) row.last = t.avgScore;
      if (t.week === prev) row.prev = t.avgScore;
      row.n += t.n;
      by.set(t.situation, row);
    }
    return [...by.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [data]);

  return (
    <div className="space-y-4">
      <PageHeading
        light="Saheli"
        dark="Learning"
        sub="How Saheli is learning to reply and when, from what worked across families that agreed to share (anonymised). Safety rules never change here."
      />
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data ? (
        <div className="h-[200px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { l: "Messages (8 weeks)", v: data.messages.toLocaleString("en-IN") },
              { l: "Scored", v: data.scored.toLocaleString("en-IN") },
              { l: "Average score (−1 to 1)", v: sc(data.avgScore) },
              { l: "Shared examples", v: data.corpus.toLocaleString("en-IN") },
            ].map((x) => (
              <Panel key={x.l}>
                <p className="text-[12px] text-[var(--c-ink-2)]">{x.l}</p>
                <p className="c-num mt-3 text-[36px] leading-none">{x.v}</p>
              </Panel>
            ))}
          </div>

          <Panel>
            <PanelTitle title="Playbooks" right={<Brain size={18} />} />
            <p className="mt-1 text-[12px] text-[var(--c-ink-3)]">
              A new playbook is learned every Sunday, checked by the safety gate, then tried on 10% of families. Worse ones roll back by themselves; better
              ones wait for your approval.
            </p>
            {data.playbooks.length === 0 ? (
              <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">No playbook yet. The first is learned once there are enough shared examples.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.playbooks.map((p) => (
                  <li key={p.version} className="rounded-[18px] bg-[var(--c-frame)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium">Version {p.version}</span>
                        <Tag tone={STATUS_TONE[p.status]}>{p.status}</Tag>
                        <span className="text-[11px] text-[var(--c-ink-3)]">{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </div>
                      <div className="flex gap-2">
                        {(p.status === "canary" || (p.status === "draft" && p.gate?.passed)) && (
                          <SmallButton dark disabled={busy === p.version} onClick={() => void act(p.version, "approve")}>
                            Make live
                          </SmallButton>
                        )}
                        {["canary", "live", "draft"].includes(p.status) && (
                          <SmallButton disabled={busy === p.version} onClick={() => void act(p.version, "block")}>
                            Block
                          </SmallButton>
                        )}
                      </div>
                    </div>
                    {p.canary?.decision && (
                      <p className="mt-2 text-[12px] text-[var(--c-ink-2)]">
                        Trial: {p.canary.decision.replace("_", " ")} · score {sc(p.canary.mean_canary)} vs live {sc(p.canary.mean_live)} ({p.canary.n_canary ?? 0} vs{" "}
                        {p.canary.n_live ?? 0} messages)
                      </p>
                    )}
                    {p.gate?.passed === false && (
                      <p className="mt-2 text-[12px] text-[var(--c-accent)]">
                        Safety gate stopped it: {Object.values(p.gate.lessons ?? {}).flat().slice(0, 2).join("; ")}
                      </p>
                    )}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[12px] text-[var(--c-ink-2)]">
                        {Object.values(p.lessons ?? {}).flat().length} lessons in {Object.keys(p.lessons ?? {}).length} situations
                      </summary>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {Object.entries(p.lessons ?? {}).map(([situation, items]) => (
                          <div key={situation} className="rounded-[14px] bg-[var(--c-card)] p-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-3)]">{situation.replace("_", " ")}</p>
                            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px]">
                              {items.map((l) => (
                                <li key={l}>{l}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel>
              <PanelTitle title="How replies are going" right={<ChartLineUp size={18} />} />
              {trend.length === 0 ? (
                <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">No scored messages yet.</p>
              ) : (
                <table className="mt-4 w-full text-[12.5px]">
                  <thead className="text-left text-[11px] text-[var(--c-ink-3)]">
                    <tr>
                      <th className="pb-2 font-medium">Situation</th>
                      <th className="pb-2 font-medium">Messages</th>
                      <th className="pb-2 font-medium">Last week</th>
                      <th className="pb-2 font-medium">Week before</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.map(([s, r]) => (
                      <tr key={s} className="border-t border-[var(--c-line)]">
                        <td className="py-1.5">{s.replace("_", " ")}</td>
                        <td>{r.n}</td>
                        <td className={cn(r.last != null && r.prev != null && (r.last >= r.prev ? "font-medium" : "text-[var(--c-accent)]"))}>{sc(r.last)}</td>
                        <td className="text-[var(--c-ink-2)]">{sc(r.prev)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel>
              <PanelTitle title="Asked for, but Saheli can't yet" right={<Wrench size={18} />} />
              {data.gaps.length === 0 ? (
                <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">Nothing recorded in the last 30 days.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.gaps.slice(0, 8).map((g) => (
                    <li key={g.category} className="rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3">
                      <div className="flex justify-between text-[13px]">
                        <span className="font-medium">{g.category.replace("_", " ")}</span>
                        <span className="text-[var(--c-ink-2)]">
                          {g.asks} asks · {g.families} families
                        </span>
                      </div>
                      {g.examples[0] && <p className="mt-1 text-[12px] text-[var(--c-ink-2)]">“{g.examples[0]}”</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelTitle title="When people answer" right={<Clock size={18} />} />
            <p className="mt-1 text-[12px] text-[var(--c-ink-3)]">Reply rate by time of day for messages Saheli starts (all families). Reminders and alerts are never moved.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {data.timing.map((t) => (
                <div key={t.situation}>
                  <p className="mb-2 text-[12px] font-medium">{t.situation === "checkin" ? "Weekly check-ins" : "Follow-ups"}</p>
                  <div className="flex items-end gap-1.5">
                    {t.windows.map((w) => (
                      <div key={w.from} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex h-20 w-full items-end rounded-[8px] bg-[var(--c-frame)]">
                          <div className="w-full rounded-[8px] bg-[var(--c-ink)]" style={{ height: `${Math.round((w.replyRate ?? 0) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-[var(--c-ink-3)]">{w.from.slice(0, 2)}</span>
                        <span className="text-[10px]">{pct(w.replyRate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
