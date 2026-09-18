"use client";

import {
  ArrowRight,
  Clock,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatWhen } from "@/components/dashboard/family/morning-briefing-card";
import { SaheliAskBar } from "@/components/dashboard/saheli-ask-bar";
import { SaheliInsightsBanner } from "@/components/dashboard/saheli-insights-banner";
import { useFamily } from "@/components/dashboard/family-context";
import { getCommandCenter, type CommandCenterRecipient } from "@/lib/api";
import { cn } from "@/lib/utils";

function RecipientCard({
  recipient,
  selected,
  onSelect,
}: {
  recipient: CommandCenterRecipient;
  selected: boolean;
  onSelect: () => void;
}) {
  const who = recipient.name.split(/\s+/)[0] || recipient.name;
  const chatHref = `/dashboard/chat?recipient=${encodeURIComponent(recipient.userId)}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-[var(--border-strong)] bg-[var(--card)] hover:border-primary/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--input-bg)] text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[var(--text-primary)]">{recipient.name}</p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {recipient.insightCount > 0
                ? `${recipient.insightCount} insight${recipient.insightCount === 1 ? "" : "s"}`
                : "All clear today"}
            </p>
          </div>
        </div>
        {recipient.pendingApprovals > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            {recipient.pendingApprovals} order{recipient.pendingApprovals === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-[11px] text-[var(--text-secondary)]">
        {recipient.lastElderSnippet ? (
          <p className="line-clamp-2">
            <MessageCircle className="mr-1 inline h-3 w-3" />
            “{recipient.lastElderSnippet}”
            {recipient.lastElderAt ? ` · ${formatWhen(recipient.lastElderAt)}` : ""}
          </p>
        ) : (
          <p>No recent messages from {who}</p>
        )}
        {recipient.nextScheduleTitle && (
          <p>
            <Clock className="mr-1 inline h-3 w-3" />
            Next: {recipient.nextScheduleTitle} at {recipient.nextScheduleTime}
          </p>
        )}
        {recipient.activeOrderPhase && recipient.activeOrderPhase !== "submitted" && (
          <p className="font-medium text-primary">
            Order in progress · {recipient.activeOrderPhase.replace(/_/g, " ")}
          </p>
        )}
        {recipient.swiggyConnected && recipient.swiggyAddressCount === 0 && (
          <p className="text-amber-600">Swiggy connected — sync addresses in Integrations</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={chatHref}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white"
        >
          <Sparkles className="h-3 w-3" />
          Ask Saheli
        </Link>
        <Link
          href={`${chatHref}&q=${encodeURIComponent(`Order food for ${who}`)}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-3 py-1 text-[10px] font-semibold"
        >
          <ShoppingBag className="h-3 w-3" />
          Order food
        </Link>
      </div>
    </button>
  );
}

export function CommandCenterHome() {
  const { activeFamilyId } = useFamily();
  const [data, setData] = useState<Awaited<ReturnType<typeof getCommandCenter>>["data"]>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setData(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: payload } = await getCommandCenter(activeFamilyId);
      setData(payload ?? undefined);
      setSelectedId((prev) => prev ?? payload?.recipients[0]?.userId ?? null);
    } catch {
      setData(undefined);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = data?.recipients.find((r) => r.userId === selectedId) ?? data?.recipients[0];
  const chatHref = selected
    ? `/dashboard/chat?recipient=${encodeURIComponent(selected.userId)}`
    : "/dashboard/chat";

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-2xl bg-[var(--input-bg)]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-2xl bg-[var(--input-bg)]" />
          <div className="h-40 rounded-2xl bg-[var(--input-bg)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeFamilyId && selected ? (
        <SaheliInsightsBanner
          familyId={activeFamilyId}
          recipientUserId={selected.userId}
          chatHref={chatHref}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-[var(--card)] to-emerald-500/5 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-bold">Command Center</p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {data?.pendingApprovalsTotal
                ? `${data.pendingApprovalsTotal} order${data.pendingApprovalsTotal === 1 ? "" : "s"} awaiting approval`
                : "Your family care hub — ask Saheli anything"}
            </p>
          </div>
          {data?.pendingApprovalsTotal ? (
            <Link
              href="/dashboard/approvals"
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1.5 text-[11px] font-bold text-amber-700"
            >
              Approvals
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
        <SaheliAskBar recipientUserId={selected?.userId ?? null} />
        <div className="mt-3 flex flex-wrap gap-2">
          {(data?.quickPrompts ?? []).map((prompt) => (
            <Link
              key={prompt}
              href={`${chatHref}&q=${encodeURIComponent(prompt)}`}
              className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-primary/30"
            >
              {prompt}
            </Link>
          ))}
        </div>
      </section>

      {data?.recipients.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.recipients.map((recipient) => (
            <RecipientCard
              key={recipient.userId}
              recipient={recipient}
              selected={recipient.userId === selected?.userId}
              onSelect={() => setSelectedId(recipient.userId)}
            />
          ))}
        </div>
      ) : (
        <div className="panel-card p-8 text-center">
          <p className="text-[14px] font-semibold">Invite a care recipient</p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            Add a parent to see schedules, labs, and Saheli check-ins here.
          </p>
          <Link href="/dashboard/family" className="mt-4 inline-flex text-[12px] font-bold text-primary">
            Manage family →
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/record"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2.5 text-[12px] font-semibold"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload report
        </Link>
        <Link
          href={chatHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2.5 text-[12px] font-semibold"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Open chat
        </Link>
      </div>
    </div>
  );
}
