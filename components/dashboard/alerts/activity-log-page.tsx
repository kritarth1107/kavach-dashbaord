"use client";

import { Loader2, MessageSquare, Pill, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFamilyActivity, type ActivityItem } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";

function activityIcon(type: ActivityItem["type"]) {
  if (type === "message") return MessageSquare;
  if (type === "check_in") return Sun;
  return Pill;
}

function activityIconBg(type: ActivityItem["type"]) {
  if (type === "message") return "bg-[#dcfce7]";
  if (type === "check_in") return "bg-[#fef9c3]";
  return "bg-[#ede9fe]";
}

function statusClass(status: ActivityItem["status"]) {
  if (status === "scheduled") return "status-pill-pending";
  return "status-pill-success";
}

function statusLabel(status: ActivityItem["status"]) {
  if (status === "scheduled") return "Scheduled";
  if (status === "completed") return "Completed";
  return "Reported";
}

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
      <p className="py-12 text-center text-[13px] text-[#6b7280]">
        Select a family to view activity.
      </p>
    );
  }

  return (
    <div className="panel-card overflow-hidden">
      <div className="border-b border-[#f0f0f2] px-5 py-4">
        <h1 className="text-[16px] font-extrabold text-[#111827]">Activity Log</h1>
        <p className="text-[12px] text-[#9ca3af]">
          Saheli messages and today&apos;s care schedule · reported only
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
          <p className="text-[14px] font-bold text-[#111827]">Nothing logged yet</p>
          <p className="mt-2 text-[13px] text-[#9ca3af]">
            Start a{" "}
            <Link href="/dashboard/chat" className="font-semibold text-primary hover:underline">
              Saheli conversation
            </Link>{" "}
            or add care schedules for a recipient.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#f5f5f7]">
          {items.map((item) => {
            const Icon = activityIcon(item.type);
            return (
              <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activityIconBg(item.type)}`}
                >
                  <Icon className="h-4 w-4 text-[#374151]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#111827]">{item.title}</p>
                  <p className="text-[12px] text-[#6b7280]">
                    {item.recipientName} · {item.detail}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold ${statusClass(item.status)}`}
                >
                  {statusLabel(item.status)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
