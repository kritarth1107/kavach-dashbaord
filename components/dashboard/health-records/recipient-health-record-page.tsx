"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  FileText,
  Heart,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
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
import { StatMetricCard } from "@/components/dashboard/charts/stat-metric-card";
import {
  AreaTrendChart,
  BarChart,
  MiniVitalBar,
  Sparkline,
} from "@/components/dashboard/charts/chart-primitives";
import {
  buildMetricInsights,
  groupMetricsByKey,
  parseAllMetrics,
  type MetricInsight,
  type ParsedMetric,
} from "@/lib/health-metrics";
import { parseDocumentDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

function MetricTrendCard({
  label,
  unit,
  series,
}: {
  label: string;
  unit: string;
  series: ParsedMetric[];
}) {
  const values = series.map((m) => m.value);
  const labels = series.map((m) =>
    m.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  );
  const latest = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : null;
  const delta = prev ? latest.value - prev.value : 0;

  return (
    <div className="panel-card flex h-full flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-bold text-[var(--text-primary)]">{label}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {series.length} reading{series.length === 1 ? "" : "s"} on file
          </p>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
            latest.status === "normal" && "bg-primary-light text-primary",
            latest.status === "high" && "bg-[var(--danger-bg)] text-[var(--danger-text)]",
            latest.status === "low" && "bg-[var(--warning-bg)] text-[var(--warning-text)]",
            latest.status === "unknown" && "bg-[var(--surface)] text-[var(--text-secondary)]",
          )}
        >
          {latest.status}
        </span>
      </div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[1.75rem] font-extrabold leading-none text-[var(--text-primary)]">
            {latest.value}
            <span className="ml-1 text-[13px] font-semibold text-[var(--text-tertiary)]">{unit}</span>
          </p>
          {prev && (
            <p className={cn("mt-1 text-[11px] font-semibold", delta >= 0 ? "text-[var(--danger-text)]" : "text-primary")}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)} vs prior
            </p>
          )}
        </div>
        <Sparkline
          color={latest.status === "high" ? "#dc2626" : "#16a34a"}
          data={values}
          className="h-8 w-24"
        />
      </div>
      <AreaTrendChart
        data={values}
        labels={labels}
        gradientId={`metric-${latest.key}`}
        stroke={latest.status === "high" ? "#dc2626" : "#0d9488"}
        fillColor={latest.status === "high" ? "#dc2626" : "#16a34a"}
        height={90}
      />
      {latest.refLow !== undefined && latest.refHigh !== undefined && (
        <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">
          Typical printed range {latest.refLow}–{latest.refHigh} {unit}
        </p>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: MetricInsight }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        insight.severity === "alert" && "border-[var(--danger-border)] bg-[var(--danger-bg)]",
        insight.severity === "watch" && "border-[var(--warning-border)] bg-[var(--warning-bg)]",
        insight.severity === "info" && "border-primary/30 bg-primary-light",
      )}
    >
      <div className="flex items-start gap-3">
        {insight.severity === "watch" ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning-text)]" />
        ) : insight.severity === "alert" ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger-text)]" />
        ) : (
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        )}
        <div>
          <p className="text-[13px] font-bold text-[var(--text-primary)]">{insight.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{insight.detail}</p>
        </div>
      </div>
    </div>
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
    void load();
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
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isCareRecipientRole(activeFamily?.role)) {
    return (
      <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-5 py-8 text-center">
        <p className="text-[14px] font-bold text-[var(--text-primary)]">Caregiver view only</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-8 text-center">
        <p className="text-[14px] font-bold text-[var(--text-primary)]">{error}</p>
        <Link
          href="/dashboard/family"
          className="mt-4 inline-flex text-[13px] font-semibold text-primary hover:underline"
        >
          Back to family
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href={`/dashboard/family/${userId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
        Back to {subjectName}&apos;s profile
      </Link>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.5rem] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
            {memberName} · Health monitoring
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            Real data from uploaded labs & vitals · insights from printed values only
          </p>
        </div>
        {lastUpdated && (
          <p className="text-[12px] text-[var(--text-tertiary)]">
            Last record ·{" "}
            {lastUpdated.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatMetricCard
          label="Documents"
          value={String(labs.length)}
          sub="Total health files"
          icon={FileText}
          iconBg="icon-chip-blue"
        />
        <StatMetricCard
          label="Markers tracked"
          value={String(grouped.size)}
          sub={`${metrics.length} parsed readings`}
          icon={TrendingUp}
          iconBg="icon-chip-purple"
        />
        <StatMetricCard
          label="Lab reports"
          value={String(kindCounts.lab)}
          sub="Reports on file"
          icon={Activity}
          iconBg="icon-chip-green"
        />
        <StatMetricCard
          label="Vitals entries"
          value={String(kindCounts.vitals)}
          sub="BP, sugar, SpO₂ logs"
          icon={Heart}
          iconBg="icon-chip-red"
        />
      </div>

      <section className="panel-card mb-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-5 py-4">
          <Brain className="h-4 w-4 text-primary" strokeWidth={2.25} />
          <div>
            <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">Saheli health insights</h2>
            <p className="text-[12px] text-[var(--text-tertiary)]">
              AI-style analysis from stored records · not medical advice
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel-card p-5">
          <p className="text-[13px] font-bold text-[var(--text-primary)]">Record breakdown</p>
          <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">Documents by type</p>
          <BarChart
            data={[
              kindCounts.lab,
              kindCounts.vitals,
              kindCounts.prescription,
              kindCounts.note,
              kindCounts.other,
            ]}
            labels={["Labs", "Vitals", "Rx", "Notes", "Other"]}
            color="#2563eb"
          />
        </div>
        <div className="panel-card p-5">
          <p className="text-[13px] font-bold text-[var(--text-primary)]">Latest vitals panel</p>
          <p className="mb-4 text-[11px] text-[var(--text-tertiary)]">Most recent parsed values</p>
          <div className="grid grid-cols-2 gap-3">
            <MiniVitalBar
              label="Blood pressure"
              value={latestVitals.bp ?? "—"}
              unit="mmHg"
              pct={latestVitals.bp ? 72 : 0}
              color="#16a34a"
            />
            <MiniVitalBar
              label="Heart rate"
              value={latestVitals.hr?.toString() ?? "—"}
              unit="bpm"
              pct={latestVitals.hr ? 65 : 0}
              color="#0d9488"
            />
            <MiniVitalBar
              label="Glucose"
              value={latestVitals.glucose?.toString() ?? "—"}
              unit="mg/dL"
              pct={latestVitals.glucose ? 58 : 0}
              color="#0284c7"
            />
            <MiniVitalBar
              label="SpO₂"
              value={latestVitals.spo2?.toString() ?? "—"}
              unit="%"
              pct={latestVitals.spo2 ?? 0}
              color="#059669"
            />
            <MiniVitalBar
              label="TSH"
              value={latestVitals.tsh?.toString() ?? "—"}
              unit="mIU/L"
              pct={latestVitals.tsh ? 50 : 0}
              color="#7c3aed"
            />
            <MiniVitalBar
              label="HbA1c"
              value={latestVitals.hba1c?.toString() ?? "—"}
              unit="%"
              pct={latestVitals.hba1c ? 45 : 0}
              color="#dc2626"
            />
          </div>
        </div>
      </div>

      {chartMetrics.length > 0 ? (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        <div className="panel-card mb-6 px-5 py-12 text-center">
          <p className="text-[14px] font-bold text-[var(--text-primary)]">No trend charts yet</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] text-[var(--text-secondary)]">
            Upload lab PDFs or paste values like “TSH 4.2 mIU/L” below to populate medical trend graphs.
          </p>
        </div>
      )}

      <HealthRecordsPanel
        fixedRecipientUserId={userId}
        fixedRecipientName={subjectName}
        showAddForm
        onRecordsChange={() => void load()}
      />
    </>
  );
}
