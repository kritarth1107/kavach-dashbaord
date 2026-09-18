"use client";

import { Loader2, MessageSquarePlus, Sparkles } from "lucide-react";
import { formatWhen } from "@/components/dashboard/family/morning-briefing-card";
import type { SaheliChatSession } from "@/lib/api";
import { cn } from "@/lib/utils";

type ChatHistorySidebarProps = {
  sessions: SaheliChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  isRecipient: boolean;
  selectedName: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
};

export function ChatHistorySidebar({
  sessions,
  activeSessionId,
  loading,
  isRecipient,
  selectedName,
  onNewChat,
  onSelectSession,
}: ChatHistorySidebarProps) {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--border-strong)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border-strong)] px-3 py-3">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold text-[var(--text-primary)]">Saheli</p>
            <p className="truncate text-[11px] text-[var(--text-tertiary)]">
              {isRecipient ? "Your companion" : selectedName || "Care recipient"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          Chat history
        </p>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-4 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            No past chats yet. Start typing to begin your first session.
          </p>
        ) : (
          <div className="mt-1 space-y-1">
            {sessions.map((session) => (
              <button
                key={session.sessionId}
                type="button"
                onClick={() => onSelectSession(session.sessionId)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                  activeSessionId === session.sessionId
                    ? "bg-primary/10 ring-1 ring-primary/20"
                    : "hover:bg-[var(--input-bg)]",
                )}
              >
                <p className="truncate text-[12px] font-semibold text-[var(--text-primary)]">
                  {session.title || "New chat"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--text-tertiary)]">
                  {session.preview || "Empty chat"}
                </p>
                {session.updatedAt && (
                  <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                    {formatWhen(session.updatedAt)}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
