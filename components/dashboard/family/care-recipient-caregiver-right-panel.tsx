"use client";

import Link from "next/link";
import {
  ChevronRight,
  Heart,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Stethoscope,
} from "lucide-react";
import type { FamilyMember } from "./family-data";
import { formatDisplayName, formatPhone, getInitials } from "./family-data";
import { useOptionalCareSchedule } from "./care-recipient-schedule-context";
import { SaheliThreadPanel } from "./saheli-thread-panel";
import {
  getActiveSchedulesForDate,
  getNextScheduleItem,
  getScheduleTypeMeta,
} from "./care-schedule-data";
import { useOptionalRecipientDate } from "@/components/dashboard/recipient/recipient-date-context";
import { formatDayLabel } from "@/lib/date-utils";

export function CareRecipientCaregiverRightPanel({ member }: { member: FamilyMember }) {
  const scheduleCtx = useOptionalCareSchedule();
  const dateCtx = useOptionalRecipientDate();
  const selectedDate = dateCtx?.selectedDate ?? new Date();
  const dateLabel = formatDayLabel(selectedDate);
  const displayName = formatDisplayName(member.prefix, member.name);
  const firstName = member.name.split(/\s+/)[0] || member.name;
  const initials = getInitials(member.name, member.prefix);
  const phone =
    formatPhone(member.phoneCountryCode ?? "+91", member.phone ?? "") ?? member.phone;
  const email = member.email !== "—" ? member.email : null;
  const relationship =
    member.relationship && member.relationship !== "—" ? member.relationship : "Care recipient";
  const location = member.location && member.location !== "—" ? member.location : null;

  const todayItems = scheduleCtx
    ? getActiveSchedulesForDate(scheduleCtx.schedules, selectedDate)
    : [];
  const nextItem = scheduleCtx
    ? getNextScheduleItem(scheduleCtx.schedules, selectedDate)
    : null;
  const nextMeta = nextItem ? getScheduleTypeMeta(nextItem.type) : null;
  const NextIcon = nextMeta?.icon;

  return (
    <aside className="no-scrollbar flex h-screen min-w-0 flex-1 shrink-0 flex-col overflow-y-auto border-l border-[var(--border-strong)] px-5 py-6">
      {/* Member profile */}
      <div className="panel-card mb-5 p-0">
        <div className="border-b border-[var(--border-strong)] px-4 py-4">
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[var(--border-strong)]"
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-[15px] font-extrabold text-white ring-2 ring-white"
                  style={{ backgroundColor: member.avatarColor || "#16a34a" }}
                >
                  {initials}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="break-words text-[14px] font-extrabold leading-snug tracking-[-0.02em] text-[var(--text-primary)]">
                {displayName}
              </h2>
              <p className="mt-1 text-[12px] leading-normal text-[var(--text-secondary)]">
                Your {relationship.toLowerCase()}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Care recipient
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Saheli
                </span>
              </div>
            </div>
          </div>
        </div>

        {(email || phone || location) && (
          <div className="divide-y divide-[#f5f5f7] border-b border-[var(--border-strong)]">
            {email && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
                  <Mail className="h-3.5 w-3.5 text-[var(--text-secondary)]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Email
                  </p>
                  <p className="break-all text-[12px] font-semibold leading-normal text-[var(--text-primary)]">
                    {email}
                  </p>
                </div>
              </div>
            )}
            {phone && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
                  <Phone className="h-3.5 w-3.5 text-[var(--text-secondary)]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Phone
                  </p>
                  <p className="text-[12px] font-semibold leading-normal text-[var(--text-primary)]">{phone}</p>
                </div>
              </div>
            )}
            {location && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)]">
                  <MapPin className="h-3.5 w-3.5 text-[var(--text-secondary)]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Location
                  </p>
                  <p className="break-words text-[12px] font-semibold leading-normal text-[var(--text-primary)]">
                    {location}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 px-4 py-3.5">
          <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
            {scheduleCtx?.loading ? (
              "Loading schedule..."
            ) : todayItems.length > 0 ? (
              <>
                <span className="font-semibold text-[var(--text-secondary)]">{todayItems.length} reminders today</span>
                {" · "}view full schedule on the left
              </>
            ) : (
              <>
                <span className="font-semibold text-[var(--text-secondary)]">No reminders today</span>
                {" · "}add a care schedule to get started
              </>
            )}
          </p>
        </div>
      </div>

      {member.userId && (
        <SaheliThreadPanel
          recipientUserId={member.userId}
          recipientName={firstName}
          compact
        />
      )}

      <p className="mb-3 text-[12px] font-bold text-[var(--text-primary)]">
        {firstName}&apos;s schedule · {dateLabel}
      </p>
      <div className="panel-card mb-5 p-3">
        {scheduleCtx?.loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : todayItems.length === 0 ? (
          <p className="px-1 py-4 text-center text-[12px] text-[var(--text-tertiary)]">
            Nothing scheduled for {dateLabel.toLowerCase()}
          </p>
        ) : (
          todayItems.map((item) => (
            <div
              key={item.scheduleId}
              className="flex items-start gap-3 border-b border-[var(--border-strong)] py-3 first:pt-0 last:border-0 last:pb-0"
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--border-strong)] bg-[var(--card)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-[var(--text-primary)]">{item.title}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {item.time}
                  {item.dosage ? ` · ${item.dosage}` : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="panel-card mb-5 space-y-2 p-3">
        <Link
          href={`/dashboard/family/${member.userId}/health-record`}
          className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[var(--input-bg)]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface)]">
            <Stethoscope className="h-4 w-4 text-[var(--text-secondary)]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-[var(--text-primary)]">Health record</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">Vitals, meds & history</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" strokeWidth={2} />
        </Link>
        <Link
          href={`/dashboard/chat?recipient=${encodeURIComponent(member.userId ?? "")}`}
          className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[var(--input-bg)]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--warning-bg)]">
            <MessageSquare className="h-4 w-4 text-[var(--warning-text)]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-[var(--text-primary)]">Ask Saheli about {firstName}</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">Chat as yourself</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" strokeWidth={2} />
        </Link>
      </div>

      {nextItem && NextIcon ? (
        <div className="panel-card relative overflow-hidden border border-[var(--border-strong)] p-5">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
              Next for {firstName}
            </p>
            <p className="mt-1.5 text-[15px] font-extrabold leading-snug text-[var(--text-primary)]">
              {nextItem.title} · {nextItem.time}
            </p>
            {(nextItem.dosage || nextItem.instructions) && (
              <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                {[nextItem.dosage, nextItem.instructions].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <NextIcon className="absolute -right-1 bottom-2 h-16 w-16 text-[#f0f0f2]" strokeWidth={1.25} />
        </div>
      ) : !scheduleCtx?.loading ? (
        <div className="panel-card border border-[var(--border-strong)] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            Next for {firstName}
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-[var(--text-secondary)]">
            No upcoming reminders today
          </p>
        </div>
      ) : null}
    </aside>
  );
}
