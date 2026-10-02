"use client";

import Link from "next/link";
import { ArrowLeft, Sparkle, Warning } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  getFamilyMembers,
  getRecipientLabs,
  type LabDocument,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  formatDisplayName,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { HealthRecordsPanel } from "@/components/dashboard/health-records/health-records-panel";
import {
  buildMetricInsights,
  groupMetricsByKey,
  parseAllMetrics,
  type MetricInsight,
  type ParsedMetric,
} from "@/lib/health-metrics";
import { parseDocumentDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Bars, Panel, PanelTitle, Tag } from "@/components/care-os/ui";

const shortDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function MetricTrendCard({
  label,
  unit,
  series,
}: {
  label: string;
  unit: string;
  series: ParsedMetric[];
}) {
  const shown = series.slice(-8);
  const latest = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : null;
  const delta = prev ? latest.value - prev.value : 0;

  return (
    <Panel className="flex h-full min-w-0 flex-col">
      <PanelTitle
        title={label}
        right={
          <Tag tone={latest.status === "high" || latest.status === "low" ? "danger" : "light"} className={latest.status === "normal" || latest.status === "unknown" ? "!bg-[var(--c-frame)]" : undefined}>
            {latest.status}
          </Tag>
        }
      />
      <div className="mt-5 flex items-start gap-2">
        <p className="c-num text-[38px] leading-none">
          {latest.value}
          <span className="ml-1 text-[13px] text-[var(--c-ink-3)]">{unit}</span>
        </p>
        {prev && (
          <Tag trend={delta > 0 ? "up" : delta < 0 ? "down" : undefined}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} vs prior
          </Tag>
        )}
      </div>
      <p className="mt-1 text-[11px] text-[var(--c-ink-2)]">
        {series.length} reading{series.length === 1 ? "" : "s"} on file
      </p>
      <div className="mt-auto pt-8">
        <Bars values={shown.map((m) => m.value)} highlight={[shown.length - 1]} labels={shown.map((m, i) => (shown.length <= 5 || i % 2 === shown.length % 2 || i === shown.length - 1 ? shortDate(m.date) : null))} height={110} />
      </div>
      {latest.refLow !== undefined && latest.refHigh !== undefined && (
        <p className="mt-3 text-[11px] text-[var(--c-ink-3)]">
          Typical printed range {latest.refLow}–{latest.refHigh} {unit}
        </p>
      )}
    </Panel>
  );
}

function InsightRow({ insight }: { insight: MetricInsight }) {
  const flagged = insight.severity !== "info";
  return (
    <li className="flex items-start gap-3 rounded-[18px] bg-[var(--c-frame)] p-3.5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          flagged ? "bg-[var(--c-accent)] text-white" : "bg-[var(--c-ink)] text-[var(--c-frame)]",
        )}
      >
        {flagged ? <Warning size={16} weight="fill" /> : <Sparkle size={16} weight="fill" />}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium">{insight.title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">{insight.detail}</p>
      </div>
    </li>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Panel className="min-w-0">
      <p className="text-[12px] text-[var(--c-ink-2)]">{label}</p>
      <p className="c-num mt-3 text-[36px] leading-none">{value}</p>
      <p className="mt-2 text-[11px] text-[var(--c-ink-2)]">{sub}</p>
    </Panel>
  );
}

export function RecipientHealthRecordPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { activeFamilyId, activeFamily, loading: familyLoading } = useFamily();
  const [memberName, setMemberName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [labs, setLabs] = useState<LabDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!activeFamilyId || !userId) return;
    setLoading(true);
    setError("");
    try {
      const [{ data: membersData }, { data: labsData }] = await Promise.all([
        getFamilyMembers(activeFamilyId),
        getRecipientLabs(activeFamilyId, userId),
      ]);
      const found = membersData?.members
        .map(apiMemberToFamilyMember)
        .find(
          (m) =>
            m.userId === userId &&
            m.role === "care_recipient" &&
            m.status === "joined",
        );
      if (!found) {
        setError("Care recipient not found.");
        return;
      }
      setMemberName(formatDisplayName(found.prefix, found.name));
      setSubjectName(found.name.split(/\s+/)[0] || found.name);
      setLabs(labsData?.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health records");
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, userId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const metrics = useMemo(() => parseAllMetrics(labs), [labs]);
  const grouped = useMemo(() => groupMetricsByKey(metrics), [metrics]);
  const insights = useMemo(() => buildMetricInsights(metrics, labs), [metrics, labs]);

  const kindCounts = useMemo(() => {
    const counts = { lab: 0, vitals: 0, prescription: 0, note: 0, other: 0 };
    for (const doc of labs) {
      if (doc.kind === "lab") counts.lab += 1;
      else if (doc.kind === "vitals") counts.vitals += 1;
      else if (doc.kind === "prescription") counts.prescription += 1;
      else if (doc.kind === "note") counts.note += 1;
      else counts.other += 1;
    }
    return counts;
  }, [labs]);

  const latestVitals = useMemo(() => {
    const latest = new Map<string, ParsedMetric>();
    for (const m of metrics) latest.set(m.key, m);
    const sys = latest.get("bp_systolic");
    const dia = latest.get("bp_diastolic");
    return {
      bp: sys && dia ? `${sys.value}/${dia.value}` : null,
      hr: latest.get("heart_rate")?.value ?? null,
      glucose: latest.get("glucose")?.value ?? null,
      spo2: latest.get("spo2")?.value ?? null,
      tsh: latest.get("tsh")?.value ?? null,
      hba1c: latest.get("hba1c")?.value ?? null,
    };
  }, [metrics]);

  const lastUpdated = useMemo(() => {
    const dates = labs
      .map((d) => parseDocumentDate(d))
      .filter((d): d is Date => d !== null);
    if (!dates.length) return null;
    return dates.sort((a, b) => b.getTime() - a.getTime())[0];
  }, [labs]);

  const chartMetrics = useMemo(() => {
    return [...grouped.entries()]
      .filter(([, series]) => series.length >= 1)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6);
  }, [grouped]);

  if (familyLoading || loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading health records">
        <div className="h-[110px] w-full max-w-[360px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[130px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          ))}
        </div>
        <div className="h-[260px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
      </div>
    );
  }

  if (isCareRecipientRole(activeFamily?.role)) {
    return (
      <Panel className="py-14 text-center">
        <p className="text-[16px] font-medium">Caregiver view only</p>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel className="flex flex-col items-center py-14 text-center">
        <p className="text-[16px] font-medium">{error}</p>
        <Link href="/dashboard/family" className="mt-4 inline-flex h-8 items-center rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] px-3.5 text-[12px] font-medium hover:bg-[var(--c-card)]">
          Back to family
        </Link>
      </Panel>
    );
  }

  const vitals: Array<{ label: string; value: string | null; unit: string }> = [
    { label: "Blood pressure", value: latestVitals.bp, unit: "mmHg" },
    { label: "Heart rate", value: latestVitals.hr?.toString() ?? null, unit: "bpm" },
    { label: "Glucose", value: latestVitals.glucose?.toString() ?? null, unit: "mg/dL" },
    { label: "SpO₂", value: latestVitals.spo2?.toString() ?? null, unit: "%" },
    { label: "TSH", value: latestVitals.tsh?.toString() ?? null, unit: "mIU/L" },
    { label: "HbA1c", value: latestVitals.hba1c?.toString() ?? null, unit: "%" },
  ];
  const breakdown = [kindCounts.lab, kindCounts.vitals, kindCounts.prescription, kindCounts.note, kindCounts.other];
  const topKind = breakdown.indexOf(Math.max(...breakdown));

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/family/${userId}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--c-line)] pl-3 pr-3.5 text-[12.5px] text-[var(--c-ink-2)] transition-colors hover:bg-[var(--c-card)] hover:text-[var(--c-ink)]"
      >
        <ArrowLeft size={14} weight="bold" />
        Back to {subjectName}&apos;s profile
      </Link>

      <div className="flex flex-col gap-3 pb-1 sm:pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[34px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block break-words font-light text-[var(--c-ink-3)]">{memberName}&apos;s</span>
            <span className="block font-medium">Health records</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] text-[var(--c-ink-2)]">
            Real data from uploaded labs and vitals. Insights use printed values only.
          </p>
        </div>
        {lastUpdated && (
          <span className="self-start rounded-full bg-[var(--c-card)] px-3 py-1.5 text-[12px] text-[var(--c-ink-2)] lg:self-auto">
            Last record ·{" "}
            {lastUpdated.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 [&>*]:min-w-0">
        <Panel accent>
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Documents</p>
          <p className="c-num mt-3 text-[36px] leading-none text-white">{labs.length}</p>
          <p className="mt-2 text-[11px] text-white/80">Total health files</p>
        </Panel>
        <Stat label="Markers tracked" value={String(grouped.size)} sub={`${metrics.length} parsed readings`} />
        <Stat label="Lab reports" value={String(kindCounts.lab)} sub="Reports on file" />
        <Stat label="Vitals entries" value={String(kindCounts.vitals)} sub="BP, sugar, SpO₂ logs" />
      </div>

      <Panel>
        <PanelTitle title="Saheli health insights" right={<span className="text-[11px] text-[var(--c-ink-2)]">not medical advice</span>} />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {insights.map((insight) => (
            <InsightRow key={insight.id} insight={insight} />
          ))}
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel>
          <PanelTitle title="Record breakdown" right={<span className="text-[11px] text-[var(--c-ink-2)]">documents by type</span>} />
          <div className="mt-8">
            <Bars values={breakdown} highlight={labs.length ? [topKind] : []} labels={["Labs", "Vitals", "Rx", "Notes", "Other"]} height={120} />
          </div>
        </Panel>
        <Panel>
          <PanelTitle title="Latest vitals" right={<span className="text-[11px] text-[var(--c-ink-2)]">most recent parsed values</span>} />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {vitals.map((v) => (
              <div key={v.label} className="min-w-0 rounded-[16px] bg-[var(--c-frame)] px-3.5 py-3">
                <p className="truncate text-[11px] text-[var(--c-ink-2)]">{v.label}</p>
                <p className={cn("c-num mt-1.5 text-[22px] leading-none", !v.value && "text-[var(--c-ink-3)]")}>
                  {v.value ?? "—"}
                  {v.value && <span className="ml-1 text-[11px] text-[var(--c-ink-3)]">{v.unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {chartMetrics.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {chartMetrics.map(([key, series]) => (
            <MetricTrendCard
              key={key}
              label={series[0]?.label ?? key}
              unit={series[0]?.unit ?? ""}
              series={series}
            />
          ))}
        </div>
      ) : (
        <Panel className="flex flex-col items-center py-12 text-center">
          <p className="text-[18px] font-medium">No trend charts yet</p>
          <p className="mt-1 max-w-md text-[13px] text-[var(--c-ink-2)]">
            Upload lab PDFs or paste values like “TSH 4.2 mIU/L” below to populate medical trend graphs.
          </p>
        </Panel>
      )}

      <div className="pt-2">
        <HealthRecordsPanel
          embedded
          addFormPinned
          fixedRecipientUserId={userId}
          fixedRecipientName={subjectName}
          showAddForm
          onRecordsChange={() => void load()}
        />
      </div>
    </div>
  );
}
