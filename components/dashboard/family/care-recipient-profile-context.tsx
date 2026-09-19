"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import { getFamilyMembers } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { apiMemberToFamilyMember, type FamilyMember } from "./family-data";

type CareRecipientProfileContextValue = {
  member: FamilyMember | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  applyMembersList: (members: FamilyMember[]) => void;
};

const CareRecipientProfileContext =
  createContext<CareRecipientProfileContextValue | null>(null);

export function CareRecipientProfileProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const userId = params.userId as string | undefined;
  const { activeFamilyId } = useFamily();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!activeFamilyId || !userId) {
      setMember(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await getFamilyMembers(activeFamilyId);
      if (!data) throw new Error("Failed to load family members");

      const found = data.members
        .map(apiMemberToFamilyMember)
        .find(
          (m) =>
            m.userId === userId &&
            m.role === "care_recipient" &&
            m.status === "joined",
        );

      if (!found) {
        setError("Care recipient not found or you don't have access.");
        setMember(null);
        return;
      }

      setMember(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load care recipient");
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyMembersList = useCallback(
    (members: FamilyMember[]) => {
      if (!userId) return;
      const found = members.find(
        (m) =>
          m.userId === userId &&
          m.role === "care_recipient" &&
          m.status === "joined",
      );
      if (found) {
        setMember(found);
        setError("");
      }
    },
    [userId],
  );

  const value = useMemo(
    () => ({ member, loading, error, refresh, applyMembersList }),
    [member, loading, error, refresh, applyMembersList],
  );

  return (
    <CareRecipientProfileContext.Provider value={value}>
      {children}
    </CareRecipientProfileContext.Provider>
  );
}

export function useCareRecipientProfile() {
  const ctx = useContext(CareRecipientProfileContext);
  if (!ctx) {
    throw new Error("useCareRecipientProfile must be used within CareRecipientProfileProvider");
  }
  return ctx;
}

export function useOptionalCareRecipientProfile() {
  return useContext(CareRecipientProfileContext);
}
