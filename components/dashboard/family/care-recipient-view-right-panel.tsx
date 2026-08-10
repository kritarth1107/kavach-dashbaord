"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getFamilyMembers } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { apiMemberToFamilyMember, type FamilyMember } from "./family-data";
import { CareRecipientCaregiverRightPanel } from "./care-recipient-caregiver-right-panel";

export function CareRecipientViewRightPanel() {
  const params = useParams();
  const userId = params.userId as string | undefined;
  const { activeFamilyId } = useFamily();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMember = useCallback(async () => {
    if (!activeFamilyId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await getFamilyMembers(activeFamilyId);
      const found = data?.members
        .map(apiMemberToFamilyMember)
        .find(
          (m) =>
            m.userId === userId &&
            m.role === "care_recipient" &&
            m.status === "joined",
        );
      setMember(found ?? null);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, userId]);

  useEffect(() => {
    void loadMember();
  }, [loadMember]);

  if (loading) {
    return (
      <aside className="flex h-screen min-w-0 flex-1 shrink-0 items-center justify-center border-l border-[#f0f0f2]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </aside>
    );
  }

  if (!member) return null;

  return <CareRecipientCaregiverRightPanel member={member} />;
}
