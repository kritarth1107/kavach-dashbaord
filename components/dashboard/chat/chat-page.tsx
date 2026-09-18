"use client";

import { ArrowUp, ExternalLink, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCaregiverSaheliChat,
  getFamilyMembers,
  getRecipientLabs,
  getSaheliChat,
  listCaregiverSaheliChatSessions,
  listSaheliChatSessions,
  sendCaregiverSaheliChat,
  sendSaheliChat,
  formatSaheliError,
  streamCaregiverSaheliChat,
  type LabDocument,
  type SaheliChatSession,
  type SaheliMessage,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { formatWhen } from "@/components/dashboard/family/morning-briefing-card";
import { buildChatPrompts } from "@/components/dashboard/chat/chat-prompts";
import { ChatHistorySidebar } from "@/components/dashboard/chat/chat-history-sidebar";
import { ChatConnectPartnerCard } from "@/components/dashboard/chat/chat-connect-partner-card";
import { ChatOrderCard } from "@/components/dashboard/chat/chat-order-card";
import { SaheliReply } from "@/components/dashboard/chat/saheli-reply";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { cn } from "@/lib/utils";

function groupMessagesByDay(messages: SaheliMessage[]) {
  const groups: Array<{ label: string; messages: SaheliMessage[] }> = [];
  let currentLabel = "";
  for (const msg of messages) {
    const label = msg.createdAt
      ? new Date(msg.createdAt).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
      : "Earlier";
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export function ChatPage() {
  const searchParams = useSearchParams();
  const requestedRecipient = searchParams.get("recipient");
  const initialQuery = searchParams.get("q");
  const initialQuerySent = useRef(false);
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const isRecipient = isCareRecipientRole(activeFamily?.role);

  const [recipients, setRecipients] = useState<Array<{ userId: string; name: string }>>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(requestedRecipient);
  const [myName, setMyName] = useState("You");
  const [messages, setMessages] = useState<SaheliMessage[]>([]);
  const [sessions, setSessions] = useState<SaheliChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [labs, setLabs] = useState<LabDocument[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(false);
  const [lastFailedText, setLastFailedText] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [streamingOrder, setStreamingOrder] = useState<SaheliMessage["order"]>();
  const [streamingConnect, setStreamingConnect] = useState<SaheliMessage["connect"]>();
  const [streamingTools, setStreamingTools] = useState<string[]>([]);
  const { setCollapsed } = useSidebar();
  const bottomRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const wasCollapsed = localStorage.getItem("kavach-sidebar-collapsed") === "true";
    setCollapsed(true);
    return () => setCollapsed(wasCollapsed);
  }, [setCollapsed]);

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

  const loadSessions = useCallback(async () => {
    if (!activeFamilyId || !selectedRecipientId) {
      setSessions([]);
      return;
    }
    setLoadingSessions(true);
    try {
      const { data } = isRecipient
        ? await listSaheliChatSessions(activeFamilyId, selectedRecipientId)
        : await listCaregiverSaheliChatSessions(activeFamilyId, selectedRecipientId);
      setSessions(data?.sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [activeFamilyId, selectedRecipientId, isRecipient]);

  const loadChat = useCallback(
    async (sessionId: string | null) => {
      if (!activeFamilyId || !selectedRecipientId) {
        setMessages([]);
        setLoading(false);
        return;
      }
      if (!sessionId) {
        setMessages([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [{ data }, labsRes] = await Promise.all([
          isRecipient
            ? getSaheliChat(activeFamilyId, selectedRecipientId, sessionId)
            : getCaregiverSaheliChat(activeFamilyId, selectedRecipientId, sessionId),
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
    },
    [activeFamilyId, selectedRecipientId, isRecipient],
  );

  useEffect(() => {
    void loadRecipients().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load family");
      setLoading(false);
    });
  }, [loadRecipients]);

  useEffect(() => {
    setActiveSessionId(null);
    setMessages([]);
    setLoading(false);
    void loadSessions();
  }, [loadSessions, selectedRecipientId]);

  useEffect(() => {
    void loadChat(activeSessionId);
  }, [activeSessionId, loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, streamingText]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const selectedName = useMemo(
    () => recipients.find((r) => r.userId === selectedRecipientId)?.name ?? "",
    [recipients, selectedRecipientId],
  );

  const prompts = useMemo(
    () => buildChatPrompts(isRecipient, selectedName, labs),
    [isRecipient, selectedName, labs],
  );

  const messageGroups = useMemo(() => groupMessagesByDay(messages), [messages]);

  async function sendText(text: string) {
    if (!activeFamilyId || !selectedRecipientId || !text.trim() || sending) return;
    const trimmed = text.trim();
    const outgoingRole = isRecipient ? "elder" : "family";
    setInput("");
    setSending(true);
    setError("");
    setRetryable(false);
    setLastFailedText("");
    setStreamingText("");
    setStreamingOrder(undefined);
    setStreamingConnect(undefined);
    setStreamingTools([]);
    setMessages((prev) => [
      ...prev,
      {
        role: outgoingRole,
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      if (!isRecipient) {
        let nextSessionId = activeSessionId ?? undefined;
        let finalReply = "";
        let finalOrder: SaheliMessage["order"];
        let finalConnect: SaheliMessage["connect"];

        for await (const event of streamCaregiverSaheliChat(
          activeFamilyId,
          selectedRecipientId,
          trimmed,
          activeSessionId ?? undefined,
        )) {
          if (event.type === "token") {
            finalReply += event.delta;
            setStreamingText((prev) => prev + event.delta);
          } else if (event.type === "tool_start") {
            setStreamingTools((prev) =>
              prev.includes(event.name) ? prev : [...prev, event.name],
            );
          } else if (event.type === "tool_result") {
            if (event.order) {
              finalOrder = event.order;
              setStreamingOrder(event.order);
            }
            if (event.connect) {
              finalConnect = event.connect;
              setStreamingConnect(event.connect);
            }
          } else if (event.type === "done") {
            if (event.sessionId) nextSessionId = event.sessionId;
            if (event.reply?.trim()) finalReply = event.reply.trim();
            if (event.order) {
              finalOrder = event.order;
              setStreamingOrder(event.order);
            }
            if (event.connect) {
              finalConnect = event.connect;
              setStreamingConnect(event.connect);
            }
          } else if (event.type === "error") {
            throw new Error(formatSaheliError(event.message));
          }
        }

        if (nextSessionId && !activeSessionId) {
          setActiveSessionId(nextSessionId);
        }

        if (finalReply) {
          setMessages((prev) => [
            ...prev,
            {
              role: "saheli",
              content: finalReply,
              createdAt: new Date().toISOString(),
              order: finalOrder,
              connect: finalConnect,
            },
          ]);
        } else if (nextSessionId) {
          await loadChat(nextSessionId);
        }
      } else {
        const { data } = await sendSaheliChat(
          activeFamilyId,
          selectedRecipientId,
          trimmed,
          activeSessionId ?? undefined,
        );

        if (data?.sessionId && !activeSessionId) {
          setActiveSessionId(data.sessionId);
        }

        if (data?.reply) {
          setMessages((prev) => [
            ...prev,
            {
              role: "saheli",
              content: data.reply,
              createdAt: new Date().toISOString(),
              order: data.order,
              connect: data.connect,
            },
          ]);
        } else if (data?.sessionId) {
          await loadChat(data.sessionId);
        }
      }

      void loadSessions();
    } catch (err) {
      const message = formatSaheliError(
        err instanceof Error ? err.message : "Failed to send message",
      );
      const isOffline =
        /reconnecting|503|offline|too long|cannot reach/i.test(message);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === outgoingRole && last.content === trimmed) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setInput(trimmed);
      setError(message);
      setRetryable(isOffline);
      setLastFailedText(trimmed);
    } finally {
      setSending(false);
      setStreamingText("");
      setStreamingOrder(undefined);
      setStreamingConnect(undefined);
      setStreamingTools([]);
      boxRef.current?.focus();
    }
  }

  useEffect(() => {
    if (
      !initialQuery?.trim() ||
      initialQuerySent.current ||
      !activeFamilyId ||
      !selectedRecipientId ||
      loading ||
      sending
    ) {
      return;
    }
    initialQuerySent.current = true;
    void sendText(initialQuery.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when chat is ready
  }, [initialQuery, activeFamilyId, selectedRecipientId, loading, sending]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendText(input);
    }
  }

  async function handleNewChat() {
    if (!activeFamilyId || !selectedRecipientId) return;
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
    setError("");
  }

  async function handleSelectSession(sessionId: string) {
    setActiveSessionId(sessionId);
  }

  if (!activeFamilyId) {
    return (
      <p className="flex flex-1 items-center justify-center text-[13px] text-[var(--text-secondary)]">
        Select a family to open Saheli.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 bg-[var(--background)]">
      <ChatHistorySidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        loading={loadingSessions}
        isRecipient={isRecipient}
        selectedName={selectedName}
        onNewChat={() => void handleNewChat()}
        onSelectSession={(sessionId) => void handleSelectSession(sessionId)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-strong)] px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold text-[var(--text-primary)]">
              {isRecipient ? "Ask Saheli" : `Ask Saheli · ${selectedName}`}
            </h1>
            <p className="truncate text-[12px] text-[var(--text-tertiary)]">
              {activeSessionId
                ? "This session keeps full context"
                : "New chat — ask about care, labs, orders, or Kavach"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isRecipient && recipients.length > 1 && (
              <select
                value={selectedRecipientId ?? ""}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="max-w-[160px] rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-primary)]"
              >
                {recipients.map((r) => (
                  <option key={r.userId} value={r.userId}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            {!isRecipient && selectedRecipientId && (
              <Link
                href={`/dashboard/family/${selectedRecipientId}/health-record`}
                className="hidden items-center gap-1 rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-primary hover:text-primary sm:inline-flex"
              >
                Health records
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </header>

        {error && (
          <div className="alert-error mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-[12px]">
            <span>{error}</span>
            {retryable && lastFailedText ? (
              <button
                type="button"
                onClick={() => void sendText(lastFailedText)}
                className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-red-700 hover:bg-white"
              >
                Retry
              </button>
            ) : null}
          </div>
        )}

        {recipients.length === 0 && !loading ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <Sparkles className="mb-3 h-10 w-10 text-[var(--text-tertiary)]" />
            <p className="text-[15px] font-bold text-[var(--text-primary)]">No care recipient yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-[var(--text-tertiary)]">
              Add a care recipient under Family Members to start chatting with Saheli.
            </p>
          </div>
        ) : (
          <>
            <div className="no-scrollbar flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl px-4 py-6">
                {loading ? (
                  <div className="flex justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                      <Sparkles className="h-7 w-7" strokeWidth={2} />
                    </div>
                    <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
                      {isRecipient ? "Namaste!" : `How is ${selectedName || "your parent"}?`}
                    </h2>
                    <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[var(--text-secondary)]">
                      {isRecipient
                        ? "I'm Saheli — your family companion. Tell me how you're feeling, ask about medicines, or order from Swiggy, Instamart, or Zepto."
                        : "Ask about labs, mood, schedules, or order groceries and food. Connect a partner in-chat if needed — each chat keeps its own context."}
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-2">
                      {prompts.slice(0, 4).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void sendText(prompt)}
                          disabled={sending}
                          className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[12px] font-medium text-[var(--text-secondary)] shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-[var(--text-primary)] disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {messageGroups.map((group) => (
                      <div key={group.label}>
                        <div className="mb-4 flex justify-center">
                          <span className="rounded-full bg-[var(--input-bg)] px-3 py-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                            {group.label}
                          </span>
                        </div>
                        <div className="space-y-6">
                          {group.messages.map((msg, i) => {
                            if (msg.role === "system") {
                              return (
                                <div key={`system-${i}`} className="flex justify-center">
                                  <p className="text-[11px] text-[var(--text-tertiary)]">
                                    {msg.content}
                                    {msg.createdAt ? ` · ${formatWhen(msg.createdAt)}` : ""}
                                  </p>
                                </div>
                              );
                            }

                            const mine = msg.role !== "saheli";
                            return (
                              <div
                                key={`${msg.role}-${i}-${msg.createdAt ?? ""}`}
                                className={cn("flex gap-3", mine ? "flex-row-reverse" : "flex-row")}
                              >
                                {!mine && (
                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-[11px] font-bold text-white shadow-sm">
                                    S
                                  </div>
                                )}
                                <div
                                  className={cn(
                                    "min-w-0 max-w-[85%] sm:max-w-[75%]",
                                    mine ? "text-right" : "text-left",
                                  )}
                                >
                                  <p className="mb-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                                    {mine
                                      ? isRecipient
                                        ? selectedName || "You"
                                        : myName || "You"
                                      : "Saheli"}
                                    {msg.createdAt ? ` · ${formatWhen(msg.createdAt)}` : ""}
                                  </p>
                                  <div
                                    className={cn(
                                      "inline-block rounded-2xl px-4 py-2.5 text-left",
                                      mine
                                        ? "bg-primary text-white"
                                        : "bg-[var(--input-bg)] text-[var(--text-primary)]",
                                    )}
                                  >
                                    {mine ? (
                                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{msg.content}</p>
                                    ) : (
                                      <div className="text-[14px] leading-relaxed">
                                        <SaheliReply content={msg.content} />
                                        {msg.connect && <ChatConnectPartnerCard connect={msg.connect} />}
                                        {msg.order && <ChatOrderCard order={msg.order} />}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {sending && (
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-[11px] font-bold text-white">
                          S
                        </div>
                        <div className="min-w-0 max-w-[85%] sm:max-w-[75%]">
                          {streamingTools.length > 0 && (
                            <p className="mb-1 text-[10px] font-medium text-[var(--text-tertiary)]">
                              Checking {streamingTools.join(", ").replaceAll("_", " ")}…
                            </p>
                          )}
                          <div className="rounded-2xl bg-[var(--input-bg)] px-4 py-3 text-left text-[14px] leading-relaxed text-[var(--text-primary)]">
                            {streamingText ? (
                              <SaheliReply content={streamingText} />
                            ) : (
                              <div className="flex items-center gap-1 py-0.5">
                                <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.2s]" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.1s]" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70" />
                              </div>
                            )}
                            {streamingConnect && <ChatConnectPartnerCard connect={streamingConnect} />}
                            {streamingOrder && <ChatOrderCard order={streamingOrder} />}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
            </div>

            {recipients.length > 0 && (
              <div className="shrink-0 border-t border-[var(--border-strong)] bg-[var(--background)] px-4 pb-4 pt-3">
                <div className="mx-auto w-full max-w-3xl">
                  {messages.length > 0 && (
                    <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                      {prompts.slice(0, 3).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void sendText(prompt)}
                          disabled={sending}
                          className="shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:border-primary/30 hover:text-primary disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendText(input);
                    }}
                    className="relative flex items-end rounded-[26px] border border-[var(--border-strong)] bg-[var(--card)] shadow-[var(--shadow-soft)] focus-within:border-primary/50"
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
                          : `Ask about ${selectedName || "your parent"}…`
                      }
                      className="max-h-40 flex-1 resize-none bg-transparent px-4 py-3.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      className="mb-2 mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-30"
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
                    Connect Swiggy in Integrations to place live food orders · family approves before checkout
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
