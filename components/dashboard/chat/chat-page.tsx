"use client";

import { Loader2, MessageSquare, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCaregiverSaheliChat,
  getFamilyMembers,
  getSaheliChat,
  sendCaregiverSaheliChat,
  sendSaheliChat,
  type SaheliMessage,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";

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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadRecipients = useCallback(async () => {
    if (!activeFamilyId) return;
    const { data } = await getFamilyMembers(activeFamilyId);
    if (!data) throw new Error("Failed to load family");

    const me = data.members.find((m) => m.userId === userId);
    if (me?.name) setMyName(me.name.split(" ")[0] || me.name);

    const list = data.members
      .map(apiMemberToFamilyMember)
      .filter((m) => m.role === "care_recipient" && m.status === "joined")
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
      const { data } = isRecipient
        ? await getSaheliChat(activeFamilyId, selectedRecipientId)
        : await getCaregiverSaheliChat(activeFamilyId, selectedRecipientId);
      setMessages(data?.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, selectedRecipientId, isRecipient]);

  useEffect(() => {
    void loadRecipients().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load family"),
    );
  }, [loadRecipients]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedName = useMemo(
    () => recipients.find((r) => r.userId === selectedRecipientId)?.name ?? "",
    [recipients, selectedRecipientId],
  );

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFamilyId || !selectedRecipientId || !input.trim() || sending) return;

    const text = input.trim();
    setInput("");
    setSending(true);
    setError("");
    setMessages((prev) => [
      ...prev,
      { role: isRecipient ? "elder" : "family", content: text },
    ]);

    try {
      const { data } = isRecipient
        ? await sendSaheliChat(activeFamilyId, selectedRecipientId, text)
        : await sendCaregiverSaheliChat(activeFamilyId, selectedRecipientId, text);

      if (data?.reply) {
        setMessages((prev) => [...prev, { role: "saheli", content: data.reply }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
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
    <div className="panel-card flex min-h-[560px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f2] px-5 py-4">
        <div>
          <h1 className="text-[16px] font-extrabold text-[#111827]">
            {isRecipient ? "Messages" : "Ask Saheli"}
          </h1>
          <p className="text-[12px] text-[#9ca3af]">
            {isRecipient
              ? "Your Saheli companion · reported only"
              : `Ask about ${selectedName || "your parent"} · you are chatting as yourself`}
          </p>
        </div>
        {!isRecipient && recipients.length > 1 && (
          <select
            value={selectedRecipientId ?? ""}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
            className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-[12px] font-semibold"
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
        <div className="mx-5 mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[12px] text-[#b91c1c]">
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
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <p className="py-12 text-center text-[13px] text-[#9ca3af]">
                {isRecipient
                  ? "No messages yet. Say namaste."
                  : `Ask Saheli how ${selectedName || "your parent"} is doing today.`}
              </p>
            ) : (
              messages.map((msg, i) => {
                const mine = msg.role !== "saheli";
                return (
                  <div
                    key={`${msg.role}-${i}`}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                        msg.role === "saheli"
                          ? "bg-[#f3f4f6] text-[#111827]"
                          : "bg-primary text-white"
                      }`}
                    >
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
                        {msg.role === "saheli"
                          ? "Saheli"
                          : isRecipient
                            ? selectedName || "You"
                            : myName || "You"}
                      </p>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => void handleSend(e)}
            className="flex gap-2 border-t border-[#f0f0f2] p-4"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRecipient
                  ? "Message Saheli…"
                  : `Ask about ${selectedName || "your parent"}…`
              }
              className="flex-1 rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-[13px] outline-none focus:border-primary"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
