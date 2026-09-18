"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MessageCircle,
  Pill,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { MorningBriefingCard, formatWhen } from "@/components/dashboard/family/morning-briefing-card";
import { SaheliAskBar } from "@/components/dashboard/saheli-ask-bar";
import { useFamily } from "@/components/dashboard/family-context";
import {
  getFamilyMembers,
  getFamilyOverview,
  getRecipientBriefing,
  type ActivityItem,
  type FamilyOverview,
  type RecipientBriefing,
} from "@/lib/api";
import {
  apiMemberToFamilyMember,
  isCareRecipientRole,
} from "@/components/dashboard/family/family-data";
import { cn } from "@/lib/utils";

function firstName(name: string): string {
  return name.trim().split(/\s+/).filter((p) => p !== "Mrs.")[0] || name || "them";
}

function buildSubtitle(overview: FamilyOverview | null, who: string): string {
  if (!overview) return "Loading your family's care snapshot…";
  const bits: string[] = [];
  if (overview.lastHeardLine) {
    bits.push(`${who}: “${overview.lastHeardLine.slice(0, 90)}${overview.lastHeardLine.length > 90 ? "…" : ""}”`);
  }
  if (overview.schedulesToday > 0) {
    bits.push(`${overview.completedToday}/${overview.schedulesToday} care tasks today`);
  }
  if (overview.pendingApprovals > 0) {
    bits.push(`${overview.pendingApprovals} order${overview.pendingApprovals === 1 ? "" : "s"} to approve`);
  } else {
    bits.push("Order food & groceries via Saheli");
  }
  return bits.join(" · ");
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const icon =
    item.type === "message" ? MessageCircle : item.type === "lab" ? Pill : Clock;
  const Icon = icon;
  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          item.status === "completed"
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-[var(--input-bg)] text-[var(--text-secondary)]",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{item.title}</p>
        <p className="text-[11px] text-[var(--text-secondary)]">
          {item.recipientName} · {item.detail}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-medium text-[var(--text-tertiary)]">
        {formatWhen(item.at)}
      </span>
    </div>
  );
}

function CareStatusHero({
  name,
  briefing,
  loading,
  pendingApprovals,
  chatHref,
}: {
  name: string;
  briefing: RecipientBriefing | null;
  loading: boolean;
  pendingApprovals: number;
  chatHref: string;
}) {
  const who = firstName(name);
  const heard = briefing?.lastHeardLine;
  const pending = briefing?.unconfirmedItems.length ?? 0;

  return (
    <div className="lime-card relative overflow-hidden p-6 shadow-[0_12px_40px_rgba(22,163,74,0.22)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
      <div className="relative">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
          Saheli · live
        </p>
        <h2 className="mt-2 text-[1.65rem] font-extrabold leading-tight tracking-tight text-white">
          {loading ? "…" : heard ? `${who} is connected` : `Checking on ${who}`}
        </h2>
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-white/80">
          {loading
            ? "Loading latest check-in…"
            : heard
              ? `Last heard: “${heard.slice(0, 160)}${heard.length > 160 ? "…" : ""}”`
              : `No message from ${who} yet today. Saheli can nudge or you can ask how they're doing.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={chatHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-emerald-800 hover:bg-white/95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask Saheli
          </Link>
          {pending > 0 && (
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-2 text-[11px] font-semibold text-white">
              {pending} schedule{pending === 1 ? "" : "s"} due
            </span>
          )}
          {pendingApprovals > 0 && (
            <Link
              href="/dashboard/approvals"
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-2 text-[11px] font-semibold text-white hover:bg-white/25"
            >
              <ShoppingBag className="h-3 w-3" />
              {pendingApprovals} order{pendingApprovals === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function CaregiverDashboardHome() {
  const { activeFamilyId } = useFamily();
  const [overview, setOverview] = useState<FamilyOverview | null>(null);
  const [briefing, setBriefing] = useState<RecipientBriefing | null>(null);
  const [subjectUserId, setSubjectUserId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("Care recipient");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setOverview(null);
      setBriefing(null);
      setSubjectUserId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: overviewData }, { data: membersData }] = await Promise.all([
        getFamilyOverview(activeFamilyId),
        getFamilyMembers(activeFamilyId),
      ]);
      setOverview(overviewData ?? null);

      const members = (membersData?.members ?? []).map(apiMemberToFamilyMember);
      const recipient = members.find(
        (m) => isCareRecipientRole(m.role) && m.status === "joined" && m.userId,
      );
      if (recipient?.userId) {
        setSubjectUserId(recipient.userId);
        setRecipientName(recipient.name);
        const { data: briefingData } = await getRecipientBriefing(
          activeFamilyId,
          recipient.userId,
        );
        setBriefing(briefingData ?? null);
      } else {
        setSubjectUserId(null);
        setBriefing(null);
        setRecipientName(overviewData?.recipients[0]?.name ?? "Care recipient");
      }
    } catch {
      setOverview(null);
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const who = firstName(recipientName);
  const subtitle = useMemo(
    () => buildSubtitle(overview, who),
    [overview, who],
  );

  const chatHref = subjectUserId
    ? `/dashboard/chat?recipient=${encodeURIComponent(subjectUserId)}`
    : "/dashboard/chat";

  const quickAsks = [
    `How is ${who} today?`,
    "Order dal rice from Swiggy",
    "Latest labs on file",
    "What's due today?",
  ];

  const recentActivity = (overview?.recentActivity ?? []).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardGreeting variant="caregiver" subtitle={subtitle} />

      {/* Saheli hero */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-[var(--card)] to-emerald-500/5 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[var(--text-primary)]">Ask Saheli</p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Labs · mood · orders · care timeline — powered by your family data
            </p>
          </div>
        </div>
        <SaheliAskBar recipientUserId={subjectUserId} />
        <div className="mt-3 flex flex-wrap gap-2">
          {quickAsks.map((ask) => (
            <Link
              key={ask}
              href={`${chatHref}&q=${encodeURIComponent(ask)}`}
              className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-primary/30 hover:text-[var(--text-primary)]"
            >
              {ask}
            </Link>
          ))}
        </div>
      </section>

      {/* Main grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CareStatusHero
            name={recipientName}
            briefing={briefing}
            loading={loading}
            pendingApprovals={overview?.pendingApprovals ?? 0}
            chatHref={chatHref}
          />
        </div>
        <div className="lg:col-span-7">
          {subjectUserId ? (
            <MorningBriefingCard
              recipientUserId={subjectUserId}
              recipientName={recipientName}
            />
          ) : (
            <div className="panel-card flex h-full min-h-[240px] flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="mb-3 h-8 w-8 text-[var(--text-tertiary)]" />
              <p className="text-[14px] font-semibold">Invite a care recipient</p>
              <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                Add a parent to see schedules and Saheli check-ins here.
              </p>
              <Link
                href="/dashboard/family"
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white"
              >
                Family settings <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Schedules today", value: overview?.schedulesToday ?? "—" },
          {
            label: "Completed",
            value:
              overview?.schedulesToday != null
                ? `${overview.completedToday}/${overview.schedulesToday}`
                : "—",
          },
          { label: "Saheli msgs", value: overview?.messagesToday ?? "—" },
          { label: "Reports", value: overview?.labCount ?? "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {s.label}
            </p>
            <p className="mt-0.5 text-xl font-extrabold text-[var(--text-primary)]">
              {loading ? "…" : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Activity + links */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border-strong)] px-5 py-4">
            <h2 className="text-[14px] font-bold text-[var(--text-primary)]">Recent activity</h2>
            {subjectUserId && (
              <Link
                href={`/dashboard/family/${subjectUserId}`}
                className="text-[11px] font-bold text-primary"
              >
                Full record →
              </Link>
            )}
          </div>
          <div className="divide-y divide-[var(--border-strong)] px-5">
            {loading ? (
              <p className="py-8 text-center text-[12px] text-[var(--text-tertiary)]">Loading…</p>
            ) : recentActivity.length ? (
              recentActivity.map((item) => <ActivityRow key={item.id} item={item} />)
            ) : (
              <p className="py-8 text-center text-[12px] text-[var(--text-secondary)]">
                No activity yet — ask Saheli to get started.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href={chatHref}
            className="panel-card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[13px] font-bold">Chat with Saheli</p>
              <p className="text-[11px] text-[var(--text-secondary)]">Order, Q&A, summaries</p>
            </div>
          </Link>
          <Link
            href="/dashboard/integrations"
            className="panel-card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
          >
            <ShoppingBag className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-[13px] font-bold">Connect Swiggy & Zepto</p>
              <p className="text-[11px] text-[var(--text-secondary)]">Live ordering from chat</p>
            </div>
          </Link>
          {!loading &&
            overview &&
            overview.completedToday >= (overview.schedulesToday || 1) &&
            overview.schedulesToday > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-[12px] font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                On track for today&apos;s care
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
