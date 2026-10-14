"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { getFamilyActivity, type ActivityItem } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { formatIstDateTime } from "@/components/dashboard/activity/activity-shared";
import { useRun } from "@/lib/use-run";

export function ActivityLogPage() {
  const { activeFamilyId } = useFamily();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    // Only the newest request may write: a family switch mid-request must not show the previous family's log.
    const reqId = ++reqRef.current;
    if (!activeFamilyId) return;
    setLoading(true);
    setError("");
    setItems([]);
    try {
      const { data } = await getFamilyActivity(activeFamilyId);
      if (reqId !== reqRef.current) return;
      setItems(data?.items ?? []);
    } catch {
      if (reqId !== reqRef.current) return;
      setError("Couldn't load the activity log. Check your connection and try again.");
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, [activeFamilyId]);

  useRun(load);

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

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="px-5 py-12 text-center">
          <div className="alert-error mx-auto max-w-md rounded-lg px-4 py-3 text-[12px]">{error}</div>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 text-[12px] font-semibold text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Nothing logged yet</p>
          <p className="mt-2 text-[13px] text-[var(--text-tertiary)]">
            Saheli&apos;s WhatsApp conversations and orders show up here. You can also upload a
            record in the medical vault.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-strong)]">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="break-words text-[13px] font-bold text-[var(--text-primary)]">{item.title}</p>
                <p className="break-words text-[12px] text-[var(--text-secondary)]">
                  {[item.recipientName, item.detail].filter(Boolean).join(" · ")}
                </p>
                {item.at && (
                  <time dateTime={item.at} className="mt-0.5 block text-[11px] text-[var(--text-tertiary)]">
                    {formatIstDateTime(item.at)}
                  </time>
                )}
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
