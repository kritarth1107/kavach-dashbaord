"use client";

import { useState } from "react";
import {
  updateFamilyInvitation,
  updateFamilyMember,
} from "@/lib/api";
import {
  apiMemberToFamilyMember,
  memberToFormData,
  uiRoleToApi,
  type FamilyMember,
  type MemberFormData,
} from "./family-data";

export function useSaveFamilyMember(activeFamilyId: string | null) {
  const [saving, setSaving] = useState(false);

  async function saveMember(
    editingMember: FamilyMember,
    data: MemberFormData,
  ): Promise<FamilyMember[]> {
    if (!activeFamilyId) {
      throw new Error("No active family selected");
    }

    setSaving(true);
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
      return response.data.members.map(apiMemberToFamilyMember);
    } finally {
      setSaving(false);
    }
  }

  return { saving, saveMember, memberToFormData };
}
