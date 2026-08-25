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
import { getNextScheduleItem, getScheduleTypeMeta } from "./care-schedule-data";

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

  const nextItem = scheduleCtx ? getNextScheduleItem(scheduleCtx.schedules) : null;
  const nextMeta = nextItem ? getScheduleTypeMeta(nextItem.type) : null;
  const NextIcon = nextMeta?.icon;

  return (
    <aside className="no-scrollbar flex h-screen min-w-0 flex-1 shrink-0 flex-col overflow-y-auto border-l border-[#f0f0f2] px-5 py-6">
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
            </div>
          </div>
        </div>

        {(email || phone || location) && (
          <div className="divide-y divide-[#f5f5f7]">
            {email && (
              <ContactRow icon={Mail} label="Email" value={email} breakAll />
            )}
            {phone && <ContactRow icon={Phone} label="Phone" value={phone} />}
            {location && (
              <ContactRow icon={MapPin} label="Location" value={location} breakAll />
            )}
          </div>
        )}

        <div className="flex items-start gap-2 px-4 py-3.5">
          <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
          <p className="text-[11px] leading-relaxed text-[#6b7280]">
            Use the tabs on the left for schedule, health records, and Saheli.
          </p>
        </div>
      </div>

      {nextItem && NextIcon ? (
        <div className="panel-card relative mb-5 overflow-hidden border border-[#f0f0f2] p-5">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
              Next for {firstName}
            </p>
            <p className="mt-1.5 text-[15px] font-extrabold leading-snug text-[#111827]">
              {nextItem.title} · {nextItem.time}
            </p>
          </div>
          <NextIcon className="absolute -right-1 bottom-2 h-16 w-16 text-[#f0f0f2]" strokeWidth={1.25} />
        </div>
      ) : !scheduleCtx?.loading ? (
        <div className="panel-card mb-5 border border-[#f0f0f2] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
            Next for {firstName}
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-[#6b7280]">
            No upcoming reminders today
          </p>
        </div>
      ) : (
        <div className="mb-5 flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      <div className="panel-card space-y-1 p-2">
        <QuickLink
          href={`/dashboard/chat?recipient=${encodeURIComponent(member.userId ?? "")}`}
          icon={MessageSquare}
          title={`Ask Saheli`}
          sub={`About ${firstName}`}
        />
        <QuickLink
          href={`/dashboard/record${member.userId ? `?recipient=${encodeURIComponent(member.userId)}` : ""}`}
          icon={Stethoscope}
          title="Health records"
          sub="Labs & vitals on file"
        />
      </div>
    </aside>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  breakAll,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7]">
        <Icon className="h-3.5 w-3.5 text-[#6b7280]" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">
          {label}
        </p>
        <p
          className={`text-[12px] font-semibold leading-normal text-[#111827] ${breakAll ? "break-all" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  sub,
}: {
  href: string;
  icon: typeof MessageSquare;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#fafafa]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f7]">
        <Icon className="h-4 w-4 text-[#374151]" strokeWidth={2} />
      </div>
      <div className="flex-1">
        <p className="text-[12px] font-bold text-[#111827]">{title}</p>
        <p className="text-[11px] text-[#9ca3af]">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-[#c4c4c4]" strokeWidth={2} />
    </Link>
  );
}
