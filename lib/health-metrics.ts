import { addDays, parseDocumentDate, startOfDay } from "@/lib/date-utils";
import type { LabDocument } from "@/lib/api";

export type MetricStatus = "normal" | "high" | "low" | "unknown";

export type ParsedMetric = {
  key: string;
  label: string;
  value: number;
  unit: string;
  date: Date;
  documentId: string;
  documentTitle: string;
  refLow?: number;
  refHigh?: number;
  status: MetricStatus;
};

export type MetricInsight = {
  id: string;
  severity: "info" | "watch" | "alert";
  title: string;
  detail: string;
  metric?: string;
};

type MetricPattern = {
  key: string;
  label: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  patterns: RegExp[];
};

const METRIC_PATTERNS: MetricPattern[] = [
  {
    key: "tsh",
    label: "TSH",
    unit: "mIU/L",
    refLow: 0.4,
    refHigh: 4.0,
    patterns: [/TSH\s*[:\-]?\s*([\d.]+)/i, /thyroid stimulating hormone\s*[:\-]?\s*([\d.]+)/i],
  },
  {
    key: "hba1c",
    label: "HbA1c",
    unit: "%",
    refLow: 4.0,
    refHigh: 5.6,
    patterns: [/HbA1[cC]\s*[:\-]?\s*([\d.]+)/i, /A1[cC]\s*[:\-]?\s*([\d.]+)\s*%/i],
  },
  {
    key: "glucose",
    label: "Blood glucose",
    unit: "mg/dL",
    refLow: 70,
    refHigh: 140,
    patterns: [
      /(?:fasting\s*)?(?:blood\s*)?glucose\s*[:\-]?\s*([\d.]+)/i,
      /(?:FBS|RBS|PPBS)\s*[:\-]?\s*([\d.]+)/i,
      /blood sugar\s*[:\-]?\s*([\d.]+)/i,
    ],
  },
  {
    key: "hemoglobin",
    label: "Hemoglobin",
    unit: "g/dL",
    refLow: 12,
    refHigh: 17,
    patterns: [/hemoglobin\s*[:\-]?\s*([\d.]+)/i, /\bHb\s*[:\-]?\s*([\d.]+)/i],
  },
  {
    key: "cholesterol",
    label: "Total cholesterol",
    unit: "mg/dL",
    refLow: 0,
    refHigh: 200,
    patterns: [/total cholesterol\s*[:\-]?\s*([\d.]+)/i, /cholesterol\s*[:\-]?\s*([\d.]+)/i],
  },
  {
    key: "ldl",
    label: "LDL",
    unit: "mg/dL",
    refLow: 0,
    refHigh: 100,
    patterns: [/LDL\s*[:\-]?\s*([\d.]+)/i],
  },
  {
    key: "hdl",
    label: "HDL",
    unit: "mg/dL",
    refLow: 40,
    refHigh: 200,
    patterns: [/HDL\s*[:\-]?\s*([\d.]+)/i],
  },
  {
    key: "creatinine",
    label: "Creatinine",
    unit: "mg/dL",
    refLow: 0.6,
    refHigh: 1.2,
    patterns: [/creatinine\s*[:\-]?\s*([\d.]+)/i],
  },
  {
    key: "vitamin_d",
    label: "Vitamin D",
    unit: "ng/mL",
    refLow: 30,
    refHigh: 100,
    patterns: [/vitamin\s*d\s*[:\-]?\s*([\d.]+)/i, /25\s*\(?OH\)?\s*vitamin\s*d\s*[:\-]?\s*([\d.]+)/i],
  },
];

const BP_PATTERN =
  /(?:blood pressure|BP)\s*[:\-]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i;
const HR_PATTERN = /(?:heart rate|pulse|HR)\s*[:\-]?\s*(\d{2,3})\s*(?:bpm)?/i;
const SPO2_PATTERN = /(?:SpO2|oxygen saturation)\s*[:\-]?\s*(\d{2,3})\s*%?/i;

function classify(value: number, refLow?: number, refHigh?: number): MetricStatus {
  if (refLow === undefined && refHigh === undefined) return "unknown";
  if (refLow !== undefined && value < refLow) return "low";
  if (refHigh !== undefined && value > refHigh) return "high";
  return "normal";
}

function parseMetricFromText(
  text: string,
  doc: LabDocument,
  date: Date,
): ParsedMetric[] {
  const found: ParsedMetric[] = [];
  const seen = new Set<string>();

  for (const def of METRIC_PATTERNS) {
    for (const pattern of def.patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const value = Number(match[1]);
      if (!Number.isFinite(value)) continue;
      const dedupe = `${def.key}-${value}-${date.toISOString()}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      found.push({
        key: def.key,
        label: def.label,
        value,
        unit: def.unit,
        date,
        documentId: doc.document_id,
        documentTitle: doc.title,
        refLow: def.refLow,
        refHigh: def.refHigh,
        status: classify(value, def.refLow, def.refHigh),
      });
      break;
    }
  }

  const bpMatch = text.match(BP_PATTERN);
  if (bpMatch) {
    const sys = Number(bpMatch[1]);
    const dia = Number(bpMatch[2]);
    if (Number.isFinite(sys)) {
      found.push({
        key: "bp_systolic",
        label: "Systolic BP",
        value: sys,
        unit: "mmHg",
        date,
        documentId: doc.document_id,
        documentTitle: doc.title,
        refLow: 90,
        refHigh: 140,
        status: classify(sys, 90, 140),
      });
    }
    if (Number.isFinite(dia)) {
      found.push({
        key: "bp_diastolic",
        label: "Diastolic BP",
        value: dia,
        unit: "mmHg",
        date,
        documentId: doc.document_id,
        documentTitle: doc.title,
        refLow: 60,
        refHigh: 90,
        status: classify(dia, 60, 90),
      });
    }
  }

  const hrMatch = text.match(HR_PATTERN);
  if (hrMatch) {
    const value = Number(hrMatch[1]);
    if (Number.isFinite(value)) {
      found.push({
        key: "heart_rate",
        label: "Heart rate",
        value,
        unit: "bpm",
        date,
        documentId: doc.document_id,
        documentTitle: doc.title,
        refLow: 60,
        refHigh: 100,
        status: classify(value, 60, 100),
      });
    }
  }

  const spo2Match = text.match(SPO2_PATTERN);
  if (spo2Match) {
    const value = Number(spo2Match[1]);
    if (Number.isFinite(value)) {
      found.push({
        key: "spo2",
        label: "SpO₂",
        value,
        unit: "%",
        date,
        documentId: doc.document_id,
        documentTitle: doc.title,
        refLow: 95,
        refHigh: 100,
        status: classify(value, 95, 100),
      });
    }
  }

  return found;
}

export function parseMetricsFromDocument(doc: LabDocument): ParsedMetric[] {
  const text = [doc.title, doc.snippet, doc.raw_text].filter(Boolean).join("\n");
  if (!text.trim()) return [];
  const date = parseDocumentDate(doc) ?? startOfDay(new Date());
  return parseMetricFromText(text, doc, date);
}

export function parseAllMetrics(documents: LabDocument[]): ParsedMetric[] {
  const all = documents.flatMap(parseMetricsFromDocument);
  return all.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function groupMetricsByKey(metrics: ParsedMetric[]) {
  const map = new Map<string, ParsedMetric[]>();
  for (const metric of metrics) {
    const list = map.get(metric.key) ?? [];
    list.push(metric);
    map.set(metric.key, list);
  }
  for (const [key, list] of map) {
    map.set(
      key,
      [...list].sort((a, b) => a.date.getTime() - b.date.getTime()),
    );
  }
  return map;
}

export function buildMetricInsights(
  metrics: ParsedMetric[],
  documents: LabDocument[],
): MetricInsight[] {
  const insights: MetricInsight[] = [];
  const grouped = groupMetricsByKey(metrics);

  for (const [key, series] of grouped) {
    const latest = series[series.length - 1];
    if (!latest) continue;

    if (latest.status === "high") {
      insights.push({
        id: `${key}-high`,
        severity: "watch",
        title: `${latest.label} above typical range`,
        detail: `Latest reading ${latest.value} ${latest.unit} on ${latest.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. Saheli cites printed values only — discuss with a clinician.`,
        metric: latest.label,
      });
    } else if (latest.status === "low") {
      insights.push({
        id: `${key}-low`,
        severity: "watch",
        title: `${latest.label} below typical range`,
        detail: `Latest reading ${latest.value} ${latest.unit}. Track the trend and share reports with their doctor.`,
        metric: latest.label,
      });
    }

    if (series.length >= 2) {
      const prev = series[series.length - 2];
      const delta = latest.value - prev.value;
      const pct = prev.value ? Math.round((delta / prev.value) * 100) : 0;
      if (Math.abs(pct) >= 8) {
        insights.push({
          id: `${key}-trend`,
          severity: "info",
          title: `${latest.label} ${delta > 0 ? "trending up" : "trending down"}`,
          detail: `Changed from ${prev.value} to ${latest.value} ${latest.unit} (${pct > 0 ? "+" : ""}${pct}%) between ${prev.date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} and ${latest.date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}.`,
          metric: latest.label,
        });
      }
    }
  }

  const vitalsCount = documents.filter((d) => d.kind === "vitals").length;
  const labCount = documents.filter((d) => d.kind === "lab").length;
  if (documents.length === 0) {
    insights.unshift({
      id: "empty",
      severity: "info",
      title: "No health records on file yet",
      detail: "Upload lab reports or log vitals to unlock trend charts and monitoring insights.",
    });
  } else if (metrics.length === 0) {
    insights.unshift({
      id: "no-parse",
      severity: "info",
      title: "Records stored — add numeric values for trends",
      detail: `${documents.length} document${documents.length === 1 ? "" : "s"} on file. Paste readings like “TSH 4.2 mIU/L” or upload PDFs with printed values for charting.`,
    });
  } else {
    insights.unshift({
      id: "summary",
      severity: "info",
      title: `${metrics.length} readings tracked across ${grouped.size} markers`,
      detail: `${labCount} lab report${labCount === 1 ? "" : "s"}, ${vitalsCount} vitals entr${vitalsCount === 1 ? "y" : "ies"}. Insights are generated from stored printed values — not a diagnosis.`,
    });
  }

  return insights.slice(0, 8);
}

export function metricsInRange(metrics: ParsedMetric[], endDate: Date, days: number) {
  const start = addDays(endDate, -(days - 1));
  return metrics.filter((m) => m.date >= start && m.date <= endDate);
}

export function countDocumentsInMonth(documents: LabDocument[], date: Date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  return documents.filter((doc) => {
    const d = parseDocumentDate(doc);
    return d && d.getMonth() === month && d.getFullYear() === year;
  }).length;
}
