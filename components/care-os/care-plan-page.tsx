"use client";
/** The Care plan (design approved 2026-10-13): the person first, what waits for the family, the week's pillbox, their
 *  medicines, allergies, food, people and day; the whole record (every kind, with history) below. */

import { CheckCircle, Phone, Plus, Pill, Warning } from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";
import { getDailySnapshot, type DailySnapshot } from "@/lib/activity-api";
import { getCareHome, getPortrait, resolveFact, type CareFact, type CareHomeSummary, type Portrait, type PortraitDose, type VitalSummary } from "@/lib/care-memory-api";
import { getStock, type StockRow } from "@/lib/care-features-api";
import { cn } from "@/lib/utils";
import { AccessGate, useRecipientSelection } from "@/components/dashboard/activity/activity-shared";
import { SaheliCarePage } from "@/components/dashboard/saheli/saheli-care-page";
import { Banner, useAction, useCareOverview } from "@/components/dashboard/saheli/saheli-shared";
import { PageHeading, SideDrawer, telHref, useLoad } from "./care-kit";
import { callName, possessive, usePerson } from "./person-context";
import { Bubble, PILL_COLORS, PersonPhoto, PillShape, cap } from "./portrait-kit";
import { RefillsPanel } from "./refills-panel";
import { DarkButton, Panel, PanelTitle, SmallButton, Tag } from "./ui";

const FOOD: Record<string, string> = { before_food: "before food", after_food: "after food", with_food: "with food", empty_stomach: "empty stomach" };
const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const isNone = (f: CareFact) => f.key.endsWith(":none");
const hm = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const time12 = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
const shortLanguage = (t?: string | null) => (t ? t.split(/[,(]/)[0].trim() : null);
const heard = (note?: string | null) => (note?.startsWith("heard: ") ? note.slice(7).replace(/^"|"$/g, "").trim() : null);

function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-[26px]" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 120},${22 - ((v - lo) / (hi - lo || 1)) * 18}`).join(" ");
  return (
    <svg viewBox="0 0 120 26" className="mt-1 h-[26px] w-full" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Vital({ label, v, warnWhenFlag = true }: { label: string; v: VitalSummary; warnWhenFlag?: boolean }) {
  return (
    <div className="rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--c-ink-2)]">
        {label}
        {v && warnWhenFlag ? v.redFlag ? <Tag tone="accent">Check</Tag> : <Tag tone="ok">OK</Tag> : v ? <span className="text-[10.5px] text-[var(--c-ink-3)]">{new Date(v.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}</span> : null}
      </div>
      {v ? (
        <>
          <p className="c-num mt-1 text-[24px] leading-tight">
            {v.value}
            {v.unit && <span className="ml-1 text-[12px] text-[var(--c-ink-3)]">{v.unit}</span>}
          </p>
          <Spark values={v.trend} color={v.redFlag ? "var(--c-accent)" : "var(--c-solid)"} />
        </>
      ) : (
        <p className="mt-2 text-[12px] text-[var(--c-ink-3)]">Not logged yet</p>
      )}
    </div>
  );
}

type Cell = { doses: PortraitDose[]; state: "empty" | "taken" | "missed" | "unmarked" | "today" | "later" };
const SLOTS: Array<{ id: string; label: string; from: number; to: number }> = [
  { id: "morning", label: "Morning", from: 240, to: 720 },
  { id: "afternoon", label: "Afternoon", from: 720, to: 1020 },
  { id: "evening", label: "Evening", from: 1020, to: 1200 },
  { id: "night", label: "Night", from: 1200, to: 1680 },
];
const slotOf = (t: string) => {
  const m = hm(t) < 240 ? hm(t) + 1440 : hm(t);
  return SLOTS.find((s) => m >= s.from && m < s.to)?.id ?? "night";
};

function cellOf(doses: PortraitDose[], isToday: boolean): Cell {
  if (!doses.length) return { doses, state: "empty" };
  if (doses.some((d) => d.status === "missed")) return { doses, state: "missed" };
  if (doses.some((d) => d.status === "unmarked" || d.status === "reminded")) return { doses, state: "unmarked" };
  if (doses.every((d) => d.status === "taken" || d.status === "skipped")) return { doses, state: "taken" };
  return { doses, state: isToday ? "today" : "later" };
}

function Pillbox({ week, colorOf }: { week: Portrait["week"]; colorOf: (name: string) => string }) {
  const rows = SLOTS.filter((s) => week.some((d) => d.doses.some((x) => slotOf(x.time) === s.id)));
  const scheduled = week.flatMap((d) => d.doses).filter((d) => d.status !== "upcoming" && d.status !== "due");
  const onTime = scheduled.length ? Math.round((scheduled.filter((d) => d.status === "taken").length / scheduled.length) * 100) : null;
  if (!rows.length) {
    return (
      <Panel>
        <PanelTitle title="This week's pillbox" />
        <p className="mt-4 rounded-[18px] border border-dashed border-[var(--c-line)] p-6 text-center text-[13px] text-[var(--c-ink-2)]">
          No daily medicines with a time yet. Add one below, or tell Saheli: “Metformin 500 subah 8:30 aur raat 9 baje”.
        </p>
      </Panel>
    );
  }
  return (
    <Panel>
      <PanelTitle
        title="This week's pillbox"
        right={
          <div className="flex items-center gap-3 text-[11.5px] text-[var(--c-ink-2)]">
            <span>✓ taken</span>
            <span className="text-[var(--c-danger-ink)]">◌ missed</span>
            {onTime !== null && <Tag tone="dark">{onTime}% taken</Tag>}
          </div>
        }
      />
      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[620px] grid-cols-[92px_repeat(7,minmax(0,1fr))] gap-[7px]">
          <div />
          {week.map((d, i) => {
            const date = new Date(`${d.day}T12:00:00+05:30`);
            const today = i === week.length - 1;
            return (
              <div key={d.day} className="pb-0.5 text-center text-[11px] text-[var(--c-ink-3)]">
                {WEEKDAY[(date.getUTCDay() + 6) % 7]}
                <b className={cn("block text-[14px] font-medium", today ? "text-[var(--c-accent-text)]" : "text-[var(--c-ink)]")}>{today ? "Today" : date.getUTCDate()}</b>
              </div>
            );
          })}
          {rows.map((slot) => {
            const times = [...new Set(week.flatMap((d) => d.doses.filter((x) => slotOf(x.time) === slot.id).map((x) => x.time)))].sort();
            return [
              <div key={`${slot.id}-l`} className="flex flex-col justify-center text-[12px] font-medium">
                {slot.label}
                <span className="text-[11px] font-normal text-[var(--c-ink-3)]">{times.join(" · ")}</span>
              </div>,
              ...week.map((d, i) => {
                const cell = cellOf(d.doses.filter((x) => slotOf(x.time) === slot.id), i === week.length - 1);
                return (
                  <div
                    key={`${slot.id}-${d.day}`}
                    title={cell.doses.map((x) => `${x.time} ${x.name}: ${x.status}`).join("\n")}
                    className={cn(
                      "relative flex h-[62px] items-center justify-center gap-1 rounded-[16px] shadow-[inset_0_-3px_0_rgba(27,32,30,0.05)]",
                      cell.state === "empty" && "border border-dashed border-[var(--c-line)] shadow-none",
                      cell.state === "taken" && "bg-[var(--c-frame)]",
                      cell.state === "missed" && "border-[1.5px] border-dashed border-[#e69a9a] bg-[var(--c-frame)]",
                      cell.state === "unmarked" && "border-[1.5px] border-dashed border-[var(--c-line)] bg-[var(--c-frame)]",
                      cell.state === "today" && "bg-[var(--c-accent-wash)] outline outline-2 -outline-offset-2 outline-[var(--c-accent)]",
                      cell.state === "later" && "bg-[var(--c-frame)]/60",
                    )}
                  >
                    {cell.doses.map((x) => (
                      <PillShape key={x.id} color={colorOf(x.name)} faded={cell.state === "today" || cell.state === "later"} />
                    ))}
                    {cell.state === "taken" && <span className="absolute right-1.5 top-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-full bg-[var(--c-ok-ink)] text-[9px] text-white">✓</span>}
                    {cell.state === "missed" && <span className="absolute right-1.5 top-1 text-[10px] font-semibold text-[var(--c-danger-ink)]">missed</span>}
                    {cell.state === "unmarked" && <span className="absolute right-1.5 top-1 text-[10px] text-[var(--c-ink-3)]">not marked</span>}
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>
    </Panel>
  );
}

export function CarePlanPage() {
  const sel = useRecipientSelection();
  const { familyId, selectedId } = sel;
  const { selected, members } = usePerson();
  const key = familyId && selectedId ? `${familyId}/${selectedId}` : null;
  const overview = useCareOverview(familyId, selectedId);
  const portrait = useLoad<Portrait>(key, useCallback(() => getPortrait(familyId!, selectedId!), [familyId, selectedId]));
  const home = useLoad<CareHomeSummary>(key, useCallback(() => getCareHome(familyId!, selectedId!), [familyId, selectedId]));
  const snap = useLoad<DailySnapshot | null>(key, useCallback(() => getDailySnapshot(familyId!, selectedId!), [familyId, selectedId]));
  const stock = useLoad<{ medicines: StockRow[]; refillWithinDays: number }>(key, useCallback(() => getStock(familyId!, selectedId!), [familyId, selectedId]));
  const { busy, banner, run } = useAction();
  const [addSignal, setAddSignal] = useState(0);
  const [stockOpen, setStockOpen] = useState(false);
  const name = callName(selected);

  const active = useMemo(() => (overview.data?.facts ?? []).filter((f) => f.status === "active"), [overview.data]);
  const of = (domain: string) => active.filter((f) => f.domain === domain && !isNone(f));
  const hasNone = (domain: string) => active.some((f) => f.domain === domain && isNone(f));
  const meds = of("medicine").sort((a, b) => String(a.value.name ?? a.name).localeCompare(String(b.value.name ?? b.name)));
  const colorOf = useCallback(
    (medName: string) => {
      const i = meds.findIndex((m) => String(m.value.name ?? m.name).toLowerCase().split(" ")[0] === medName.toLowerCase().split(" ")[0]);
      return PILL_COLORS[(i < 0 ? meds.length : i) % PILL_COLORS.length];
    },
    [meds],
  );
  const pending = overview.data?.pending ?? [];
  const activeByKey = new Map(active.map((f) => [f.key, f]));
  const p = portrait.data;
  const person = p?.person;
  const moodNow = p?.mood.now ?? home.data?.mood ?? null;
  const allergies = of("allergy");
  const conditions = of("condition");
  const diet = of("diet");
  const memberById = new Map(members.filter((m) => m.userId).map((m) => [m.userId as string, m]));
  const team = (p?.people ?? []).map((x) => {
    const m = x.id ? memberById.get(x.id) : undefined;
    const phone = x.phone ?? (m?.phone && !(m.phoneCountryCode || "").startsWith("+99") ? `${m.phoneCountryCode ?? ""}${m.phone}` : null);
    return { ...x, photo: m?.avatarUrl ?? null, phone };
  });

  function addToPlan() {
    setAddSignal((n) => n + 1);
    setTimeout(() => document.getElementById("care-record-form")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }
  const refresh = () => {
    overview.reload();
    portrait.reload();
    stock.reload();
  };
  const decide = (f: CareFact, approve: boolean) =>
    run(f.id, () => resolveFact(familyId!, selectedId!, f.key, approve), approve ? "Approved. Saheli uses it now." : "Kept as it was.").then(refresh);

  const sub = [person?.age ? `${person.age} years` : null, person?.city, person?.livesWith === "alone" ? "lives alone" : person?.livesWith ? `lives with ${person.livesWith}` : null, shortLanguage(person?.language)]
    .filter(Boolean)
    .join(" · ");
  const first = pending[0];
  const firstBy = first?.statedBy ? memberById.get(first.statedBy) : undefined;
  const firstWords = first ? (heard(first.note) ?? p?.learned.find((l) => l.key === first.key && l.said)?.said?.text ?? null) : null;

  return (
    <AccessGate familyId={sel.familyId} loading={sel.loading} isCaregiver={sel.isCaregiver} isRecipient={sel.isRecipient} recipients={sel.recipients} error={sel.error}>
      <div className="space-y-4">
        <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <PageHeading top={possessive(selected)} bottom="Care plan" />
            <p className="mt-3 max-w-[560px] text-[13px] leading-relaxed text-[var(--c-ink-2)]">
              {selected?.self ? "Your" : "Their"} medicines, health and daily rhythm, as Saheli knows them. Change anything here, or just tell Saheli on WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <SmallButton icon={Pill} onClick={() => setStockOpen(true)}>
              Stock &amp; refills
            </SmallButton>
            <DarkButton onClick={addToPlan}>Add to plan</DarkButton>
          </div>
        </div>
        <Banner banner={banner} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <section className="grid gap-5 rounded-[28px] bg-gradient-to-br from-[var(--c-accent-wash)] to-[var(--c-card)] p-5 md:grid-cols-[200px_1fr]">
            <PersonPhoto name={selected?.name ?? ""} src={selected?.photo} className="h-[220px] w-full md:h-[236px] md:w-[200px]" text={56} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-[30px] font-medium leading-none tracking-[-0.03em]">{selected?.name}</p>
                  {sub && <p className="mt-2 text-[12.5px] text-[var(--c-ink-2)]">{sub}</p>}
                </div>
                {moodNow?.word ? (
                  <Tag tone={moodNow.score && moodNow.score <= 2 ? "accent" : "ok"} className="h-7 px-3 text-[12px]">
                    ● {cap(moodNow.word)} · {time12(moodNow.at)}
                  </Tag>
                ) : (
                  <Tag tone="light" className="h-7 px-3 text-[12px]">
                    No mood heard today
                  </Tag>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {conditions.map((c) => (
                  <Tag key={c.id} tone="light">
                    {c.text}
                  </Tag>
                ))}
                {allergies.length ? (
                  <Tag tone="danger">Allergic: {allergies.map((a) => String(a.value.allergen ?? a.name)).join(", ")}</Tag>
                ) : hasNone("allergy") ? (
                  <Tag tone="light">No known allergies</Tag>
                ) : null}
              </div>
              <div className="mt-3.5 flex gap-2.5 rounded-[18px] bg-[var(--c-frame)] px-3.5 py-3 text-[13.5px] leading-snug">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--c-accent)] text-[12px] font-semibold text-[var(--c-accent-ink)]">S</span>
                <p>
                  <b className="font-medium">Saheli: </b>
                  {snap.data?.summary?.trim() || moodNow?.summary || `Nothing written about ${name === "You" ? "your" : `${name}'s`} day yet. Saheli adds a note after her chats.`}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <Vital label="Blood pressure" v={home.data?.vitals.bp ?? null} />
                <Vital label="Sugar" v={home.data?.vitals.sugar ?? null} />
                <Vital label="Weight" v={home.data?.vitals.weight ?? null} warnWhenFlag={false} />
              </div>
            </div>
          </section>

          <section className={cn("flex flex-col gap-3 rounded-[28px] p-5", pending.length ? "bg-[var(--c-accent-soft)]" : "bg-[var(--c-card)]")}>
            <div className="flex items-center justify-between gap-2">
              <h2 className={cn("flex items-center gap-2.5 text-[14px] font-medium", pending.length > 0 && "text-[var(--c-accent-soft-ink)]")}>
                <span className="h-[14px] w-[14px] rounded-[4px] bg-[var(--c-accent)]" aria-hidden />
                {first && first.statedBy === selectedId ? `${name === "You" ? "You asked for" : `${name} wants`} a change` : "Waiting for your OK"}
              </h2>
              {pending.length > 0 && <Tag tone="light">{pending.length} to decide</Tag>}
            </div>
            {!first ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[18px] bg-[var(--c-frame)] p-6 text-center">
                <CheckCircle size={30} weight="fill" className="text-[var(--c-ok-ink)]" />
                <p className="text-[14px] font-medium">Nothing waits for you</p>
                <p className="max-w-[280px] text-[12.5px] text-[var(--c-ink-2)]">
                  When {name === "You" ? "you change" : `${name} changes`} a medicine, allergy or condition on WhatsApp, it waits here until a caregiver says yes.
                </p>
              </div>
            ) : (
              <>
                {firstWords && (
                  <div className="flex items-start gap-2.5">
                    <PersonPhoto name={firstBy?.name ?? name} src={firstBy?.avatarUrl ?? (first.statedBy === selectedId ? selected?.photo : null)} rounded="rounded-full" className="h-9 w-9" text={13} />
                    <Bubble className="flex-1" meta={time12(first.recordedAt)}>
                      {firstWords}
                    </Bubble>
                  </div>
                )}
                <div className="rounded-[18px] bg-[var(--c-frame)] px-3.5 py-3 text-[13px] leading-snug">
                  <b className="font-medium">{first.text}</b>
                  <p className="mt-1 text-[12px] text-[var(--c-ink-2)]">
                    {activeByKey.get(first.key) ? `Now: ${activeByKey.get(first.key)!.text}` : "New in the record"}
                    {first.note && !heard(first.note) ? ` · ${first.note}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy === first.id} onClick={() => void decide(first, true)} className="h-11 flex-1 rounded-full bg-[var(--c-accent)] text-[13px] font-medium text-[var(--c-accent-ink)] disabled:opacity-50">
                    Approve
                  </button>
                  <button type="button" disabled={busy === first.id} onClick={() => void decide(first, false)} className="h-11 flex-1 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] text-[13px] font-medium disabled:opacity-50">
                    Keep as it is
                  </button>
                </div>
                {pending.slice(1, 4).map((f) => (
                  <div key={f.id} className="flex items-center gap-2.5 rounded-[16px] bg-[var(--c-frame)]/70 px-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--c-danger-soft)] text-[var(--c-danger-ink)]">
                      <Warning size={16} weight="fill" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">{f.text}</p>
                      <p className="truncate text-[11.5px] text-[var(--c-ink-2)]">{heard(f.note) ? `“${heard(f.note)}”` : (f.note ?? "From a chat")}</p>
                    </div>
                    <SmallButton dark disabled={busy === f.id} onClick={() => void decide(f, true)}>
                      Approve
                    </SmallButton>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          {p ? (
            <Pillbox week={p.week} colorOf={colorOf} />
          ) : portrait.error ? (
            <Panel>
              <PanelTitle title="This week's pillbox" />
              <p className="mt-4 text-[13px] text-[var(--c-ink-2)]">Couldn&apos;t load the week. The rest of the page works.</p>
              <SmallButton className="mt-3" onClick={portrait.reload}>
                Try again
              </SmallButton>
            </Panel>
          ) : (
            <div className="h-[300px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          )}
          <Panel>
            <PanelTitle
              title="Medicines"
              right={
                <SmallButton icon={Plus} onClick={addToPlan}>
                  Add
                </SmallButton>
              }
            />
            <div className="mt-4 flex flex-col gap-2">
              {meds.length === 0 && (
                <p className="rounded-[18px] bg-[var(--c-frame)] p-4 text-[13px] text-[var(--c-ink-2)]">{hasNone("medicine") ? "Takes no regular medicines." : "No medicines saved yet."}</p>
              )}
              {meds.map((m) => {
                const v = m.value as { name?: string; dose?: string; times?: string[]; food_timing?: string; days?: number[] };
                const row = (stock.data?.medicines ?? []).find((s) => s.key === m.key);
                const days = v.days?.length ? v.days.map((d) => WEEKDAY[d]).join(", ") : null;
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-[18px] bg-[var(--c-frame)] p-3">
                    <PillShape color={colorOf(String(v.name ?? m.name))} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13.5px] font-medium">
                          {v.name ?? m.name}
                          {v.dose ? ` ${v.dose}` : ""}
                        </p>
                        {row?.low ? <Tag tone="accent">{row.daysLeft} days left</Tag> : row?.daysLeft != null ? <span className="text-[11.5px] text-[var(--c-ink-2)]">{row.daysLeft} days</span> : null}
                      </div>
                      <p className="mt-0.5 truncate text-[11.5px] text-[var(--c-ink-2)]">
                        {[(v.times ?? []).join(" · ") || "no set time", v.food_timing ? FOOD[v.food_timing] : null, days, ...(m.links ?? []).map((l) => l.text)].filter(Boolean).join(" · ")}
                      </p>
                      {row?.daysLeft != null && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--c-line)]">
                          <i className={cn("block h-full rounded-full", row.low ? "bg-[var(--c-accent)]" : "bg-[var(--c-solid)]")} style={{ width: `${Math.min(100, (row.daysLeft / 30) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {meds.length > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <SmallButton dark onClick={() => setStockOpen(true)}>
                  Count stock &amp; reorder
                </SmallButton>
                <span className="text-[11.5px] text-[var(--c-ink-2)]">Apollo, 1mg or PharmEasy · cash on delivery</span>
              </div>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.25fr]">
          <Panel>
            <PanelTitle title="Allergies" />
            <div className="mt-3 space-y-2">
              {allergies.length === 0 && <p className="text-[13px] text-[var(--c-ink-2)]">{hasNone("allergy") ? "No known allergies (the family confirmed)." : "None recorded yet."}</p>}
              {allergies.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 rounded-[16px] border-l-4 border-[var(--c-danger-ink)] bg-[var(--c-frame)] px-3 py-2.5">
                  <Warning size={16} weight="fill" className="shrink-0 text-[var(--c-danger-ink)]" />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-[var(--c-danger-ink)]">{String(a.value.allergen ?? a.name)}</p>
                    <p className="truncate text-[11.5px] text-[var(--c-ink-2)]">{String(a.value.reaction ?? a.text)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelTitle title="Food rules" />
            <div className="mt-3 flex flex-wrap gap-2">
              {diet.length === 0 && <p className="text-[13px] text-[var(--c-ink-2)]">No diet rules yet.</p>}
              {diet.map((d, i) => (
                <span key={d.id} className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--c-frame)] px-3.5 text-[12.5px] font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PILL_COLORS[(i + 2) % PILL_COLORS.length] }} />
                  {d.text}
                </span>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelTitle title="Care team" />
            <div className="mt-3 space-y-2">
              {team.length === 0 && <p className="text-[13px] text-[var(--c-ink-2)]">Add a doctor or contact below.</p>}
              {team.slice(0, 4).map((t) => (
                <div key={`${t.kind}-${t.name}`} className="flex items-center gap-2.5 rounded-[16px] bg-[var(--c-frame)] p-2">
                  <PersonPhoto name={t.name} src={t.photo} rounded="rounded-full" className="h-10 w-10" text={14} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{t.name}</p>
                    <p className="truncate text-[11px] capitalize text-[var(--c-ink-2)]">{t.relation}</p>
                  </div>
                  {t.phone && (
                    <a href={telHref(t.phone)} aria-label={`Call ${t.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--c-card)]">
                      <Phone size={15} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelTitle title={selected?.self ? "Your day" : "Their day"} />
            {p && p.day.length ? (
              <>
                <div className="relative mt-5 h-3">
                  <div className="absolute inset-x-0 top-0.5 h-2 rounded-full bg-[var(--c-line)]" />
                  {p.day.map((d, i) => (
                    <span
                      key={d.key}
                      title={`${d.time} ${d.label}`}
                      className={cn("absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[var(--c-frame)]", i % 2 ? "bg-[var(--c-solid)]" : "bg-[var(--c-accent)]")}
                      style={{ left: `${Math.max(2, Math.min(98, ((hm(d.time) - 300) / (1410 - 300)) * 100))}%` }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-[var(--c-ink-3)]">
                  <span>5 am</span>
                  <span>noon</span>
                  <span>11 pm</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {p.day.slice(0, 6).map((d) => (
                    <li key={d.key} className="flex gap-3 text-[12.5px]">
                      <span className="w-11 shrink-0 font-medium tabular-nums">{d.time}</span>
                      <span className="min-w-0 truncate text-[var(--c-ink-2)]">{d.label}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-[13px] text-[var(--c-ink-2)]">Wake-up, meals and sleep times show here once Saheli knows them.</p>
            )}
          </Panel>
        </div>

        <SaheliCarePage embedded addSignal={addSignal} onChanged={refresh} />

        <SideDrawer open={stockOpen} onClose={() => setStockOpen(false)} top="Stock" bottom="& refills" label="Stock and refills" footer={<DarkButton onClick={() => setStockOpen(false)}>Done</DarkButton>}>
          <RefillsPanel />
        </SideDrawer>
      </div>
    </AccessGate>
  );
}
