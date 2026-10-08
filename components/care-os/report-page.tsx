"use client";

import { ArrowClockwise, FileText } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { getReport, type CareReport } from "@/lib/care-features-api";
import { cn } from "@/lib/utils";
import { Notice, PageHeading, PrintSheet, WhatsAppHint, fmtAt, fmtDay, fmtTime, istDate, useLoad } from "./care-kit";
import { callName, possessive, usePerson } from "./person-context";
import { DarkButton, Panel, PanelTitle, PillTabs, SmallButton, Tag } from "./ui";

type Days = "7" | "14" | "30";
const TABS: Array<{ id: Days; label: string }> = [
  { id: "7", label: "7 days" },
  { id: "14", label: "14 days" },
  { id: "30", label: "30 days" },
];

const KIND_LABEL: Record<string, { label: string; unit?: string }> = {
  bp: { label: "Blood pressure", unit: "mmHg" },
  sugar: { label: "Blood sugar", unit: "mg/dL" },
  weight: { label: "Weight", unit: "kg" },
  temperature: { label: "Temperature", unit: "°F" },
  spo2: { label: "Oxygen (SpO₂)", unit: "%" },
  pulse: { label: "Pulse", unit: "bpm" },
};
const kindLabel = (k: string | null) => (k ? (KIND_LABEL[k]?.label ?? k.replace(/_/g, " ")) : "Other");

const ymd = (d: string) => fmtDay(istDate(`${d}T12:00`), { day: "numeric", month: "short" });

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[13px] text-[var(--c-ink-3)]">{children}</p>;
}

function Dot() {
  return <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />;
}

function TimeList({ items }: { items: Array<{ at: string; text: React.ReactNode; tag?: React.ReactNode }> }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((x, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[13px]">
          <Dot />
          <span className="min-w-0 flex-1 break-words">
            {x.text}
            <span className="ml-1.5 whitespace-nowrap text-[11px] text-[var(--c-ink-3)]">{fmtAt(x.at)}</span>
          </span>
          {x.tag}
        </li>
      ))}
    </ul>
  );
}

function DayBars({ days }: { days: CareReport["adherence"]["byDay"] }) {
  const many = days.length > 14;
  return (
    <div>
      <div className={cn("flex h-[120px] items-end", many ? "gap-[3px]" : "gap-[6px]")}>
        {days.map((d) => {
          const pct = d.expected ? d.taken / d.expected : 0;
          return (
            <div key={d.day} className="relative flex h-full flex-1 justify-center" title={`${ymd(d.day)}: ${d.taken} of ${d.expected} taken`}>
              <div className="absolute inset-x-0 bottom-0 mx-auto h-full w-full max-w-[26px] rounded-full bg-[var(--c-frame)]" />
              <div
                className={cn("absolute bottom-0 mx-auto w-full max-w-[26px] rounded-full", d.missed > 0 ? "bg-[var(--c-accent)]" : "bg-[var(--c-solid)]")}
                style={{ height: `${Math.max(d.expected ? 8 : 0, pct * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className={cn("mt-2 flex text-[10.5px] text-[var(--c-ink-3)]", many ? "gap-[3px]" : "gap-[6px]")}>
        {days.map((d, i) => (
          <span key={d.day} className="flex-1 overflow-hidden whitespace-nowrap text-center">
            {many ? (i % 5 === 0 ? fmtDay(istDate(`${d.day}T12:00`), { day: "numeric" }) : "") : fmtDay(istDate(`${d.day}T12:00`), { weekday: "narrow" })}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--c-ink-2)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--c-solid)]" /> All taken
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--c-accent)]" /> Some missed
        </span>
      </div>
    </div>
  );
}

const TH = "py-2 pr-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--c-ink-3)]";
const TD = "border-t border-[var(--c-line)] py-2 pr-3 align-top text-[13px]";

function ReportBody({ r, fullName, print }: { r: CareReport; fullName: string; print?: boolean }) {
  const a = r.adherence;
  const kinds = Array.from(new Set(r.vitals.map((v) => v.kind ?? ""))).map((k) => ({ kind: k || null, rows: r.vitals.filter((v) => (v.kind ?? "") === k) }));
  const panel = "kv-avoid";

  return (
    <div className="space-y-4">
      {print && (
        <div className="flex items-end justify-between border-b border-[var(--c-line)] pb-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-accent)]">Care report</p>
            <p className="text-[24px] font-medium tracking-[-0.02em]">{fullName}</p>
          </div>
          <p className="text-right text-[11px] text-[var(--c-ink-2)]">
            {ymd(r.from)} – {ymd(r.to)} · {r.days} days
            <br />
            Prepared by Kavach CareOS · {fmtAt(r.generatedAt)}
          </p>
        </div>
      )}

      <Panel className={panel}>
        <PanelTitle title="Summary" right={!print && <span className="hidden text-[11px] text-[var(--c-ink-3)] sm:inline">{ymd(r.from)} – {ymd(r.to)} · generated {fmtAt(r.generatedAt)}</span>} />
        <p className="mt-3 max-w-[80ch] text-[15px] leading-relaxed">{r.narrative || "No summary for this period."}</p>
        {!print && (
          <p className="mt-3 text-[11px] text-[var(--c-ink-3)] sm:hidden">
            {ymd(r.from)} – {ymd(r.to)} · generated {fmtAt(r.generatedAt)}
          </p>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <Panel accent className={cn(panel, "flex flex-col")}>
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Medicines taken</p>
          <p className="c-num mt-4 text-[64px] leading-none text-white">
            {a.percent ?? "—"}
            {a.percent !== null && <span className="text-[28px]">%</span>}
          </p>
          <p className="mt-auto pt-4 text-[12px] text-white/80">
            {a.taken} of {a.expected} scheduled doses
          </p>
        </Panel>
        <Panel className={panel}>
          <PanelTitle title="Doses by day" />
          <div className="mt-4">{a.byDay.length ? <DayBars days={a.byDay} /> : <Empty>No doses scheduled in this period.</Empty>}</div>
        </Panel>
      </div>

      <Panel className={panel}>
        <PanelTitle title="By medicine" />
        {a.byMedicine.length === 0 ? (
          <Empty>No medicines on the schedule.</Empty>
        ) : (
          <table className="mt-3 w-full table-fixed">
            <thead>
              <tr>
                <th className={cn(TH, "w-[44%]")}>Medicine</th>
                <th className={cn(TH, "hidden sm:table-cell")}>Times</th>
                <th className={cn(TH, "text-right")}>Taken</th>
                <th className={cn(TH, "text-right")}>Due</th>
                <th className={cn(TH, "pr-0 text-right")}>Missed</th>
              </tr>
            </thead>
            <tbody>
              {a.byMedicine.map((m) => (
                <tr key={`${m.name}-${m.dose}`}>
                  <td className={TD}>
                    <span className="font-medium">{m.name}</span>
                    {m.dose && <span className="block text-[12px] text-[var(--c-ink-2)] sm:inline sm:pl-1.5">{m.dose}</span>}
                  </td>
                  <td className={cn(TD, "hidden tabular-nums text-[var(--c-ink-2)] sm:table-cell")}>{m.times.join(", ") || "—"}</td>
                  <td className={cn(TD, "text-right tabular-nums")}>{m.taken}</td>
                  <td className={cn(TD, "text-right tabular-nums")}>{m.expected}</td>
                  <td className={cn(TD, "pr-0 text-right tabular-nums", m.missed > 0 && "font-semibold text-[var(--c-accent-soft-ink)]")}>{m.missed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel className={cn(panel, "sm:col-span-2")}>
          <PanelTitle title="Readings" right={<span className="text-[11px] text-[var(--c-ink-3)]">{r.vitals.length} logged</span>} />
          {kinds.length === 0 ? (
            <Empty>No readings logged in this period.</Empty>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {kinds.map((g) => (
                <div key={g.kind ?? "other"} className="kv-avoid rounded-[18px] bg-[var(--c-frame)] p-4">
                  <p className="text-[13px] font-medium">
                    {kindLabel(g.kind)}
                    {g.kind && KIND_LABEL[g.kind]?.unit && <span className="font-normal text-[var(--c-ink-3)]"> · {KIND_LABEL[g.kind].unit}</span>}
                  </p>
                  <table className="mt-1 w-full">
                    <tbody>
                      {g.rows.map((v, i) => (
                        <tr key={i}>
                          <td className={cn(TD, "w-[46%] text-[12px] text-[var(--c-ink-2)]")}>{fmtAt(v.at)}</td>
                          <td className={cn(TD, "font-medium tabular-nums")}>
                            {v.value ?? "—"}
                            {Boolean(v.redFlag) && <Tag className="ml-1.5">Red flag</Tag>}
                          </td>
                          <td className={cn(TD, "pr-0 text-right text-[12px] text-[var(--c-ink-2)]")}>{v.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className={panel}>
          <PanelTitle title="Symptoms" />
          {r.symptoms.length === 0 ? (
            <Empty>No symptoms mentioned.</Empty>
          ) : (
            <TimeList items={r.symptoms.map((s) => ({ at: s.at, text: s.text, tag: s.level && s.level !== "info" ? <Tag tone={s.level === "concern" ? "accent" : "light"}>{s.level}</Tag> : undefined }))} />
          )}
        </Panel>

        <Panel className={panel}>
          <PanelTitle title="Mood & sleep" />
          {r.mood.length === 0 ? <Empty>Nothing noted about mood or sleep.</Empty> : <TimeList items={r.mood} />}
        </Panel>

        <Panel className={panel}>
          <PanelTitle title="Alerts" />
          {r.alerts.length === 0 ? (
            <Empty>No alerts raised.</Empty>
          ) : (
            <TimeList items={r.alerts.map((x) => ({ at: x.at, text: x.text, tag: x.whatsapp ? <Tag tone="light">WhatsApp</Tag> : undefined }))} />
          )}
        </Panel>

        <Panel className={panel}>
          <PanelTitle title="Care record changes" />
          {r.changes.length === 0 ? <Empty>No changes to medicines or the care record.</Empty> : <TimeList items={r.changes} />}
        </Panel>

        <Panel className={panel}>
          <PanelTitle title="Orders" />
          {r.orders.length === 0 ? (
            <Empty>No orders in this period.</Empty>
          ) : (
            <TimeList
              items={r.orders.map((o) => ({
                at: o.at,
                text: (
                  <>
                    {o.goal}
                    <span className="text-[var(--c-ink-2)]">
                      {" "}
                      · <span className="capitalize">{o.service}</span>
                      {o.total !== null && ` · ₹${o.total.toLocaleString("en-IN")}`}
                    </span>
                  </>
                ),
                tag: o.status !== "done" ? <Tag tone="light">{o.status}</Tag> : undefined,
              }))}
            />
          )}
        </Panel>

        <Panel className={panel}>
          <PanelTitle title="Upcoming appointments" />
          {r.appointments.length === 0 ? (
            <Empty>No appointments booked.</Empty>
          ) : (
            <ul className="mt-3 space-y-3">
              {r.appointments.map((ap) => {
                const d = ap.when ? istDate(ap.when) : null;
                return (
                  <li key={ap.key} className="kv-avoid rounded-[18px] bg-[var(--c-frame)] p-3.5">
                    <p className="text-[14px] font-medium">{ap.doctor}</p>
                    <p className="text-[12px] text-[var(--c-ink-2)]">{[d && `${fmtDay(d)}, ${fmtTime(d)}`, ap.place, ap.purpose].filter(Boolean).join(" · ")}</p>
                    {ap.questions.length > 0 && (
                      <ol className="mt-2 space-y-1 text-[13px]">
                        {ap.questions.map((q, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="w-4 shrink-0 text-right tabular-nums text-[var(--c-ink-3)]">{i + 1}.</span>
                            <span className="min-w-0 break-words">{q}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function ReportPage() {
  const { familyId, selectedId, selected } = usePerson();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("days");
  const days: Days = raw === "14" || raw === "30" ? raw : "7";
  const key = familyId && selectedId ? `${familyId}/${selectedId}/${days}` : null;
  const load = useCallback(() => getReport(familyId!, selectedId!, Number(days)), [familyId, selectedId, days]);
  const report = useLoad<CareReport>(key, load);
  const name = callName(selected);
  const r = report.data;

  function pick(d: Days) {
    const q = new URLSearchParams(params.toString());
    q.set("days", d);
    router.replace(`${pathname}?${q}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-end gap-5">
          <PageHeading top={possessive(selected)} bottom="Care report" />
          <span className="mb-2 hidden h-[68px] w-[68px] items-center justify-center rounded-full bg-[var(--c-accent)] text-white sm:flex">
            <FileText size={32} weight="fill" />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <PillTabs<Days> tabs={TABS} value={days} onChange={pick} />
          <DarkButton onClick={() => window.print()} disabled={!r}>
            Save as PDF
          </DarkButton>
        </div>
      </div>
      <WhatsAppHint>ask Saheli for {selected?.self ? "your" : `${name}'s`} report for the doctor, e.g. “send the {days}-day report”.</WhatsAppHint>

      {report.error && !r ? (
        <Panel className="flex flex-col items-center py-14 text-center">
          <p className="text-[18px] font-medium">The report couldn&apos;t be made</p>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">{report.error}</p>
          <SmallButton dark icon={ArrowClockwise} className="mt-5" onClick={report.reload}>
            Try again
          </SmallButton>
        </Panel>
      ) : !r ? (
        <div className="space-y-4" aria-busy="true">
          <Panel>
            <PanelTitle title="Writing the report" />
            <p className="mt-3 text-[13px] text-[var(--c-ink-2)]">
              Saheli is putting together {selected?.self ? "your" : `${name}'s`} last {days} days. The first time can take 10–20 seconds while the summary is written.
            </p>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-[92%] animate-pulse rounded-full bg-[var(--c-frame)]" />
              <div className="h-3 w-[78%] animate-pulse rounded-full bg-[var(--c-frame)]" />
              <div className="h-3 w-[64%] animate-pulse rounded-full bg-[var(--c-frame)]" />
            </div>
          </Panel>
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div className="h-[200px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
            <div className="h-[200px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          </div>
        </div>
      ) : (
        <>
          {report.error && <Notice>{report.error}</Notice>}
          <ReportBody r={r} fullName={selected?.name ?? name} />
          <PrintSheet>
            <ReportBody r={r} fullName={selected?.name ?? name} print />
          </PrintSheet>
        </>
      )}
    </div>
  );
}
