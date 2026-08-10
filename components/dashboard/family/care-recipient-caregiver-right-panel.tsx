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
import {
  getActiveSchedulesForToday,
  getNextScheduleItem,
  getScheduleTypeMeta,
} from "./care-schedule-data";

export function CareRecipientCaregiverRightPanel({ member }: { member: FamilyMember }) {
  const scheduleCtx = useOptionalCareSchedule();
  const displayName = formatDisplayName(member.prefix, member.name);
  const firstName = member.name.split(/\s+/)[0] || member.name;
  const initials = getInitials(member.name, member.prefix);
  const phone =
    formatPhone(member.phoneCountryCode ?? "+91", member.phone ?? "") ?? member.phone;
  const email = member.email !== "—" ? member.email : null;
  const relationship =
    member.relationship && member.relationship !== "—" ? member.relationship : "Care recipient";
  const location = member.location && member.location !== "—" ? member.location : null;

  const todayItems = scheduleCtx ? getActiveSchedulesForToday(scheduleCtx.schedules) : [];
  const nextItem = scheduleCtx ? getNextScheduleItem(scheduleCtx.schedules) : null;
  const nextMeta = nextItem ? getScheduleTypeMeta(nextItem.type) : null;
  const NextIcon = nextMeta?.icon;

  return (
    <aside className="no-scrollbar flex h-screen min-w-0 flex-1 shrink-0 flex-col overflow-y-auto border-l border-[#f0f0f2] px-5 py-6">
      {/* Member profile */}
      <div className="panel-card mb-5 p-0">
        <div className="border-b border-[#f0f0f2] px-4 py-4">
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#f0f0f2]"
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
              <h2 className="break-words text-[14px] font-extrabold leading-snug tracking-[-0.02em] text-[#111827]">
                {displayName}
              </h2>
              <p className="mt-1 text-[12px] leading-normal text-[#6b7280]">
                Your {relationship.toLowerCase()}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-[#f3f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  Care recipient
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Saheli
                </span>
              </div>
            </div>
          </div>
        </div>

        {(email || phone || location) && (
          <div className="divide-y divide-[#f5f5f7] border-b border-[#f0f0f2]">
            {email && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7]">
                  <Mail className="h-3.5 w-3.5 text-[#6b7280]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
                    Email
                  </p>
                  <p className="break-all text-[12px] font-semibold leading-normal text-[#111827]">
                    {email}
                  </p>
                </div>
              </div>
            )}
            {phone && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7]">
                  <Phone className="h-3.5 w-3.5 text-[#6b7280]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
                    Phone
                  </p>
                  <p className="text-[12px] font-semibold leading-normal text-[#111827]">{phone}</p>
                </div>
              </div>
            )}
            {location && (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7]">
                  <MapPin className="h-3.5 w-3.5 text-[#6b7280]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
                    Location
                  </p>
                  <p className="break-words text-[12px] font-semibold leading-normal text-[#111827]">
                    {location}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 px-4 py-3.5">
          <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
          <p className="text-[11px] leading-relaxed text-[#6b7280]">
            {scheduleCtx?.loading ? (
              "Loading schedule..."
            ) : todayItems.length > 0 ? (
              <>
                <span className="font-semibold text-[#374151]">{todayItems.length} reminders today</span>
                {" · "}view full schedule on the left
              </>
            ) : (
              <>
                <span className="font-semibold text-[#374151]">No reminders today</span>
                {" · "}add a care schedule to get started
              </>
            )}
          </p>
        </div>
      </div>

      <p className="mb-3 text-[12px] font-bold text-[#1a1a1a]">{firstName}&apos;s schedule today</p>
      <div className="panel-card mb-5 p-3">
        {scheduleCtx?.loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : todayItems.length === 0 ? (
          <p className="px-1 py-4 text-center text-[12px] text-[#9ca3af]">
            Nothing scheduled for today
          </p>
        ) : (
          todayItems.map((item) => (
            <div
              key={item.scheduleId}
              className="flex items-start gap-3 border-b border-[#f5f5f7] py-3 first:pt-0 last:border-0 last:pb-0"
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#d1d5db] bg-white" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-[#111827]">{item.title}</p>
                <p className="text-[11px] text-[#9ca3af]">
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
          href="/dashboard/record"
          className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#fafafa]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f7]">
            <Stethoscope className="h-4 w-4 text-[#374151]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-[#111827]">Health record</p>
            <p className="text-[11px] text-[#9ca3af]">Vitals, meds & history</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#c4c4c4]" strokeWidth={2} />
        </Link>
        <Link
          href="/dashboard/chat"
          className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#fafafa]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fef9c3]">
            <MessageSquare className="h-4 w-4 text-[#a16207]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-[#111827]">Message {firstName}</p>
            <p className="text-[11px] text-[#9ca3af]">Care circle chat</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#c4c4c4]" strokeWidth={2} />
        </Link>
      </div>

      {nextItem && NextIcon ? (
        <div className="panel-card relative overflow-hidden border border-[#f0f0f2] p-5">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
              Next for {firstName}
            </p>
            <p className="mt-1.5 text-[15px] font-extrabold leading-snug text-[#111827]">
              {nextItem.title} · {nextItem.time}
            </p>
            {(nextItem.dosage || nextItem.instructions) && (
              <p className="mt-1 text-[12px] text-[#6b7280]">
                {[nextItem.dosage, nextItem.instructions].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <NextIcon className="absolute -right-1 bottom-2 h-16 w-16 text-[#f0f0f2]" strokeWidth={1.25} />
        </div>
      ) : !scheduleCtx?.loading ? (
        <div className="panel-card border border-[#f0f0f2] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
            Next for {firstName}
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-[#6b7280]">
            No upcoming reminders today
          </p>
        </div>
      ) : null}
    </aside>
  );
}
