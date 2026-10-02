"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Asterisk,
  CalendarBlank,
  CaretDown,
  CalendarDots,
  Clock,
  DotsThree,
  Hourglass,
  Minus,
  Plus,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Bars, Check, DarkButton, Panel, PanelTitle, PillTabs, SmallButton, Tag } from "./ui";

export type DoseStatus = "taken" | "reminded" | "missed" | "due" | "upcoming" | "skipped" | "unmarked";

export type HomeData = {
  person: { id: string; name: string; callAs: string };
  saheliSays: string;
  mood?: string;
  lastHeard?: string;
  doses: Array<{ id: string; time: string; name: string; dose?: string; status: DoseStatus }>;
  week: { taken: number; scheduled: number; streakDays: number; adherence: number[]; labels: string[] };
  trends?: Partial<Record<"bp" | "sugar", { values: number[]; labels: string[]; unit: string }>>;
  bp?: { value: string; at: string; trend: number[]; change?: string; changeDir?: "up" | "down"; state: "in range" | "high" | "low" };
  sugar?: { value: string; note: string; change?: string };
  weight?: { value: string; note: string; change?: string };
  needsYou: Array<{ id: string; title: string; meta?: string; approveLabel?: string; declineLabel?: string }>;
  followUps: Array<{ id: string; title: string; when: string }>;
  tasks: Array<{ id: string; label: string; status: string; total?: string }>;
  timeline: Array<{ id: string; time: string; text: string }>;
};

type Trend = "medicines" | "bp" | "sugar";

export function CareHome({
  data,
  onDecide,
  busy,
}: {
  data: HomeData;
  onDecide?: (id: string, approve: boolean) => void;
  busy?: string | null;
}) {
  const [trend, setTrend] = useState<Trend>("medicines");
  const series = trend === "bp" || trend === "sugar" ? data.trends?.[trend] : undefined;
  const taken = data.doses.filter((d) => d.status === "taken").length;
  const nextToday = data.doses.find((d) => d.status === "due" || d.status === "upcoming");
  const next = nextToday ?? data.doses[0];
  const nextLabel = next ? (nextToday ? next.name : `${next.name} · tomorrow`) : null;
  const weekPct = data.week.scheduled ? Math.round((data.week.taken / data.week.scheduled) * 100) : 0;
  const today = data.week.adherence.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-end gap-5">
          <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block font-light text-[var(--c-ink-3)]">{data.person.callAs}&apos;s Care</span>
            <span className="block font-medium">Today</span>
          </h1>
          <div className="relative mb-2 hidden sm:block">
            <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[var(--c-accent)] text-white">
              <Asterisk size={34} weight="bold" />
            </span>
            <span className="absolute -bottom-1 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--c-ink)] text-[var(--c-frame)]">
              <ArrowDownRight size={13} weight="bold" />
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" className="flex h-12 items-center gap-2.5 rounded-full bg-[var(--c-card)] pl-1.5 pr-4 text-[13px]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-frame)]">
              <CalendarBlank size={16} />
            </span>
            {data.week.labels[0]} – {data.week.labels[data.week.labels.length - 1]}
            <CaretDown size={12} />
          </button>
          <button type="button" className="flex h-12 items-center gap-2.5 rounded-full bg-[var(--c-card)] pl-1.5 pr-4 text-[13px]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-frame)]">
              <Clock size={16} />
            </span>
            24h
            <CaretDown size={12} />
          </button>
          <Link href="/dashboard/saheli">
            <DarkButton>Full day</DarkButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.9fr] xl:grid-cols-[1fr_2fr_1fr] [&>*]:min-w-0">
        <Panel className="flex flex-col">
          <PanelTitle
            title="Medicines"
            right={
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="h-3.5 w-3.5 rounded-full bg-[var(--c-ink)]" /> Today
              </span>
            }
          />
          <div className="mt-8 flex items-start gap-3">
            <p className="c-num text-[56px] leading-none">
              {taken}
              <span className="text-[var(--c-ink-3)]">/{data.doses.length}</span>
            </p>
            {weekPct > 0 && (
              <Tag trend="up" className="mt-2">
                {weekPct}% this week
              </Tag>
            )}
          </div>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.06em]">Doses taken today</p>
          <div className="mt-auto flex items-end justify-between pt-8">
            <p className="max-w-[170px] text-[10px] font-medium uppercase leading-relaxed tracking-[0.04em]">
              Every dose reminded on <span className="underline underline-offset-2">WhatsApp</span> at its time
            </p>
            <div className="flex flex-col items-center gap-1 text-[var(--c-ink-2)]" aria-hidden>
              <Plus size={16} />
              <span className="h-px w-4 bg-[var(--c-ink-3)]" />
              <Minus size={16} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 border-t border-[var(--c-line)] pt-4">
            <div className="border-r border-[var(--c-line)] pr-3">
              <p className="c-num text-[30px] leading-none">
                {data.week.taken}
                <span className="text-[16px] text-[var(--c-ink-3)]">/{data.week.scheduled}</span>
              </p>
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.04em]">This week</p>
            </div>
            <div className="pl-4">
              <div className="flex items-start justify-between">
                <p className="c-num text-[30px] leading-none">{data.week.streakDays}</p>
                <Tag trend="up">days</Tag>
              </div>
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.04em]">On-time streak</p>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelTitle title="Care trends" right={<Hourglass size={18} />} />
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="text-[13px]">Next dose</span>
            <span className="flex items-start gap-2">
              <span className="c-num text-[34px] leading-none">{next?.time ?? "—"}</span>
              {nextLabel && <Tag>{nextLabel}</Tag>}
            </span>
            {data.bp && (
              <span className="flex items-start gap-2">
                <span className="c-num text-[34px] leading-none">{data.bp.value}</span>
                {data.bp.change && <Tag trend={data.bp.changeDir}>{data.bp.change}</Tag>}
              </span>
            )}
          </div>
          <div className="mt-6 flex gap-3">
            <div className="flex w-8 flex-col justify-between pb-6 text-[10px] text-[var(--c-ink-3)]">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
            <div className="flex-1">
              {series && series.values.length ? (
                <Bars
                  values={series.values}
                  highlight={[series.values.length - 1]}
                  labels={series.labels}
                  height={150}
                  callout={{ index: series.values.length - 1, text: `${series.values[series.values.length - 1]} ${series.unit}` }}
                />
              ) : trend === "medicines" ? (
                <Bars
                  values={data.week.adherence}
                  highlight={[today]}
                  labels={data.week.labels.map((l, i) => (i % 3 === 0 || i === today ? l : null))}
                  max={100}
                  height={150}
                  callout={{ index: today, text: `${data.week.adherence[today]}%` }}
                />
              ) : (
                <div className="c-hatch flex h-[150px] items-center justify-center rounded-[16px] text-[12px] text-[var(--c-ink-2)]">
                  No readings yet. Saheli logs them when {data.person.callAs} shares one.
                </div>
              )}
            </div>
          </div>
          <PillTabs<Trend>
            className="mt-5"
            value={trend}
            onChange={setTrend}
            tabs={[
              { id: "medicines", label: "Medicines" },
              { id: "bp", label: "Blood pressure" },
              { id: "sugar", label: "Sugar" },
            ]}
          />
        </Panel>

        <Panel className="flex flex-col lg:col-span-2 xl:col-span-1">
          <PanelTitle title="Needs you" right={<DotsThree size={20} weight="bold" />} />
          <div className="mt-4 rounded-[18px] bg-[var(--c-frame)] p-4">
            {data.needsYou.length === 0 ? (
              <p className="text-[13px] text-[var(--c-ink-2)]">Nothing waiting on you.</p>
            ) : (
              data.needsYou.slice(0, 2).map((n, i) => (
                <div key={n.id} className={cn(i > 0 && "mt-4 border-t border-[var(--c-line)] pt-4")}>
                  <p className="text-[14px] font-medium leading-snug">{n.title}</p>
                  {n.meta && <p className="mt-1 text-[12px] leading-relaxed text-[var(--c-ink-2)]">{n.meta}</p>}
                  <div className="mt-3 flex gap-2">
                    <SmallButton dark disabled={busy === n.id} onClick={() => onDecide?.(n.id, true)}>
                      {n.approveLabel ?? "Approve"}
                    </SmallButton>
                    <SmallButton disabled={busy === n.id} onClick={() => onDecide?.(n.id, false)}>
                      {n.declineLabel ?? "Not now"}
                    </SmallButton>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-5">
            <PanelTitle title="Today's doses" right={<span className="text-[11px] text-[var(--c-ink-2)]">{taken} done</span>} />
            <div className="mt-2">
              {data.doses.map((d) => (
                <Check
                  key={d.id}
                  checked={d.status === "taken"}
                  label={d.name}
                  meta={d.time}
                  tag={
                    d.status === "due" ? (
                      <Tag>due</Tag>
                    ) : d.status === "missed" ? (
                      <Tag tone="danger">missed</Tag>
                    ) : d.status === "skipped" ? (
                      <Tag tone="danger">skipped</Tag>
                    ) : d.status === "unmarked" ? (
                      <Tag tone="light">not marked</Tag>
                    ) : d.status === "reminded" ? (
                      <Tag tone="light">reminded</Tag>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.45fr_1.15fr_0.7fr_0.7fr] [&>*]:min-w-0">
        <Panel className="relative overflow-hidden">
          <div className="relative z-10 sm:pr-[150px]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-accent)]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-2)]">Saheli says</span>
            </div>
            <p className="mt-3 text-[19px] font-medium leading-snug tracking-[-0.02em]">{data.saheliSays}</p>
            <div className="mt-5 flex items-center gap-3">
              <Link href="/dashboard/saheli">
                <SmallButton dark icon={CalendarDots}>
                  See the day
                </SmallButton>
              </Link>
              {data.lastHeard && <span className="text-[12px] text-[var(--c-ink-2)]">Last heard {data.lastHeard}</span>}
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-16 -right-16 hidden h-[300px] w-[300px] sm:block" aria-hidden>
            {[300, 230, 160].map((s) => (
              <span key={s} className="absolute rounded-full border border-[var(--c-line)]" style={{ width: s, height: s, left: (300 - s) / 2, top: (300 - s) / 2 }} />
            ))}
            <span className="absolute left-[95px] top-[95px] flex h-[110px] w-[110px] flex-col items-center justify-center rounded-full bg-[var(--c-accent)] text-white shadow-[0_20px_40px_-12px_rgba(211,84,30,0.55)]">
              <span className="c-num text-[26px] leading-none">{data.mood ?? "—"}</span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.06em]">mood</span>
            </span>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[22px] font-medium uppercase leading-[1.05] tracking-[-0.02em]">
              Today
              <br />
              so far
            </p>
            <p className="max-w-[130px] text-right text-[11px] leading-snug text-[var(--c-ink-2)]">
              <span className="font-medium text-[var(--c-ink)]">From the ledger.</span> What actually happened.
            </p>
          </div>
          {data.timeline.length === 0 && (
            <p className="c-hatch mt-4 flex flex-1 items-center justify-center rounded-[16px] px-4 py-8 text-center text-[12.5px] text-[var(--c-ink-2)]">
              Nothing logged yet today. Reminders, doses and messages appear here as they happen.
            </p>
          )}
          <ol className="mt-4 space-y-2">
            {data.timeline.slice(0, 4).map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-[14px] bg-[var(--c-frame)] px-3 py-2.5">
                <span className="rounded-full bg-[var(--c-card)] px-2 py-0.5 text-[11px] tabular-nums">{t.time}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{t.text}</span>
              </li>
            ))}
          </ol>
        </Panel>

        {data.bp && (
          <Panel accent className="flex flex-col">
            <div className="flex items-start justify-between">
              <Tag tone="light" trend={data.bp.changeDir} className="!text-[var(--c-accent)]">
                {data.bp.change ?? data.bp.state}
              </Tag>
              <span className="text-right text-[10px] font-medium uppercase leading-tight tracking-[0.04em]">
                Blood
                <br />
                pressure
              </span>
            </div>
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className={cn("h-3 w-3 rounded-full", i === 2 ? "border-[3px] border-white bg-[var(--c-accent)]" : "bg-white")} />
              ))}
            </div>
            <p className="mt-auto pt-6 text-[11px] font-medium">mmHg</p>
            <p className="c-num text-[34px] leading-none">{data.bp.value}</p>
            <p className="mt-1 text-[11px] opacity-70">{data.bp.at}</p>
          </Panel>
        )}

        {!data.bp && !data.sugar && !data.weight && (
          <Panel className="flex flex-col justify-between md:col-span-2 xl:col-span-2">
            <PanelTitle title="Health readings" />
            <p className="mt-6 text-[22px] font-medium leading-snug tracking-[-0.02em]">
              No BP, sugar or weight yet.
            </p>
            <p className="mt-2 max-w-sm text-[12.5px] text-[var(--c-ink-2)]">
              When {data.person.callAs} tells Saheli a reading on WhatsApp, or a lab report is uploaded, it shows here with its trend.
            </p>
          </Panel>
        )}
        <div className={cn("grid grid-cols-2 gap-4 md:col-span-2 xl:col-span-1 xl:grid-cols-1", !data.sugar && !data.weight && "hidden")}>
          {data.sugar && (
            <Panel>
              <p className="text-[12px] text-[var(--c-ink-2)]">Sugar</p>
              <p className="c-num mt-3 text-[32px] leading-none">
                {data.sugar.value}
                <span className="text-[14px] text-[var(--c-ink-3)]"> mg/dL</span>
              </p>
              <p className="mt-2 text-[11px] text-[var(--c-ink-2)]">{data.sugar.change ?? data.sugar.note}</p>
            </Panel>
          )}
          {data.weight && (
            <Panel>
              <p className="text-[12px] text-[var(--c-ink-2)]">Weight</p>
              <p className="c-num mt-3 text-[32px] leading-none">
                {data.weight.value}
                <span className="text-[14px] text-[var(--c-ink-3)]"> kg</span>
              </p>
              <p className="mt-2 text-[11px] text-[var(--c-ink-2)]">{data.weight.change ?? data.weight.note}</p>
            </Panel>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
        <Panel>
          <PanelTitle title="Saheli is following up" right={<span className="text-[11px] text-[var(--c-ink-2)]">checks back on her own</span>} />
          <ul className="mt-3">
            {data.followUps.length === 0 && <li className="py-2 text-[13px] text-[var(--c-ink-3)]">Nothing open.</li>}
            {data.followUps.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 border-b border-[var(--c-line)] py-3 last:border-0">
                <span className="text-[13px]">{f.title}</span>
                <span className="shrink-0 rounded-full bg-[var(--c-frame)] px-2.5 py-1 text-[11px] text-[var(--c-ink-2)]">{f.when}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <PanelTitle
            title="Orders & rides"
            right={
              <Link href="/dashboard/saheli/tasks" className="flex items-center gap-1 text-[11px]">
                All <ArrowUpRight size={12} weight="bold" />
              </Link>
            }
          />
          <ul className="mt-3">
            {data.tasks.length === 0 && <li className="py-2 text-[13px] text-[var(--c-ink-3)]">Nothing running.</li>}
            {data.tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 border-b border-[var(--c-line)] py-3 last:border-0">
                <span className="min-w-0 truncate text-[13px]">{t.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {t.total && <span className="text-[13px] font-medium tabular-nums">{t.total}</span>}
                  <Tag>{t.status}</Tag>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
