"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { DashboardCard } from "./dashboard-card";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const adherenceLine = [72, 78, 75, 82, 80, 85, 88, 84, 90, 87, 92, 94];
const checkInLine = [65, 70, 68, 74, 78, 76, 82, 85, 88, 86, 90, 91];
const alertLine = [12, 10, 8, 9, 7, 6, 8, 5, 4, 6, 3, 2];

function getPoints(
  values: number[],
  width: number,
  height: number,
  padding: number,
) {
  const max = 100;
  const stepX = (width - padding * 2) / (values.length - 1);
  return values.map((v, i) => ({
    x: padding + i * stepX,
    y: padding + ((max - v) / max) * (height - padding * 2),
  }));
}

function smoothPath(points: { x: number; y: number }[]) {
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

function areaPath(
  values: number[],
  width: number,
  height: number,
  padding: number,
) {
  const points = getPoints(values, width, height, padding);
  const line = smoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  const bottom = height - padding;
  return `${line} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
}

export function HealthOverviewChart() {
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");

  const width = 680;
  const height = 240;
  const padding = 36;
  const highlightIndex = 7;

  const adherencePoints = getPoints(
    adherenceLine,
    width,
    height,
    padding,
  );
  const highlight = adherencePoints[highlightIndex];

  return (
    <DashboardCard className="animate-fade-up animate-delay-3 overflow-hidden p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-[#0f172a]">
            Care Overview
          </h2>
          <p className="mt-1 text-[11.5px] font-medium text-[#94a3b8]">
            Medication, check-ins & alerts — last 12 months
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[12px] bg-[#f1f5f9] p-1">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`rounded-[10px] px-3.5 py-2 text-[11.5px] font-bold transition-all ${
                period === "monthly"
                  ? "bg-white text-[#0f172a] shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                  : "text-[#64748b] hover:text-[#334155]"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriod("yearly")}
              className={`rounded-[10px] px-3.5 py-2 text-[11.5px] font-bold transition-all ${
                period === "yearly"
                  ? "bg-[#0f172a] text-white shadow-[0_4px_12px_rgba(15,23,42,0.25)]"
                  : "text-[#64748b] hover:text-[#334155]"
              }`}
            >
              Yearly
            </button>
          </div>
          <button
            type="button"
            aria-label="More options"
            className="rounded-lg p-1.5 text-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#64748b]"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <p className="text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-[#0f172a]">
          94%
        </p>
        <span className="mb-1 inline-flex items-center rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[11px] font-extrabold text-[#059669] ring-1 ring-[#a7f3d0]/60">
          +4.9%
        </span>
        <p className="mb-1 text-[12px] font-medium text-[#94a3b8]">
          medication adherence
        </p>
      </div>

      <div className="mb-5 flex items-center gap-6">
        {[
          { label: "Adherence", color: "#7c3aed" },
          { label: "Check-ins", color: "#14b8a6" },
          { label: "Alerts", color: "#94a3b8" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11.5px] font-semibold text-[#64748b]">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="purpleArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="tealArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 25, 50, 75, 100].map((tick) => {
            const y = padding + ((100 - tick) / 100) * (height - padding * 2);
            return (
              <g key={tick}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#eef2f7"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#cbd5e1] text-[10px] font-semibold"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          <path
            d={areaPath(checkInLine, width, height, padding)}
            fill="url(#tealArea)"
          />
          <path
            d={areaPath(adherenceLine, width, height, padding)}
            fill="url(#purpleArea)"
          />

          <path
            d={smoothPath(getPoints(alertLine, width, height, padding))}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={smoothPath(getPoints(checkInLine, width, height, padding))}
            fill="none"
            stroke="#14b8a6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={smoothPath(adherencePoints)}
            fill="none"
            stroke="#7c3aed"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          <line
            x1={highlight.x}
            y1={padding - 8}
            x2={highlight.x}
            y2={height - padding}
            stroke="#7c3aed"
            strokeWidth="1.5"
            strokeDasharray="5 5"
            opacity={0.35}
          />
          <circle
            cx={highlight.x}
            cy={highlight.y}
            r="6"
            fill="#7c3aed"
            stroke="white"
            strokeWidth="3"
            filter="url(#glow)"
          />
        </svg>

        <div
          className="pointer-events-none absolute rounded-[12px] bg-[#7c3aed] px-3.5 py-2 text-[12px] font-extrabold text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]"
          style={{ left: "52%", top: "14%" }}
        >
          84%
          <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[#7c3aed]" />
        </div>
      </div>

      <div className="mt-1 flex justify-between px-8 text-[10.5px] font-semibold text-[#94a3b8]">
        {months.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </DashboardCard>
  );
}
