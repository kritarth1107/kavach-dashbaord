"use client";

import { CaretLeft, CaretRight, Car, Money, ShoppingBag, Wallet } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSpending, type Spending } from "@/lib/care-features-api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ErrorNote, IST, OnWhatsApp, PageHeading, parseIst, rupees, shortDate } from "./feature-kit";
import { callName, possessive, usePerson } from "./person-context";
import { Bars, IconCircle, Panel, PanelTitle, Tag } from "./ui";

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
      className="inline-flex shrink-0 items-center justify-center rounded-[10px] bg-[var(--c-solid)] font-medium text-[var(--c-accent-text)]"
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
      <div className={cn("h-full rounded-full", hi ? "bg-[var(--c-accent)]" : "bg-[var(--c-solid)]")} style={{ width: `${total ? Math.max(3, (value / total) * 100) : 0}%` }} />
    </div>
  );
}

export function SpendingPage() {
  // one person's spending: only the orders and rides placed for them (founder 2026-10-13: his mother's page counted his)
  const { familyId, selectedId, selected } = usePerson();
  const name = selected?.self ? "you" : callName(selected) || "them";
  const [current] = useState(() => monthKey(new Date()));
  const [month, setMonth] = useState(current);
  const [result, setResult] = useState<{ key: string; data: Spending | null; error: string } | null>(null);
  const key = `${selectedId}|${month}`;

  const latest = useRef(key);
  useEffect(() => {
    latest.current = key;
  }, [key]);

  const load = useCallback(async () => {
    if (!familyId || !selectedId) return;
    const k = `${selectedId}|${month}`;
    // an answer for a person or month no longer on screen is dropped (a slow one used to land on the next person)
    const keep = (r: { key: string; data: Spending | null; error: string }) => latest.current === k && setResult(r);
    try {
      keep({ key: k, data: await getSpending(familyId, selectedId, month), error: "" });
    } catch (e) {
      keep({ key: k, data: null, error: e instanceof Error ? e.message : "Couldn't load spending" });
    }
  }, [familyId, selectedId, month]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  // keyed by person and month: the previous person's numbers never show while the next one's load
  const loading = !result || result.key !== key;
  const data = loading ? null : result.data;
  const total = data?.total ?? 0;

  const services = useMemo(() => Object.entries(data?.byService ?? {}).sort((a, b) => b[1] - a[1]), [data]);
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
        light={possessive(selected)}
        dark="Spending"
        sub={
          <>
            Everything Saheli ordered or booked for {name} this month: groceries, medicines and rides. Only {selected?.self ? "yours" : "theirs"}, not the rest of
            the family&apos;s; the whole family&apos;s total is on{" "}
            <Link href={`/dashboard/limits${selectedId ? `?recipient=${selectedId}` : ""}`} className="underline underline-offset-2">
              Limits &amp; approvals
            </Link>
            .
          </>
        }
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
          <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">Orders and rides Saheli places for {name} show here. All are cash on delivery.</p>
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <Panel accent className="flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] opacity-80">Spent in {monthLabel(month).split(" ")[0]}</p>
                <Wallet size={18} weight="fill" />
              </div>
              <p className="c-num mt-6 text-[52px] leading-none sm:text-[60px]">{rupees(total)}</p>
              <p className="mt-auto pt-6 text-[12px] opacity-80">
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

          <div className="grid gap-4 md:grid-cols-2">
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
            <Panel className="flex flex-col">
              <PanelTitle title="Orders vs rides" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Orders", v: orders, icon: ShoppingBag, hi: false },
                  { label: "Rides", v: rides, icon: Car, hi: true },
                ].map((k) => (
                  <div key={k.label} className="rounded-[18px] bg-[var(--c-frame)] p-4">
                    <p className="flex items-center gap-1.5 text-[12px] text-[var(--c-ink-2)]">
                      <span className={cn("h-2 w-2 rounded-full", k.hi ? "bg-[var(--c-accent)]" : "bg-[var(--c-solid)]")} />
                      {k.label}
                    </p>
                    <p className="c-num mt-2 text-[26px] leading-none">{rupees(k.v)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--c-frame)]">
                <div className="h-full bg-[var(--c-solid)]" style={{ width: `${total ? (orders / total) * 100 : 0}%` }} />
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
              {items.map((it, i) => (
                <li key={`${it.at}-${i}`} className="flex items-center gap-3 border-b border-[var(--c-line)] py-3 last:border-0">
                  <ServiceMark service={it.service} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{it.goal}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--c-ink-3)]">
                      <span>{shortDate(parseIst(it.at))}</span>·<span>{serviceName(it.service)}</span>
                    </p>
                  </div>
                  {it.kind === "ride" && (
                    <span className="hidden sm:inline">
                      <Tag tone="light">Ride</Tag>
                    </span>
                  )}
                  <span className="c-num shrink-0 text-[15px]">{rupees(it.total)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      <OnWhatsApp>ask Saheli &ldquo;How much did we spend this month?&rdquo; for the whole family.</OnWhatsApp>
    </div>
  );
}
