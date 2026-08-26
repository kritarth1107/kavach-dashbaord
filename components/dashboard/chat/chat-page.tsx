"use client";

import {
  ArrowUp,
  ExternalLink,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCaregiverSaheliChat,
  getFamilyMembers,
  getRecipientLabs,
  getSaheliChat,
  sendCaregiverSaheliChat,
  sendSaheliChat,
  type LabDocument,
  type SaheliMessage,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { formatWhen } from "@/components/dashboard/family/morning-briefing-card";
import { buildChatPrompts } from "@/components/dashboard/chat/chat-prompts";
import { SaheliReply } from "@/components/dashboard/chat/saheli-reply";

export function ChatPage() {
  const searchParams = useSearchParams();
  const requestedRecipient = searchParams.get("recipient");
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const isRecipient = isCareRecipientRole(activeFamily?.role);

  const [recipients, setRecipients] = useState<
    Array<{ userId: string; name: string }>
  >([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    requestedRecipient,
  );
  const [myName, setMyName] = useState("You");
  const [messages, setMessages] = useState<SaheliMessage[]>([]);
  const [labs, setLabs] = useState<LabDocument[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const loadRecipients = useCallback(async () => {
    if (!activeFamilyId) return;
    const { data } = await getFamilyMembers(activeFamilyId);
    if (!data) throw new Error("Failed to load family");

    const me = data.members.find((m) => m.userId === userId);
    if (me?.name) setMyName(me.name.split(" ")[0] || me.name);

    const list = data.members
      .map(apiMemberToFamilyMember)
      .filter(
        (m): m is typeof m & { userId: string } =>
          isCareRecipientRole(m.role) && m.status === "joined" && Boolean(m.userId),
      )
      .map((m) => ({ userId: m.userId, name: m.name }));

    setRecipients(list);

    if (isRecipient && userId) {
      setSelectedRecipientId(userId);
    } else if (requestedRecipient && list.some((r) => r.userId === requestedRecipient)) {
      setSelectedRecipientId(requestedRecipient);
    } else {
      setSelectedRecipientId((prev) => prev ?? list[0]?.userId ?? null);
    }
  }, [activeFamilyId, isRecipient, userId, requestedRecipient]);

  const loadChat = useCallback(async () => {
    if (!activeFamilyId || !selectedRecipientId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [{ data }, labsRes] = await Promise.all([
        isRecipient
          ? getSaheliChat(activeFamilyId, selectedRecipientId)
          : getCaregiverSaheliChat(activeFamilyId, selectedRecipientId),
        getRecipientLabs(activeFamilyId, selectedRecipientId).catch(() => ({ data: undefined })),
      ]);
      setMessages(data?.messages ?? []);
      setLabs(labsRes.data?.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, selectedRecipientId, isRecipient]);

  useEffect(() => {
    void loadRecipients().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load family");
      setLoading(false);
    });
  }, [loadRecipients]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const selectedName = useMemo(
    () => recipients.find((r) => r.userId === selectedRecipientId)?.name ?? "",
    [recipients, selectedRecipientId],
  );

  const prompts = useMemo(
    () => buildChatPrompts(isRecipient, selectedName, labs),
    [isRecipient, selectedName, labs],
  );

  async function sendText(text: string) {
    if (!activeFamilyId || !selectedRecipientId || !text.trim() || sending) return;
    const trimmed = text.trim();
    const outgoingRole = isRecipient ? "elder" : "family";
    setInput("");
    setSending(true);
    setError("");
    setMessages((prev) => [
      ...prev,
      {
        role: outgoingRole,
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const { data } = isRecipient
        ? await sendSaheliChat(activeFamilyId, selectedRecipientId, trimmed)
        : await sendCaregiverSaheliChat(activeFamilyId, selectedRecipientId, trimmed);

      if (data?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "saheli", content: data.reply, createdAt: new Date().toISOString() },
        ]);
      } else {
        await loadChat();
      }
    } catch (err) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === outgoingRole && last.content === trimmed) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setInput(trimmed);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
      boxRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendText(input);
    }
  }

  if (!activeFamilyId) {
    return (
      <p className="py-12 text-center text-[13px] text-[var(--text-secondary)]">
        Select a family to view messages.
      </p>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8.5rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-strong)] px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_6px_16px_rgba(22,163,74,0.35)]">
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[15px] font-extrabold text-[var(--text-primary)]">
                {isRecipient ? "Saheli" : "Ask Saheli"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {isRecipient ? "Your companion" : "Cites the record"}
              </span>
            </div>
            <p className="truncate text-[12px] text-[var(--text-tertiary)]">
              {isRecipient
                ? "Warm check-ins · grounded in your family record"
                : selectedName
                  ? `${selectedName} · ${labs.length} reports on file`
                  : "Ask a printed value or how they are today"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isRecipient && selectedRecipientId && (
            <Link
              href={`/dashboard/family/${selectedRecipientId}/health-record`}
              className="hidden items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-primary hover:text-primary sm:inline-flex"
            >
              Health records
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
          {!isRecipient && recipients.length > 1 && (
            <select
              value={selectedRecipientId ?? ""}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-[12px] font-semibold text-[var(--text-primary)]"
            >
              {recipients.map((r) => (
                <option key={r.userId} value={r.userId}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {recipients.length === 0 && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <MessageSquare className="mb-3 h-8 w-8 text-[var(--text-tertiary)]" />
          <p className="text-[14px] font-bold text-[var(--text-primary)]">No care recipient yet</p>
          <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
            Add a care recipient under Family Members to start Saheli chat.
          </p>
        </div>
      )}

      {recipients.length > 0 && (
        <>
          <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
                  <Sparkles className="h-6 w-6" strokeWidth={2.25} />
                </div>
                <p className="text-[16px] font-extrabold text-[var(--text-primary)]">
                  {isRecipient ? "Say namaste" : `Ask about ${selectedName || "your parent"}`}
                </p>
                <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--text-tertiary)]">
                  {isRecipient
                    ? "Saheli remembers your schedule and health records — and saves what you say."
                    : "Saheli cites what they last said and printed values from the record. No interpretation."}
                </p>
              </div>
            ) : (
              messages.map((msg, i) => {
                if (msg.role === "system") {
                  return (
                    <div key={`system-${i}`} className="flex justify-center">
                      <p className="rounded-full bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                        {msg.content}
                        {msg.createdAt ? ` · ${formatWhen(msg.createdAt)}` : ""}
                      </p>
                    </div>
                  );
                }
                const mine = msg.role !== "saheli";
                const when = msg.createdAt ? formatWhen(msg.createdAt) : null;
                return (
                  <div
                    key={`${msg.role}-${i}-${msg.createdAt ?? ""}`}
                    className={`flex gap-2.5 ${mine ? "justify-end" : "justify-start"}`}
                  >
                    {!mine && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-white">
                        S
                      </div>
                    )}
                    <div className={`max-w-[min(100%,36rem)] ${mine ? "items-end" : "items-start"}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          mine
                            ? "bg-primary text-white"
                            : "border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text-primary)]"
                        }`}
                      >
                        <p
                          className={`mb-1.5 text-[10px] font-bold uppercase tracking-wide ${
                            mine ? "text-white/70" : "text-[var(--text-tertiary)]"
                          }`}
                        >
                          {mine
                            ? isRecipient
                              ? selectedName || "You"
                              : myName || "You"
                            : "Saheli"}
                          {when ? ` · ${when}` : ""}
                        </p>
                        {mine ? (
                          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.content}</p>
                        ) : (
                          <SaheliReply content={msg.content} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {sending && (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-white">
                  S
                </div>
                <div className="flex items-center gap-1 rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t border-[var(--border-strong)] bg-[var(--card)] px-4 py-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendText(prompt)}
                  disabled={sending}
                  className="shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-primary hover:bg-primary-light hover:text-primary disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendText(input);
              }}
              className="flex items-end gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 focus-within:border-primary"
            >
              <textarea
                ref={boxRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  isRecipient
                    ? "Message Saheli…"
                    : `Ask about ${selectedName || "your parent"} — TSH, creatinine, how they are…`
                }
                className="max-h-32 flex-1 resize-none bg-transparent py-2 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40"
                aria-label="Send"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                )}
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] text-[var(--text-tertiary)]">
              Enter to send · Shift+Enter for a new line · grounded in your family record
            </p>
          </div>
        </>
      )}
    </div>
  );
}
