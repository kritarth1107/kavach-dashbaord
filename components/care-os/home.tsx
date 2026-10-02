"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bed,
  CaretRight,
  ChatCircleDots,
  Car,
  CheckCircle,
  Clock,
  Drop,
  ForkKnife,
  Heartbeat,
  Phone,
  Pill,
  Scales,
  ShieldCheck,
  ShoppingBagOpen,
  Smiley,
  Sparkle,
  Thermometer,
  WarningCircle,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ChaiAndTulsi, ElderMan, ElderWoman, SaheliOrb } from "./illustrations";
import { BigStat, Card, CardTitle, Empty, IconBubble, InkButton, AccentButton, Pill as Chip, Ring, SoftButton, Sparkline, type Tone } from "./ui";

export type DoseStatus = "taken" | "reminded" | "missed" | "due" | "upcoming" | "skipped";
export type HomeData = {
  caregiverName: string;
  person: { id: string; name: string; callAs: string; gender?: "female" | "male" };
  greeting: string;
  headline: string;
  saheliSays: string;
  mood?: { label: string; tone: Tone };
  lastHeard?: string;
  doses: Array<{ id: string; time: string; name: string; dose?: string; note?: string; status: DoseStatus }>;
  vitals: Array<{ kind: "bp" | "sugar" | "weight" | "temperature" | "spo2"; value: string; unit: string; state: "good" | "watch" | "high" | "low"; when: string; trend: number[] }>;
  needsYou: Array<{ id: string; title: string; detail: string; kind: "confirm" | "order" | "alert" }>;
  followUps: Array<{ id: string; title: string; when: string }>;
  tasks: Array<{ id: string; kind: "order" | "ride"; service: string; goal: string; status: string; total?: string }>;
  timeline: Array<{ id: string; time: string; label: string; summary: string; tone: Tone; icon: "pill" | "alarm" | "heart" | "food" | "mood" | "alert" | "order" | "chat" }>;
  life: Array<{ label: string; value: string; icon: "food" | "walk" | "sleep" | "water" }>;
};

const DOSE: Record<DoseStatus, { label: string; tone: Tone }> = {
  taken: { label: "Taken", tone: "mint" },
  reminded: { label: "Reminded", tone: "sky" },
  missed: { label: "Missed", tone: "rose" },
  skipped: { label: "Skipped", tone: "butter" },
  due: { label: "Due now", tone: "accent" },
  upcoming: { label: "Later", tone: "plain" },
};

const VITAL: Record<HomeData["vitals"][number]["kind"], { label: string; icon: PhosphorIcon; tone: Tone }> = {
  bp: { label: "Blood pressure", icon: Heartbeat, tone: "rose" },
  sugar: { label: "Sugar", icon: Drop, tone: "sky" },
  weight: { label: "Weight", icon: Scales, tone: "lavender" },
  temperature: { label: "Temperature", icon: Thermometer, tone: "peach" },
  spo2: { label: "Oxygen", icon: Heartbeat, tone: "mint" },
};

const STATE: Record<HomeData["vitals"][number]["state"], { label: string; tone: Tone }> = {
  good: { label: "In range", tone: "mint" },
  watch: { label: "Keep an eye", tone: "butter" },
  high: { label: "High", tone: "rose" },
  low: { label: "Low", tone: "rose" },
};

const TL_ICON: Record<HomeData["timeline"][number]["icon"], PhosphorIcon> = {
  pill: Pill,
  alarm: Clock,
  heart: Heartbeat,
  food: ForkKnife,
  mood: Smiley,
  alert: WarningCircle,
  order: ShoppingBagOpen,
  chat: ChatCircleDots,
};

const LIFE_ICON = { food: ForkKnife, walk: Heartbeat, sleep: Bed, water: Drop } as const;

export function CareHome({ data }: { data: HomeData }) {
  const Portrait = data.person.gender === "male" ? ElderMan : ElderWoman;
  const taken = data.doses.filter((d) => d.status === "taken").length;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 [&>*]:min-w-0">
      {/* Hero */}
      <Card className="relative overflow-hidden p-6 sm:p-8 xl:col-span-8" delay={0}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <Portrait className="h-28 w-28 sm:h-36 sm:w-36" title={data.person.name} />
            {data.mood && (
              <Chip tone={data.mood.tone} icon={Smiley} className="absolute -bottom-1 left-1/2 -translate-x-1/2 shadow-sm">
                {data.mood.label}
              </Chip>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--c-ink-3)]">{data.greeting}</p>
            <h1 className="c-serif mt-1 text-[30px] leading-[1.1] sm:text-[38px]">{data.headline}</h1>
            <div className="mt-4 flex items-start gap-3 rounded-[20px] bg-[var(--c-card-solid)] p-3.5">
              <SaheliOrb className="h-8 w-8 shrink-0" />
              <p className="text-[13.5px] leading-relaxed text-[var(--c-ink-2)]">
                <span className="font-semibold text-[var(--c-ink)]">Saheli: </span>
                {data.saheliSays}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {data.lastHeard && <Chip icon={ChatCircleDots}>Last heard {data.lastHeard}</Chip>}
              <Link href="/dashboard/chat">
                <SoftButton size="sm" icon={ChatCircleDots}>
                  Ask Saheli about {data.person.callAs}
                </SoftButton>
              </Link>
              <SoftButton size="sm" icon={Phone}>
                Call {data.person.callAs}
              </SoftButton>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <Ring value={taken} total={data.doses.length} label="Doses today" size={124} />
          </div>
        </div>
      </Card>

      {/* Needs you */}
      <Card tone="ink" className="flex flex-col p-6 xl:col-span-4" delay={60}>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold opacity-70">Needs you</p>
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--c-accent)] px-2 text-[12px] font-bold text-white">
            {data.needsYou.length}
          </span>
        </div>
        {data.needsYou.length === 0 ? (
          <div className="mt-6 flex flex-1 flex-col items-start justify-end">
            <ShieldCheck size={36} weight="duotone" className="text-[#f3a77c]" />
            <p className="c-serif mt-3 text-[24px] leading-tight">Nothing waiting on you.</p>
            <p className="mt-1 text-[13px] opacity-60">Saheli will message you if something needs a decision.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.needsYou.slice(0, 2).map((n) => (
              <li key={n.id} className="rounded-[20px] bg-white/[0.07] p-4">
                <p className="c-serif text-[19px] leading-snug">{n.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed opacity-65">{n.detail}</p>
                <div className="mt-3 flex gap-2">
                  <AccentButton size="sm" icon={CheckCircle}>
                    {n.kind === "order" ? "Confirm" : "Approve"}
                  </AccentButton>
                  <button type="button" className="h-8 rounded-full px-3.5 text-[12px] font-semibold text-white/75 ring-1 ring-white/20 hover:bg-white/10">
                    {n.kind === "order" ? "Decline" : "Not now"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Medicines today */}
      <Card className="xl:col-span-8" delay={120}>
        <CardTitle
          icon={Pill}
          tone="lavender"
          title="Medicines today"
          hint={`${taken} of ${data.doses.length} taken · reminders go on WhatsApp at each time`}
          action={
            <Link href="/dashboard/saheli/care" className="flex items-center gap-1 text-[12px] font-semibold text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">
              Edit <CaretRight size={12} weight="bold" />
            </Link>
          }
        />
        <ol className="c-scroll mt-5 flex gap-3 overflow-x-auto pb-1">
          {data.doses.map((d) => {
            const s = DOSE[d.status];
            return (
              <li
                key={d.id}
                className={cn(
                  "relative min-w-[168px] flex-1 rounded-[22px] p-4",
                  d.status === "due" ? "bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "bg-[var(--c-card-solid)]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="c-num text-[24px] leading-none">{d.time}</span>
                  {d.status === "taken" ? (
                    <CheckCircle size={22} weight="fill" className="text-[var(--c-mint-ink)]" />
                  ) : (
                    <Chip tone={d.status === "due" ? "ink" : s.tone}>{s.label}</Chip>
                  )}
                </div>
                <p className="mt-4 text-[14px] font-semibold leading-tight">{d.name}</p>
                <p className={cn("mt-0.5 text-[12px]", d.status === "due" ? "opacity-70" : "text-[var(--c-ink-3)]")}>
                  {[d.dose, d.note].filter(Boolean).join(" · ")}
                </p>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Life today */}
      <Card tone="peach" className="xl:col-span-4" delay={160}>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold">{data.person.callAs}&apos;s day</p>
          <Sparkle size={18} weight="duotone" />
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2.5">
          {data.life.map((l) => {
            const Icon = LIFE_ICON[l.icon];
            return (
              <li key={l.label} className="rounded-[18px] bg-white/55 p-3 dark:bg-black/15">
                <Icon size={18} weight="duotone" />
                <p className="mt-2 text-[11px] font-medium opacity-70">{l.label}</p>
                <p className="text-[13px] font-semibold leading-snug">{l.value}</p>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Vitals */}
      {data.vitals.map((v, i) => {
        const meta = VITAL[v.kind];
        const st = STATE[v.state];
        return (
          <Card key={v.kind} className="xl:col-span-4" delay={200 + i * 40}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <IconBubble icon={meta.icon} tone={meta.tone} size="sm" />
                <span className="text-[13px] font-semibold">{meta.label}</span>
              </div>
              <Chip tone={st.tone}>{st.label}</Chip>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
              <BigStat value={v.value} unit={v.unit} sub={<span className="text-[var(--c-ink-3)]">{v.when}</span>} />
              <Sparkline points={v.trend} className={cn("h-10 w-28", `text-[var(--c-${meta.tone}-ink)]`)} />
            </div>
          </Card>
        );
      })}

      {/* Timeline */}
      <Card className="xl:col-span-8" delay={320}>
        <CardTitle
          icon={Clock}
          tone="sky"
          title="Today so far"
          hint="What actually happened, as Saheli recorded it"
          action={
            <Link href="/dashboard/saheli" className="flex items-center gap-1 text-[12px] font-semibold text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">
              Full day <ArrowUpRight size={12} weight="bold" />
            </Link>
          }
        />
        {data.timeline.length === 0 ? (
          <Empty art={<ChaiAndTulsi className="h-24 w-40" />} title="A quiet morning" body="Nothing has happened yet today. Reminders and messages will appear here." />
        ) : (
          <ol className="relative mt-5 space-y-1 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-[var(--c-line)]">
            {data.timeline.map((t) => {
              const Icon = TL_ICON[t.icon];
              return (
                <li key={t.id} className="relative flex gap-3 rounded-[18px] p-1.5 hover:bg-[var(--c-card-solid)]">
                  <IconBubble icon={Icon} tone={t.tone} size="md" className="relative z-10 ring-4 ring-[var(--c-bg)]" />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13.5px] font-semibold">{t.label}</p>
                      <span className="shrink-0 text-[12px] tabular-nums text-[var(--c-ink-3)]">{t.time}</span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">{t.summary}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <div className="flex flex-col gap-4 xl:col-span-4">
        {/* Following up */}
        <Card delay={360}>
          <CardTitle icon={ChatCircleDots} tone="butter" title="Saheli is following up" hint="She will check back on her own" />
          <ul className="mt-4 space-y-2">
            {data.followUps.length === 0 && <li className="text-[13px] text-[var(--c-ink-3)]">Nothing open.</li>}
            {data.followUps.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-[18px] bg-[var(--c-card-solid)] p-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--c-butter-ink)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug">{f.title}</p>
                  <p className="text-[11.5px] text-[var(--c-ink-3)]">{f.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Orders & rides */}
        <Card delay={400}>
          <CardTitle
            icon={ShoppingBagOpen}
            tone="mint"
            title="Orders & rides"
            hint="On your family's own accounts · cash on delivery"
            action={
              <Link href="/dashboard/saheli/tasks" aria-label="All orders and rides" className="text-[var(--c-ink-2)] hover:text-[var(--c-ink)]">
                <ArrowUpRight size={16} weight="bold" />
              </Link>
            }
          />
          <ul className="mt-4 space-y-2">
            {data.tasks.length === 0 && <li className="text-[13px] text-[var(--c-ink-3)]">Nothing running.</li>}
            {data.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-[18px] bg-[var(--c-card-solid)] p-3">
                <IconBubble icon={t.kind === "ride" ? Car : ShoppingBagOpen} tone="mint" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{t.goal}</p>
                  <p className="text-[11.5px] text-[var(--c-ink-3)]">
                    {t.service} · {t.status}
                    {t.total ? ` · ${t.total}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <InkButton className="w-full" icon={ChatCircleDots}>
          Message {data.person.callAs} through Saheli
        </InkButton>
      </div>
    </div>
  );
}
