"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSaheliInsights, type SaheliInsight } from "@/lib/api";
import { cn } from "@/lib/utils";

export function SaheliInsightsBanner({
  familyId,
  recipientUserId,
  chatHref,
}: {
  familyId: string;
  recipientUserId: string;
  chatHref: string;
}) {
  const [insights, setInsights] = useState<SaheliInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getSaheliInsights(familyId, recipientUserId)
      .then(({ data }) => {
        if (!cancelled) setInsights(data?.insights ?? []);
      })
      .catch(() => {
        if (!cancelled) setInsights([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [familyId, recipientUserId]);

  if (loading || insights.length === 0) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/8 via-[var(--card)] to-primary/5 p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-[var(--text-primary)]">Saheli noticed</p>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Pending items from your family care record
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {insights.slice(0, 3).map((item, idx) => (
          <li
            key={`${item.kind}-${idx}`}
            className={cn(
              "flex items-start gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2.5",
            )}
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">{item.title}</p>
              <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href={chatHref}
        className="mt-3 inline-flex text-[11px] font-semibold text-primary hover:underline"
      >
        Open Saheli to follow up →
      </Link>
    </section>
  );
}
