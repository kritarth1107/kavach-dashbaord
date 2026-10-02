"use client";

import { CaretLeft, CaretRight, Car, Money, ShoppingBag, Wallet } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSpending, type Spending } from "@/lib/care-features-api";
import { cn } from "@/lib/utils";
import { ErrorNote, IST, OnWhatsApp, PageHeading, parseIst, rupees, shortDate } from "./feature-kit";
import { usePerson } from "./person-context";
import { Avatar, Bars, IconCircle, Panel, PanelTitle, Tag } from "./ui";

const SERVICE: Record<string, { name: string; logo?: string }> = {
  swiggy: { name: "Swiggy", logo: "/assets/brands/swiggy.png" },
  instamart: { name: "Instamart", logo: "/assets/brands/instamart.png" },
  zepto: { name: "Zepto", logo: "/assets/brands/zepto.png" },
  blinkit: { name: "Blinkit" },
  apollo: { name: "Apollo 24|7" },
  "1mg": { name: "Tata 1mg" },
  pharmeasy: { name: "PharmEasy" },
  ola: { name: "Ola" },
  uber: { name: "Uber" },
  rapido: { name: "Rapido" },
};
const serviceName = (s: string) => SERVICE[s]?.name ?? s.charAt(0).toUpperCase() + s.slice(1);

function ServiceMark({ service, size = 34 }: { service: string; size?: number }) {
  const logo = SERVICE[service]?.logo;
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" width={size} height={size} className="shrink-0 rounded-[10px] object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-[10px] bg-[var(--c-ink)] font-medium text-[var(--c-accent)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {serviceName(service).charAt(0).toUpperCase()}
    </span>
  );
}

const monthKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST }).slice(0, 7);
function shiftMonth(m: string, by: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
const monthLabel = (m: string) => new Date(`${m}-15T12:00:00+05:30`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: IST });

function Share({ value, total, hi }: { value: number; total: number; hi?: boolean }) {
  return (
    <div className="mt-1.5 h-1.5 rounded-full bg-[var(--c-frame)]">
      <div className={cn("h-full rounded-full", hi ? "bg-[var(--c-accent)]" : "bg-[var(--c-ink)]")} style={{ width: `${total ? Math.max(3, (value / total) * 100) : 0}%` }} />
    </div>
  );
}

export function SpendingPage() {
  const { familyId, selectedId, people, members } = usePerson();
  const [current] = useState(() => monthKey(new Date()));
  const [month, setMonth] = useState(current);
  const [result, setResult] = useState<{ month: string; data: Spending | null; error: string } | null>(null);

  const load = useCallback(async () => {
    if (!familyId || !selectedId) return;
    try {
      setResult({ month, data: await getSpending(familyId, selectedId, month), error: "" });
    } catch (e) {
      setResult({ month, data: null, error: e instanceof Error ? e.message : "Couldn't load spending" });
    }
  }, [familyId, selectedId, month]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const loading = !result || result.month !== month;
  const data = loading ? null : result.data;
  const total = data?.total ?? 0;

  const who = useCallback(
    (id: string) => {
      const p = people.find((x) => x.id === id);
      if (p) return { name: p.self ? "You" : p.name, sub: p.self ? "self care" : p.relation, photo: p.photo };
      const m = members.find((x) => x.userId === id);
      return { name: m?.name ?? "Family", sub: m?.relationship, photo: m?.avatarUrl };
    },
    [people, members],
  );

  const services = useMemo(() => Object.entries(data?.byService ?? {}).sort((a, b) => b[1] - a[1]), [data]);
  const persons = useMemo(() => Object.entries(data?.byPerson ?? {}).sort((a, b) => b[1] - a[1]), [data]);
  const items = useMemo(() => [...(data?.items ?? [])].sort((a, b) => parseIst(b.at).getTime() - parseIst(a.at).getTime()), [data]);
  const weeks = useMemo(() => {
    const w = [0, 0, 0, 0, 0];
    for (const it of data?.items ?? []) {
      const day = Number(parseIst(it.at).toLocaleDateString("en-CA", { timeZone: IST }).slice(8, 10));
      w[Math.min(4, Math.floor((day - 1) / 7))] += it.total;
    }
    return w;
  }, [data]);
  const [y, mo] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const weekLabels = ["1–7", "8–14", "15–21", "22–28", lastDay > 29 ? `29–${lastDay}` : "29"];
  const topWeek = weeks.indexOf(Math.max(...weeks));
  const orders = data?.byKind?.order ?? 0;
  const rides = data?.byKind?.ride ?? 0;
  const otherKinds = Object.entries(data?.byKind ?? {}).filter(([k]) => k !== "order" && k !== "ride");

  return (
    <div className="space-y-4">
      <PageHeading
        light="Family"
        dark="Spending"
        sub="Everything Saheli ordered or booked for the family this month: groceries, medicines and rides."
        right={
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <IconCircle icon={CaretLeft} label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))} />
            <span className="min-w-[150px] text-center text-[15px] font-medium">{monthLabel(month)}</span>
            <IconCircle icon={CaretRight} label="Next month" disabled={month >= current} onClick={() => setMonth((m) => (m >= current ? m : shiftMonth(m, 1)))} className="disabled:opacity-30" />
          </div>
        }
      />

      {result?.error && !loading && <ErrorNote>{result.error}</ErrorNote>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[240px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          ))}
        </div>
      ) : !data || data.count === 0 ? (
        <Panel className="flex flex-col items-center py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-frame)]">
            <Wallet size={24} />
          </span>
          <p className="mt-4 text-[18px] font-medium">Nothing spent in {monthLabel(month).split(" ")[0]}</p>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">Orders and rides Saheli places show here with who they were for. All are cash on delivery.</p>
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <Panel accent className="flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Spent in {monthLabel(month).split(" ")[0]}</p>
                <Wallet size={18} weight="fill" className="text-white" />
              </div>
              <p className="c-num mt-6 text-[52px] leading-none text-white sm:text-[60px]">{rupees(total)}</p>
              <p className="mt-auto pt-6 text-[12px] text-white/80">
                {data.count} {data.count === 1 ? "order or ride" : "orders and rides"} · all cash on delivery
              </p>
            </Panel>
            <Panel>
              <PanelTitle title="Week by week" right={<span className="text-[11px] text-[var(--c-ink-3)]">dates of the month</span>} />
              <div className="mt-8">
                <Bars
                  values={weeks}
                  highlight={weeks[topWeek] > 0 ? [topWeek] : []}
                  labels={weekLabels}
                  height={130}
                  callout={weeks[topWeek] > 0 ? { index: topWeek, text: rupees(weeks[topWeek]) } : undefined}
                />
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Panel>
              <PanelTitle title="By service" />
              <ul className="mt-4 space-y-3.5">
                {services.map(([s, v], i) => (
                  <li key={s} className="flex items-center gap-3">
                    <ServiceMark service={s} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate">{serviceName(s)}</span>
                        <span className="c-num shrink-0">{rupees(v)}</span>
                      </div>
                      <Share value={v} total={total} hi={i === 0} />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <PanelTitle title="By person" />
              <ul className="mt-4 space-y-3.5">
                {persons.map(([id, v], i) => {
                  const w = who(id);
                  return (
                    <li key={id} className="flex items-center gap-3">
                      <Avatar name={w.name} src={w.photo} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="truncate">
                            {w.name}
                            {w.sub && <span className="text-[var(--c-ink-3)]"> · {w.sub}</span>}
                          </span>
                          <span className="c-num shrink-0">{rupees(v)}</span>
                        </div>
                        <Share value={v} total={total} hi={i === 0} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
            <Panel className="flex flex-col md:col-span-2 xl:col-span-1">
              <PanelTitle title="Orders vs rides" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Orders", v: orders, icon: ShoppingBag, hi: false },
                  { label: "Rides", v: rides, icon: Car, hi: true },
                ].map((k) => (
                  <div key={k.label} className="rounded-[18px] bg-[var(--c-frame)] p-4">
                    <p className="flex items-center gap-1.5 text-[12px] text-[var(--c-ink-2)]">
                      <span className={cn("h-2 w-2 rounded-full", k.hi ? "bg-[var(--c-accent)]" : "bg-[var(--c-ink)]")} />
                      {k.label}
                    </p>
                    <p className="c-num mt-2 text-[26px] leading-none">{rupees(k.v)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--c-frame)]">
                <div className="h-full bg-[var(--c-ink)]" style={{ width: `${total ? (orders / total) * 100 : 0}%` }} />
                <div className="h-full bg-[var(--c-accent)]" style={{ width: `${total ? (rides / total) * 100 : 0}%` }} />
              </div>
              {otherKinds.length > 0 && (
                <p className="mt-2 text-[11px] text-[var(--c-ink-3)]">{otherKinds.map(([k, v]) => `${k} ${rupees(v)}`).join(" · ")}</p>
              )}
              <p className="mt-auto flex items-center gap-2 pt-4 text-[12px] text-[var(--c-ink-2)]">
                <Money size={15} /> Every order is cash on delivery. No card is saved.
              </p>
            </Panel>
          </div>

          <Panel>
            <PanelTitle title="Every order and ride" right={<span className="text-[11px] text-[var(--c-ink-3)]">{items.length}</span>} />
            <ul className="mt-3">
              {items.map((it, i) => {
                const w = who(it.subjectId);
                return (
                  <li key={`${it.at}-${i}`} className="flex items-center gap-3 border-b border-[var(--c-line)] py-3 last:border-0">
                    <ServiceMark service={it.service} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{it.goal}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--c-ink-3)]">
                        <span>{shortDate(parseIst(it.at))}</span>·<span>{serviceName(it.service)}</span>·
                        <span className="flex items-center gap-1">
                          <Avatar name={w.name} src={w.photo} size={16} /> {w.name.split(" ")[0]}
                        </span>
                      </p>
                    </div>
                    {it.kind === "ride" && (
                      <span className="hidden sm:inline">
                        <Tag tone="light">Ride</Tag>
                      </span>
                    )}
                    <span className="c-num shrink-0 text-[15px]">{rupees(it.total)}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}

      <OnWhatsApp>ask Saheli &ldquo;How much did we spend this month?&rdquo;</OnWhatsApp>
    </div>
  );
}
