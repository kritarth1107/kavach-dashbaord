"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import { canManageFamilyMembers } from "./family-data";
import { CareRecipientCaregiverRightPanel } from "./care-recipient-caregiver-right-panel";
import { useCareRecipientProfile } from "./care-recipient-profile-context";
import { MemberFormModal } from "./member-form-modal";
import { useSaveFamilyMember } from "./use-save-family-member";

export function CareRecipientViewRightPanel() {
  const { activeFamilyId, activeFamily } = useFamily();
  const { member, loading, applyMembersList } = useCareRecipientProfile();
  const { saving, saveMember, memberToFormData } = useSaveFamilyMember(activeFamilyId);
  const [modalOpen, setModalOpen] = useState(false);

  const canManage = canManageFamilyMembers(activeFamily?.role);

  async function handleSave(data: Parameters<typeof saveMember>[1]) {
    if (!member) return;

    const members = await saveMember(member, data);
    applyMembersList(members);
    setModalOpen(false);
  }

  if (loading) {
    return (
      <aside className="flex h-screen min-w-0 flex-1 shrink-0 items-center justify-center border-l border-[var(--border-strong)]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </aside>
    );
  }

  if (!member) return null;

  return (
    <>
      <CareRecipientCaregiverRightPanel
        member={member}
        canManage={canManage}
        onEditDetails={canManage ? () => setModalOpen(true) : undefined}
      />

      {canManage && (
        <MemberFormModal
          open={modalOpen}
          mode="edit"
          lockRole
          formTitle="Edit care recipient"
          formDescription="Update name, mobile, relationship, and location."
          initialData={memberToFormData(member)}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onInvite={async () => {}}
          onSave={handleSave}
        />
      )}
    </>
  );
}
