"use client";

import { Loader2, MessageSquare, Sun } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSaheliChat, triggerSaheliCheckIn, type SaheliMessage } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";

type SaheliThreadPanelProps = {
  recipientUserId: string;
  recipientName: string;
  compact?: boolean;
};

export function SaheliThreadPanel({
  recipientUserId,
  recipientName,
  compact = false,
}: SaheliThreadPanelProps) {
  const { activeFamilyId } = useFamily();
  const [messages, setMessages] = useState<SaheliMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!activeFamilyId || !recipientUserId) return;
    setLoading(true);
    try {
      const { data } = await getSaheliChat(activeFamilyId, recipientUserId);
      setMessages(data?.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function handleCheckIn() {
    if (!activeFamilyId || checkingIn) return;
    setCheckingIn(true);
    try {
      await triggerSaheliCheckIn(activeFamilyId, recipientUserId);
      await load();
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <section
      className={`panel-card flex flex-col overflow-hidden ${compact ? "mb-5" : "mb-6 min-h-[420px]"}`}
    >
      <div
        className={`flex items-start justify-between gap-2 border-b border-[#f0f0f2] ${compact ? "px-3 py-3" : "px-5 py-4"}`}
      >
        <div>
          <h2 className={`font-extrabold text-[#111827] ${compact ? "text-[13px]" : "text-[16px]"}`}>
            {recipientName} ↔ Saheli
          </h2>
          <p className="mt-0.5 text-[11px] text-[#9ca3af]">Reported only · view only</p>
        </div>
        <button
          type="button"
          onClick={() => void handleCheckIn()}
          disabled={checkingIn}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {checkingIn ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sun className="h-3 w-3" />
          )}
          Check-in
        </button>
      </div>

      <div
        ref={listRef}
        className={`space-y-2 overflow-y-auto ${compact ? "max-h-[280px] px-3 py-3" : "flex-1 space-y-3 px-5 py-4"}`}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="mb-2 h-5 w-5 text-[#d1d5db]" />
            <p className="text-[12px] font-semibold text-[#6b7280]">No conversation yet</p>
            <p className="mt-1 text-[11px] text-[#9ca3af]">
              When {recipientName} talks to Saheli, it shows here.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            if (msg.role === "system") {
              return (
                <div key={`system-${i}`} className="flex justify-center">
                  <p className="max-w-[95%] rounded-full bg-[#f3f4f6] px-3 py-1 text-center text-[10px] font-semibold text-[#6b7280]">
                    {msg.content}
                  </p>
                </div>
              );
            }
            const fromSaheli = msg.role === "saheli";
            return (
              <div
                key={`${msg.role}-${i}`}
                className={`flex ${fromSaheli ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                    fromSaheli
                      ? "bg-[#f3f4f6] text-[#111827]"
                      : "bg-primary text-white"
                  }`}
                >
                  <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide opacity-70">
                    {fromSaheli ? "Saheli" : recipientName}
                  </p>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
