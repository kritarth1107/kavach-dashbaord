"use client";

import { ChevronRight, MapPin, MoreHorizontal, Pencil, Phone, ShieldBan, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatDisplayName,
  formatPhone,
  getInitials,
  statusLabels,
  type FamilyMember,
} from "./family-data";

function StatusBadge({ status }: { status: FamilyMember["status"] }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        status === "joined" && "bg-primary-light text-primary",
        status === "pending" && "bg-[#fef9c3] text-[#a16207]",
        status === "blocked" && "bg-[#fef2f2] text-[#dc2626]",
        status === "rejected" && "bg-[#f3f4f6] text-[#6b7280]",
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

function YouBadge() {
  return (
    <span className="text-[12px] font-medium text-primary">(you)</span>
  );
}

function MemberAvatar({
  member,
  size = "md",
  variant = "circle",
}: {
  member: FamilyMember;
  size?: "md" | "lg";
  variant?: "circle" | "care";
}) {
  const initials = getInitials(member.name, member.prefix);
  const sizeClass =
    size === "lg" ? "h-11 w-11 text-[13px]" : "h-10 w-10 text-[12px]";

  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatarUrl}
        alt=""
        className={cn("shrink-0 object-cover", sizeClass, "rounded-xl")}
      />
    );
  }

  if (variant === "care") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-primary-light font-bold text-primary",
          sizeClass,
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl font-bold text-white",
        sizeClass,
      )}
      style={{ backgroundColor: member.avatarColor }}
    >
      {initials}
    </div>
  );
}

type CareRecipientCardProps = {
  member: FamilyMember;
  currentUserId?: string | null;
  canManage?: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onBlock: () => void;
};

export function CareRecipientCard({
  member,
  currentUserId,
  canManage = false,
  onEdit,
  onRemove,
  onBlock,
}: CareRecipientCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = formatDisplayName(member.prefix, member.name);
  const phone =
    formatPhone(member.phoneCountryCode ?? "+91", member.phone ?? "") ??
    member.phone;
  const isSelf = Boolean(currentUserId && member.userId === currentUserId);
  const profileHref =
    member.status === "joined" && member.userId && !isSelf
      ? `/dashboard/family/${member.userId}`
      : null;

  return (
    <article
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl border border-[#e8ece9] bg-white px-4 py-4 transition-colors",
        profileHref
          ? "cursor-pointer hover:border-[#c6e7d0] hover:shadow-[0_2px_12px_rgba(22,163,74,0.08)]"
          : "hover:border-[#c6e7d0]",
      )}
    >
      {profileHref && (
        <Link
          href={profileHref}
          className="absolute inset-0 z-0 rounded-2xl"
          aria-label={`View ${displayName}'s care dashboard`}
        />
      )}

      <MemberAvatar member={member} size="lg" variant="care" />

      <div className="relative z-[1] min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[14px] font-bold text-[#111827]">{displayName}</h3>
          {isSelf && <YouBadge />}
          <span className="text-[12px] text-[#9ca3af]">· {member.relationship}</span>
          <StatusBadge status={member.status} />
          {member.role === "care_recipient" && member.status === "joined" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Saheli
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#6b7280]">
          {member.location && member.location !== "—" && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[#9ca3af]" strokeWidth={2} />
              {member.location}
            </span>
          )}
          {phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3 text-[#9ca3af]" strokeWidth={2} />
              {phone}
            </span>
          )}
        </div>
      </div>

      {profileHref && (
        <ChevronRight
          className="relative z-[1] h-4 w-4 shrink-0 text-[#d1d5db] transition-colors group-hover:text-primary"
          strokeWidth={2.5}
        />
      )}

      {canManage && !isSelf && (
        <div className="relative z-[2]">
          <MemberMenu
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            member={member}
            onEdit={onEdit}
            onRemove={onRemove}
            onBlock={onBlock}
          />
        </div>
      )}
    </article>
  );
}

type MemberRowProps = {
  member: FamilyMember;
  currentUserId?: string | null;
  canManage?: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onBlock: () => void;
};

export function MemberRow({
  member,
  currentUserId,
  canManage = false,
  onEdit,
  onRemove,
  onBlock,
}: MemberRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = formatDisplayName(member.prefix, member.name);
  const phone =
    formatPhone(member.phoneCountryCode ?? "+91", member.phone ?? "") ??
    member.phone;
  const isSelf = Boolean(currentUserId && member.userId === currentUserId);

  const roleLabel =
    member.role === "primary_caregiver"
      ? "Primary caregiver"
      : member.role === "co_caregiver"
        ? "Co-caregiver"
        : member.role === "view_only"
          ? "View only"
          : member.role === "family_doctor"
            ? "Family doctor"
            : "Member";

  return (
    <article className="group flex items-center gap-4 rounded-2xl border border-[#eef0f2] bg-white px-4 py-4 transition-colors hover:border-[#e5e7eb]">
      <MemberAvatar member={member} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[14px] font-bold text-[#111827]">{displayName}</h3>
          {isSelf && <YouBadge />}
          <span className="text-[12px] text-[#9ca3af]">· {member.relationship}</span>
          <span className="rounded-md bg-[#f5f5f7] px-2 py-0.5 text-[10px] font-semibold text-[#6b7280]">
            {roleLabel}
          </span>
          <StatusBadge status={member.status} />
        </div>
        <p className="mt-1 truncate text-[12px] text-[#9ca3af]">
          {[member.email !== "—" ? member.email : null, phone, member.location !== "—" ? member.location : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {canManage && !isSelf && member.role !== "primary_caregiver" && (
        <MemberMenu
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          member={member}
          onEdit={onEdit}
          onRemove={onRemove}
          onBlock={onBlock}
        />
      )}
    </article>
  );
}

function MemberMenu({
  menuOpen,
  setMenuOpen,
  member,
  onEdit,
  onRemove,
  onBlock,
}: {
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  member: FamilyMember;
  onEdit: () => void;
  onRemove: () => void;
  onBlock: () => void;
}) {
  const canBlock = Boolean(member.userId) && member.status === "joined";
  const canEdit = member.role !== "primary_caregiver";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Options"
        onClick={() => setMenuOpen(!menuOpen)}
        className="rounded-lg p-2 text-[#9ca3af] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#f5f5f7] hover:text-[#374151]"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
      </button>
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[#eef0f2] bg-white p-1 shadow-lg">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                Edit
              </button>
            )}
            {canBlock && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onBlock();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                <ShieldBan className="h-3.5 w-3.5" strokeWidth={2} />
                {member.status === "blocked" ? "Unblock" : "Block"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onRemove();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[#dc2626] hover:bg-[#fef2f2]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              {member.status === "pending" ? "Revoke invite" : "Remove"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
