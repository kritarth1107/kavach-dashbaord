"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFamilyActivity, type ActivityItem } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";

export function ActivityLogPage() {
  const { activeFamilyId } = useFamily();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!activeFamilyId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await getFamilyActivity(activeFamilyId);
      setItems(data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!activeFamilyId) {
    return (
      <p className="py-12 text-center text-[13px] text-[var(--text-tertiary)]">
        Select a family to view activity.
      </p>
    );
  }

  return (
    <div className="panel-card overflow-hidden">
      <div className="border-b border-[var(--border-strong)] px-5 py-4">
        <h1 className="text-[16px] font-extrabold text-[var(--text-primary)]">Activity Log</h1>
        <p className="text-[12px] text-[var(--text-tertiary)]">
          Schedules, labs, Saheli messages, and orders for this family
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[12px] text-[#b91c1c]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Nothing logged yet</p>
          <p className="mt-2 text-[13px] text-[var(--text-tertiary)]">
            Start a{" "}
            <Link href="/dashboard/chat" className="font-semibold text-primary hover:underline">
              Saheli conversation
            </Link>{" "}
            or upload a record in the medical vault.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-strong)]">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[var(--text-primary)]">{item.title}</p>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  {item.recipientName} · {item.detail}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--input-bg)] px-3 py-1 text-[10px] font-bold capitalize text-[var(--text-secondary)]">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
