"use client";

import { Loader2, Plus, Search, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getFamilyMembers,
  inviteFamilyMember,
  removeFamilyMember,
  revokeFamilyInvitation,
  updateFamilyMember,
  updateFamilyInvitation,
  updateFamilyMemberStatus,
} from "@/lib/api";
import {
  apiMemberToFamilyMember,
  canManageFamilyMembers,
  memberToFormData,
} from "./family-data";
import type { FamilyMember, MemberFormData } from "./family-data";
import { uiRoleToApi } from "./family-data";
import { CareRecipientCard, MemberRow } from "./member-row";
import { MemberFormModal } from "./member-form-modal";
import { useFamily } from "../family-context";

function matchesSearch(member: FamilyMember, q: string) {
  return (
    member.name.toLowerCase().includes(q) ||
    member.email.toLowerCase().includes(q) ||
    member.relationship.toLowerCase().includes(q) ||
    member.location.toLowerCase().includes(q)
  );
}

export function FamilyMembersPage() {
  const { activeFamilyId, activeFamily, userId } = useFamily();
  const [myRole, setMyRole] = useState<string | null>(null);
  const canManageMembers = canManageFamilyMembers(myRole ?? activeFamily?.role);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"invite" | "edit">("invite");
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const loadMembers = useCallback(async () => {
    if (!activeFamilyId) return;

    setLoading(true);
    setError("");

    try {
      const { data } = await getFamilyMembers(activeFamilyId);
      if (!data) throw new Error("Failed to load members");
      setMyRole(data.myRole);
      setMembers(data.members.map(apiMemberToFamilyMember));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const careRecipients = members.filter((m) => m.role === "care_recipient");
  const circleMembers = members.filter((m) => m.role !== "care_recipient");

  const q = search.trim().toLowerCase();

  const filteredRecipients = useMemo(
    () => (q ? careRecipients.filter((m) => matchesSearch(m, q)) : careRecipients),
    [careRecipients, q],
  );

  const filteredCircle = useMemo(
    () => (q ? circleMembers.filter((m) => matchesSearch(m, q)) : circleMembers),
    [circleMembers, q],
  );

  async function handleInvite(data: MemberFormData) {
    if (!activeFamilyId) return;

    setSaving(true);
    setError("");

    try {
      const { data: payload } = await inviteFamilyMember(activeFamilyId, {
        name: data.name.trim(),
        namePrefix: data.prefix.trim() || undefined,
        email: data.role === "care_recipient" ? data.email || undefined : data.email,
        role: uiRoleToApi(data.role),
        relationship: data.relationship,
        phone: data.phone,
        phoneCountryCode: data.phoneCountryCode,
        location: data.location,
      });

      if (!payload) throw new Error("Failed to send invitation");
      setMembers(payload.members.map(apiMemberToFamilyMember));
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMember(data: MemberFormData) {
    if (!activeFamilyId || !editingMember) return;

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: data.name.trim(),
        namePrefix: data.prefix.trim() || undefined,
        role: uiRoleToApi(data.role),
        relationship: data.relationship,
        phone: data.phone,
        phoneCountryCode: data.phoneCountryCode,
        location: data.location,
      };

      let response;
      if (editingMember.inviteId && editingMember.status === "pending") {
        response = await updateFamilyInvitation(
          activeFamilyId,
          editingMember.inviteId,
          payload,
        );
      } else if (editingMember.userId) {
        response = await updateFamilyMember(
          activeFamilyId,
          editingMember.userId,
          payload,
        );
      } else {
        throw new Error("Cannot update this member");
      }

      if (!response.data) throw new Error("Failed to update member");
      setMembers(response.data.members.map(apiMemberToFamilyMember));
      setModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(member: FamilyMember) {
    setModalMode("edit");
    setEditingMember(member);
    setModalOpen(true);
  }

  function openInviteModal() {
    setModalMode("invite");
    setEditingMember(null);
    setModalOpen(true);
  }

  async function handleRemove(member: FamilyMember) {
    if (!activeFamilyId) return;
    if (member.role === "primary_caregiver") return;

    setError("");

    try {
      let response;
      if (member.inviteId) {
        response = await revokeFamilyInvitation(activeFamilyId, member.inviteId);
      } else if (member.userId) {
        response = await removeFamilyMember(activeFamilyId, member.userId);
      } else {
        throw new Error("Cannot remove this member");
      }

      if (!response.data) throw new Error("Failed to remove member");
      setMembers(response.data.members.map(apiMemberToFamilyMember));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  async function handleBlock(member: FamilyMember) {
    if (!activeFamilyId || !member.userId) return;

    setError("");

    try {
      const nextStatus = member.status === "blocked" ? "JOINED" : "BLOCKED";
      const { data } = await updateFamilyMemberStatus(
        activeFamilyId,
        member.userId,
        nextStatus,
      );
      if (!data) throw new Error("Failed to update member");
      setMembers(data.members.map(apiMemberToFamilyMember));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member");
    }
  }

  if (!activeFamilyId) {
    return (
      <p className="text-[13px] text-[#6b7280]">Select a family to manage members.</p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.35rem] font-extrabold tracking-[-0.02em] text-[#111827]">
            Family members
          </h1>
          <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[#6b7280]">
            Invite people to your care circle. They must accept before joining.
          </p>
        </div>
        {canManageMembers && (
          <button
            type="button"
            onClick={openInviteModal}
            disabled={saving}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[var(--primary-dark)] disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" strokeWidth={2.25} />
            Add member
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-[#fef2f2] px-3 py-2 text-[12px] font-medium text-[#dc2626]">
          {error}
        </p>
      )}

      <div className="mb-8 flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-[#fafafa] px-3.5 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--primary-ring)]">
        <Search className="h-4 w-4 shrink-0 text-[#9ca3af]" strokeWidth={2.25} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full bg-transparent text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none"
        />
      </div>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-[#9ca3af]">
            Being cared for
            {careRecipients.length > 0 && (
              <span className="ml-1.5 font-semibold text-[#6b7280]">
                · {careRecipients.length}
              </span>
            )}
          </h2>
        </div>

        <div className="space-y-2">
          {filteredRecipients.length > 0 ? (
            filteredRecipients.map((member) => (
              <CareRecipientCard
                key={member.id}
                member={member}
                currentUserId={userId}
                canManage={canManageMembers}
                onEdit={() => openEditModal(member)}
                onRemove={() => void handleRemove(member)}
                onBlock={() => void handleBlock(member)}
              />
            ))
          ) : q ? (
            <EmptyHint text="No care recipients match your search." />
          ) : canManageMembers ? (
            <button
              type="button"
              onClick={openInviteModal}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d1d5db] py-8 text-[13px] font-medium text-[#9ca3af] transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Add someone receiving care
            </button>
          ) : (
            <EmptyHint text="No one is being cared for in this family yet." />
          )}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-[#9ca3af]">
            Care circle
            {circleMembers.length > 0 && (
              <span className="ml-1.5 font-semibold text-[#6b7280]">
                · {circleMembers.length}
              </span>
            )}
          </h2>
        </div>

        <div className="space-y-2">
          {filteredCircle.length > 0 ? (
            filteredCircle.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                currentUserId={userId}
                canManage={canManageMembers}
                onEdit={() => openEditModal(member)}
                onRemove={() => void handleRemove(member)}
                onBlock={() => void handleBlock(member)}
              />
            ))
          ) : q ? (
            <EmptyHint text="No members match your search." />
          ) : (
            <EmptyHint text="No one in the care circle yet. Invite a sibling or co-caregiver." />
          )}
        </div>
      </section>

      <MemberFormModal
        key={editingMember?.id ?? "invite"}
        open={modalOpen}
        mode={modalMode}
        initialData={editingMember ? memberToFormData(editingMember) : undefined}
        saving={saving}
        onClose={() => {
          setModalOpen(false);
          setEditingMember(null);
        }}
        onInvite={handleInvite}
        onSave={handleSaveMember}
      />
    </>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-[#e5e7eb] py-8 text-center text-[13px] text-[#9ca3af]">
      {text}
    </p>
  );
}
