"use client";

import { useId } from "react";

export function smoothPath(
  values: number[],
  width: number,
  height: number,
  padding: number,
) {
  const max = Math.max(...values) * 1.1;
  const min = Math.min(...values) * 0.9;
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (values.length - 1);
  const points = values.map((v, i) => ({
    x: padding + i * stepX,
    y: padding + ((max - v) / range) * (height - padding * 2),
  }));

  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function Sparkline({
  color,
  data,
  className = "h-7 w-20",
}: {
  color: string;
  data: number[];
  className?: string;
}) {
  const w = 80;
  const h = 28;
  const pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + ((max - v) / range) * (h - pad * 2),
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AreaTrendChart({
  data,
  labels,
  gradientId,
  stroke = "#1a1a1a",
  fillColor = "#16a34a",
  height = 120,
}: {
  data: number[];
  labels?: string[];
  gradientId?: string;
  stroke?: string;
  fillColor?: string;
  height?: number;
}) {
  const autoId = useId();
  const gradId = gradientId ?? autoId;
  const width = 400;
  const padding = 16;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + (i * (height - padding * 2)) / 3}
            x2={width - padding}
            y2={padding + (i * (height - padding * 2)) / 3}
            stroke="#f0f0f2"
            strokeWidth="1"
          />
        ))}
        <path
          d={`${smoothPath(data, width, height, padding)} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
          fill={`url(#${gradId})`}
        />
        <path
          d={smoothPath(data, width, height, padding)}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {labels && (
        <div className="mt-2 flex justify-between px-1">
          {labels.map((label) => (
            <span key={label} className="text-[10px] font-medium text-[#9ca3af]">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function BarChart({
  data,
  labels,
  color = "#16a34a",
  maxValue,
}: {
  data: number[];
  labels: string[];
  color?: string;
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(...data, 1);

  return (
    <div className="flex h-32 items-end justify-between gap-2">
      {data.map((value, i) => (
        <div key={labels[i]} className="flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-[36px] rounded-t-md transition-all"
              style={{
                height: `${Math.max(8, (value / max) * 100)}%`,
                backgroundColor: color,
                opacity: value === max ? 1 : 0.65,
              }}
            />
          </div>
          <span className="text-[10px] font-medium text-[#9ca3af]">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  color = "#16a34a",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f0f0f2"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.1rem] font-extrabold text-[#111827]">{value}%</span>
        {label && (
          <span className="text-[9px] font-semibold uppercase text-[#9ca3af]">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export function MiniVitalBar({
  label,
  value,
  unit,
  pct,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#f0f0f2] bg-[#fafafa] p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
          {label}
        </p>
        <p className="text-[13px] font-extrabold text-[#111827]">
          {value}
          <span className="ml-0.5 text-[10px] font-medium text-[#9ca3af]">{unit}</span>
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
