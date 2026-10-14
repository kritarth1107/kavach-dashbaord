"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import { getFamilyMembers } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { apiMemberToFamilyMember, type FamilyMember } from "./family-data";
import { useRun } from "@/lib/use-run";

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
  // The profile is keyed by family + person, so a switch never shows the previous person while the next one loads.
  const key = activeFamilyId && userId ? `${activeFamilyId}|${userId}` : "";
  const [loaded, setLoaded] = useState<{ key: string; member: FamilyMember | null; error: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const reqRef = useRef(0);

  const refresh = useCallback(async () => {
    const reqId = ++reqRef.current;
    if (!activeFamilyId || !userId) {
      setLoaded(null);
      setLoading(false);
      return;
    }
    const forKey = `${activeFamilyId}|${userId}`;

    setLoading(true);

    try {
      const { data } = await getFamilyMembers(activeFamilyId);
      if (!data) throw new Error("Failed to load family members");
      if (reqId !== reqRef.current) return;

      const found = data.members
        .map(apiMemberToFamilyMember)
        .find(
          (m) =>
            m.userId === userId &&
            m.role === "care_recipient" &&
            m.status === "joined",
        );

      if (!found) {
        setLoaded({ key: forKey, member: null, error: "Care recipient not found or you don't have access." });
        return;
      }

      setLoaded({ key: forKey, member: found, error: "" });
    } catch {
      if (reqId !== reqRef.current) return;
      setLoaded({ key: forKey, member: null, error: "Couldn't load this profile right now. Please try again in a minute." });
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, [activeFamilyId, userId]);

  useRun(refresh);

  const applyMembersList = useCallback(
    (members: FamilyMember[]) => {
      if (!activeFamilyId || !userId) return;
      const found = members.find(
        (m) =>
          m.userId === userId &&
          m.role === "care_recipient" &&
          m.status === "joined",
      );
      if (found) setLoaded({ key: `${activeFamilyId}|${userId}`, member: found, error: "" });
    },
    [activeFamilyId, userId],
  );

  const current = loaded && loaded.key === key ? loaded : null;
  const member = current?.member ?? null;
  const error = current?.error ?? "";
  const busy = loading || (Boolean(key) && !current);

  const value = useMemo(
    () => ({ member, loading: busy, error, refresh, applyMembersList }),
    [member, busy, error, refresh, applyMembersList],
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
