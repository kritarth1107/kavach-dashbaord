"use client";

import { Loader2, MessageSquare, Sun } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSaheliChat, triggerSaheliCheckIn, type SaheliMessage } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { SaheliReply } from "@/components/dashboard/chat/saheli-reply";
import { formatWhen } from "@/components/dashboard/family/morning-briefing-card";

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
  const [checkInError, setCheckInError] = useState("");
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
    setCheckInError("");
    try {
      await triggerSaheliCheckIn(activeFamilyId, recipientUserId);
      await load();
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <section
      className={`panel-card flex flex-col overflow-hidden ${compact ? "mb-5" : "mb-6 min-h-[420px]"}`}
    >
      <div
        className={`flex items-start justify-between gap-2 border-b border-[var(--border-strong)] ${compact ? "px-3 py-3" : "px-5 py-4"}`}
      >
        <div>
          <h2
            className={`font-extrabold text-[var(--text-primary)] ${compact ? "text-[13px]" : "text-[16px]"}`}
          >
            {recipientName} ↔ Saheli
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
            Reported only · view only
          </p>
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

      {checkInError && (
        <p className="border-b border-[var(--border-strong)] px-4 py-2 text-[11px] text-red-600 dark:text-red-400">
          {checkInError}
        </p>
      )}

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
            <MessageSquare className="mb-2 h-5 w-5 text-[var(--text-tertiary)]" />
            <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
              No conversation yet
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              When {recipientName} talks to Saheli, it shows here.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            if (msg.role === "system") {
              return (
                <div key={`system-${i}`} className="flex justify-center">
                  <p className="max-w-[95%] rounded-full bg-[var(--surface)] px-3 py-1 text-center text-[10px] font-semibold text-[var(--text-secondary)]">
                    {msg.content}
                    {msg.createdAt ? ` · ${formatWhen(msg.createdAt)}` : ""}
                  </p>
                </div>
              );
            }
            const fromSaheli = msg.role === "saheli";
            return (
              <div
                key={`${msg.role}-${i}-${msg.createdAt ?? ""}`}
                className={`flex ${fromSaheli ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                    fromSaheli
                      ? "border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text-primary)]"
                      : "bg-primary text-white"
                  }`}
                >
                  <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide opacity-70">
                    {fromSaheli ? "Saheli" : recipientName}
                    {msg.createdAt ? ` · ${formatWhen(msg.createdAt)}` : ""}
                  </p>
                  {fromSaheli ? <SaheliReply content={msg.content} /> : msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
