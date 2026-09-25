"use client";

import Link from "next/link";
import { Activity, Calendar, CalendarDays, ChevronRight, Loader2, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getRecipientBriefing, getRecipientLabs, type RecipientBriefing } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { MorningBriefingCard } from "./morning-briefing-card";
import { useOptionalCareSchedule } from "./care-recipient-schedule-context";
import {
  getActiveSchedulesForToday,
  getNextScheduleItem,
  getScheduleTypeMeta,
} from "./care-schedule-data";

export function CareRecipientOverview({
  recipientUserId,
  recipientName,
  onOpenSchedule,
  onOpenHealth,
  onOpenSaheli,
}: {
  recipientUserId: string;
  recipientName: string;
  onOpenSchedule: () => void;
  onOpenHealth: () => void;
  onOpenSaheli: () => void;
}) {
  const { activeFamilyId } = useFamily();
  const scheduleCtx = useOptionalCareSchedule();
  const [labCount, setLabCount] = useState(0);
  const [briefing, setBriefing] = useState<RecipientBriefing | null>(null);

  const loadExtras = useCallback(async () => {
    if (!activeFamilyId) return;
    try {
      const [labs, brief] = await Promise.all([
        getRecipientLabs(activeFamilyId, recipientUserId),
        getRecipientBriefing(activeFamilyId, recipientUserId),
      ]);
      setLabCount(labs.data?.documents?.length ?? 0);
      setBriefing(brief.data ?? null);
    } catch {
      setLabCount(0);
      setBriefing(null);
    }
  }, [activeFamilyId, recipientUserId]);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  const todayItems = scheduleCtx ? getActiveSchedulesForToday(scheduleCtx.schedules) : [];
  const nextItem = scheduleCtx ? getNextScheduleItem(scheduleCtx.schedules) : null;
  const nextMeta = nextItem ? getScheduleTypeMeta(nextItem.type) : null;

  return (
    <div className="space-y-6">
      <MorningBriefingCard recipientUserId={recipientUserId} recipientName={recipientName} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Today's reminders"
          value={scheduleCtx?.loading ? "…" : String(todayItems.length)}
          sub={todayItems.length === 1 ? "1 item scheduled" : `${todayItems.length} items scheduled`}
          onClick={onOpenSchedule}
        />
        <StatCard
          label="Health records"
          value={String(labCount)}
          sub={labCount === 1 ? "1 on file" : `${labCount} on file`}
          onClick={onOpenHealth}
        />
        <StatCard
          label="Last check-in"
          value={briefing?.lastHeardAt ? "Recent" : "—"}
          sub={briefing?.lastHeardLine?.slice(0, 48) ?? "No check-in yet"}
          onClick={onOpenSaheli}
        />
      </div>

      <section className="panel-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-strong)] px-5 py-3.5">
          <div>
            <h3 className="text-[14px] font-extrabold text-[var(--text-primary)]">Today&apos;s schedule</h3>
            <p className="text-[11px] text-[var(--text-tertiary)]">Quick view · manage in Schedule tab</p>
          </div>
          <button
            type="button"
            onClick={onOpenSchedule}
            className="text-[12px] font-semibold text-primary hover:underline"
          >
            View all
          </button>
        </div>
        <div className="px-5 py-4">
          {scheduleCtx?.loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : todayItems.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-[var(--text-tertiary)]">Nothing scheduled for today</p>
          ) : (
            <ul className="space-y-2">
              {todayItems.slice(0, 4).map((item) => (
                <li
                  key={item.scheduleId}
                  className="flex items-center justify-between rounded-xl bg-[var(--input-bg)] px-3 py-2.5"
                >
                  <div>
                    <p className="text-[12px] font-bold text-[var(--text-primary)]">{item.title}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {nextItem && nextMeta && (
        <section className="panel-card flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Up next</p>
            <p className="mt-1 text-[14px] font-extrabold text-[var(--text-primary)]">
              {nextItem.title} · {nextItem.time}
            </p>
          </div>
          <Calendar className="h-8 w-8 text-[var(--border-strong)]" />
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          href={`/dashboard/chat?recipient=${encodeURIComponent(recipientUserId)}`}
          icon={MessageSquare}
          title={`Ask Saheli about ${recipientName}`}
          sub="Chat as caregiver"
          onNavigate={onOpenSaheli}
        />
        <QuickLink
          href="/dashboard/record"
          icon={Calendar}
          title="All health records"
          sub="Family-wide view with filters"
          onNavigate={onOpenHealth}
        />
        <QuickLink
          href={`/dashboard/activity?recipient=${encodeURIComponent(recipientUserId)}`}
          icon={Activity}
          title="Saheli activity"
          sub="Chats, orders step-by-step, alerts"
        />
        <QuickLink
          href={`/dashboard/activity/snapshot?recipient=${encodeURIComponent(recipientUserId)}`}
          icon={CalendarDays}
          title="Daily snapshot"
          sub={`A summary of ${recipientName}'s day`}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel-card p-4 text-left transition-colors hover:border-primary/30"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-secondary)]">{sub}</p>
    </button>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  sub,
  onNavigate,
}: {
  href: string;
  icon: typeof MessageSquare;
  title: string;
  sub: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="panel-card flex items-center gap-3 p-4 transition-colors hover:border-primary/30"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[var(--text-primary)]">{title}</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
    </Link>
  );
}
