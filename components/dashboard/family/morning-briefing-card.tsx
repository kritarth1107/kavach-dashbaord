"use client";

import { Loader2, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getRecipientBriefing, type RecipientBriefing } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";

function formatWhen(iso: string | null) {
  if (!iso) return "Not yet";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "Not yet";
  const diffMin = Math.round((Date.now() - at.getTime()) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  return at.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MorningBriefingCard({
  recipientUserId,
  recipientName,
}: {
  recipientUserId: string;
  recipientName: string;
}) {
  const { activeFamilyId } = useFamily();
  const [briefing, setBriefing] = useState<RecipientBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeFamilyId || !recipientUserId) return;
    setLoading(true);
    try {
      const { data } = await getRecipientBriefing(activeFamilyId, recipientUserId);
      setBriefing(data ?? null);
    } catch {
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="panel-card mb-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#f0f0f2] px-5 py-4">
        <Sun className="h-4 w-4 text-primary" strokeWidth={2.25} />
        <div>
          <h2 className="text-[15px] font-extrabold text-[#111827]">
            {recipientName}&apos;s morning briefing
          </h2>
          <p className="text-[12px] text-[#9ca3af]">Reported only · not a diagnosis</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
              Last heard
            </p>
            <p className="mt-1 text-[13px] font-bold text-[#111827]">
              {formatWhen(briefing?.lastHeardAt ?? null)}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#6b7280]">
              {briefing?.lastHeardLine
                ? `“${briefing.lastHeardLine.slice(0, 140)}${briefing.lastHeardLine.length > 140 ? "…" : ""}”`
                : `${recipientName} has not spoken to Saheli yet.`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
              Last check-in
            </p>
            <p className="mt-1 text-[13px] font-bold text-[#111827]">
              {formatWhen(briefing?.lastCheckInAt ?? null)}
            </p>
            <p className="mt-1 text-[12px] text-[#6b7280]">
              {briefing?.todayItems.length
                ? `${briefing.todayItems.length} item${briefing.todayItems.length === 1 ? "" : "s"} on today’s list`
                : "Nothing on today’s care list"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
              Not confirmed yet
            </p>
            {briefing?.unconfirmedItems.length ? (
              <ul className="mt-1 space-y-1">
                {briefing.unconfirmedItems.slice(0, 4).map((item) => (
                  <li key={`${item.title}-${item.time}`} className="text-[12px] text-[#111827]">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-[#9ca3af]">
                      {" "}
                      · {item.time}
                      {item.dosage ? ` · ${item.dosage}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12px] text-[#6b7280]">
                Nothing past due — or no schedule today.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
