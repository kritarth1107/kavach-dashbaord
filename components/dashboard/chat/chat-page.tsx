"use client";

import {
  ArrowUp,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
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

const CAREGIVER_PROMPTS = [
  "How is she today?",
  "Last TSH on file?",
  "Latest creatinine?",
  "What reports are saved?",
  "Latest PET-CT?",
];

const ELDER_PROMPTS = [
  "I took Shelcal after lunch.",
  "Feeling okay this morning.",
  "BP done — 118/76.",
];

function SaheliReply({ content }: { content: string }) {
  const chunks = content.split(/\n\n+/);
  return (
    <div className="space-y-2.5">
      {chunks.map((chunk, i) => {
        const fromMatch = chunk.match(/^(.*)\nFrom: “(.+)”\s*$/s);
        if (fromMatch) {
          return (
            <div key={i} className="space-y-1.5">
              <p className="text-[13px] leading-relaxed text-[#111827]">{fromMatch[1]}</p>
              <div className="flex items-start gap-2 rounded-xl border border-[#dcfce7] bg-[#f0fdf4] px-3 py-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                <p className="text-[11px] font-semibold leading-snug text-[#166534]">
                  {fromMatch[2]}
                </p>
              </div>
            </div>
          );
        }
        if (chunk.startsWith("Reported only")) {
          return (
            <p key={i} className="text-[11px] font-medium text-[#9ca3af]">
              {chunk}
            </p>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#111827]">
            {chunk}
          </p>
        );
      })}
    </div>
  );
}

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

  const selectedName = useMemo(
    () => recipients.find((r) => r.userId === selectedRecipientId)?.name ?? "",
    [recipients, selectedRecipientId],
  );

  const prompts = isRecipient ? ELDER_PROMPTS : CAREGIVER_PROMPTS;

  async function sendText(text: string) {
    if (!activeFamilyId || !selectedRecipientId || !text.trim() || sending) return;
    const trimmed = text.trim();
    setInput("");
    setSending(true);
    setError("");
    setMessages((prev) => [
      ...prev,
      {
        role: isRecipient ? "elder" : "family",
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
      }
    } catch (err) {
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
      <p className="py-12 text-center text-[13px] text-[#6b7280]">
        Select a family to view messages.
      </p>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8.5rem)] flex-col overflow-hidden rounded-2xl border border-[#f0f0f2] bg-white shadow-[0_8px_30px_rgba(17,24,39,0.04)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0f0f2] px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_6px_16px_rgba(22,163,74,0.35)]">
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-extrabold text-[#111827]">
                {isRecipient ? "Saheli" : "Ask Saheli"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Cites the record
              </span>
            </div>
            <p className="truncate text-[12px] text-[#9ca3af]">
              {isRecipient
                ? "Your companion · saved exactly as you said it"
                : selectedName
                  ? `${selectedName} · ${labs.length} reports on file`
                  : "Ask a printed value or how they are today"}
            </p>
          </div>
        </div>
        {!isRecipient && recipients.length > 1 && (
          <select
            value={selectedRecipientId ?? ""}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
            className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-[12px] font-semibold"
          >
            {recipients.map((r) => (
              <option key={r.userId} value={r.userId}>
                {r.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[12px] text-[#b91c1c]">
          {error}
        </div>
      )}

      {recipients.length === 0 && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <MessageSquare className="mb-3 h-8 w-8 text-[#d1d5db]" />
          <p className="text-[14px] font-bold text-[#111827]">No care recipient yet</p>
          <p className="mt-1 text-[13px] text-[#9ca3af]">
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
                <p className="text-[16px] font-extrabold text-[#111827]">
                  {isRecipient ? "Say namaste" : `Ask about ${selectedName || "your parent"}`}
                </p>
                <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[#9ca3af]">
                  {isRecipient
                    ? "Saheli will save what you say — nothing extra."
                    : "Saheli cites what they last said and printed values from the record. No interpretation."}
                </p>
              </div>
            ) : (
              messages.map((msg, i) => {
                if (msg.role === "system") {
                  return (
                    <div key={`system-${i}`} className="flex justify-center">
                      <p className="rounded-full bg-[#f3f4f6] px-3 py-1 text-[10px] font-semibold text-[#6b7280]">
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
                            : "border border-[#f0f0f2] bg-[#fafafa] text-[#111827]"
                        }`}
                      >
                        <p
                          className={`mb-1.5 text-[10px] font-bold uppercase tracking-wide ${
                            mine ? "text-white/70" : "text-[#9ca3af]"
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
                <div className="flex items-center gap-1 rounded-2xl border border-[#f0f0f2] bg-[#fafafa] px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t border-[#f0f0f2] bg-white px-4 py-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendText(prompt)}
                  disabled={sending}
                  className="shrink-0 rounded-full border border-[#e5e7eb] bg-[#fafafa] px-3 py-1.5 text-[11px] font-semibold text-[#374151] transition-colors hover:border-primary hover:bg-primary-light hover:text-primary disabled:opacity-50"
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
              className="flex items-end gap-2 rounded-2xl border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 focus-within:border-primary"
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
                    : `Ask about ${selectedName || "your parent"} — TSH, creatinine, how she is…`
                }
                className="max-h-32 flex-1 resize-none bg-transparent py-2 text-[13px] outline-none"
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
            <p className="mt-2 text-center text-[10px] text-[#c4c4c4]">
              Enter to send · Shift+Enter for a new line · printed values only
            </p>
          </div>
        </>
      )}
    </div>
  );
}
