"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  createFamily,
  getFamilySwitcher,
  getMe,
  setPrimaryFamily,
  switchActiveFamily,
  type FamilyAccessAlert,
  type PendingInvitation,
} from "@/lib/api";
import {
  familyAvatarColor,
  type FamilySummary,
  type FamilySwitcherPayload,
} from "@/lib/family-types";
import {
  getStoredFamilyId,
  resolveActiveFamilyId,
  setStoredFamilyId,
} from "@/lib/family-storage";
import { FamilyInvitationModal } from "@/components/dashboard/family-invitation-modal";

type FamilyContextValue = {
  userId: string | null;
  families: FamilySummary[];
  activeFamilyId: string | null;
  primaryFamilyId: string | null;
  activeFamily: FamilySummary | null;
  loading: boolean;
  switching: boolean;
  error: string | null;
  familyAccessAlert: FamilyAccessAlert | null;
  dismissFamilyAccessAlert: () => void;
  selectFamily: (familyId: string) => Promise<void>;
  setAsPrimaryFamily: (familyId: string) => Promise<void>;
  createNewFamily: (name: string) => Promise<void>;
  refreshFamilies: () => Promise<void>;
};

const FamilyContext = createContext<FamilyContextValue | null>(null);

function withActiveFlags(
  payload: FamilySwitcherPayload,
  activeFamilyId: string | null,
): FamilySwitcherPayload {
  const families = payload.families.map((family) => ({
    ...family,
    isActive: family.familyId === activeFamilyId,
  }));

  return {
    primaryFamilyId: payload.primaryFamilyId,
    activeFamilyId,
    activeFamily:
      families.find((family) => family.familyId === activeFamilyId) ?? null,
    families,
  };
}

function applySelection(
  payload: FamilySwitcherPayload,
  activeFamilyId: string | null,
  userId: string,
) {
  if (activeFamilyId) {
    setStoredFamilyId(activeFamilyId, userId);
  }

  return withActiveFlags(payload, activeFamilyId);
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);
  const [primaryFamilyId, setPrimaryFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [familyAccessAlert, setFamilyAccessAlert] = useState<FamilyAccessAlert | null>(null);

  const commitSwitcher = useCallback(
    (payload: FamilySwitcherPayload, nextActiveId: string | null, uid: string) => {
      const next = applySelection(payload, nextActiveId, uid);
      setFamilies(next.families);
      setActiveFamilyId(next.activeFamilyId);
      setPrimaryFamilyId(next.primaryFamilyId);
    },
    [],
  );

  const syncWithBackend = useCallback(
    async (uid: string, payload: FamilySwitcherPayload) => {
      const resolvedId = resolveActiveFamilyId(
        payload.families,
        payload.activeFamilyId,
        uid,
      );

      if (
        resolvedId &&
        resolvedId !== payload.activeFamilyId &&
        getStoredFamilyId(uid) === resolvedId
      ) {
        const { data } = await switchActiveFamily(resolvedId);
        if (data) {
          commitSwitcher(data, data.activeFamilyId, uid);
          return;
        }
      }

      commitSwitcher(payload, resolvedId, uid);
    },
    [commitSwitcher],
  );

  const refreshFamilies = useCallback(async () => {
    const { data } = await getFamilySwitcher();
    if (!data || !userId) return;
    await syncWithBackend(userId, data);
  }, [syncWithBackend, userId]);

  const refreshPendingInvitations = useCallback(async () => {
    const { data } = await getMe();
    if (!data) return;
    setPendingInvitations(data.pendingInvitations ?? []);
    return data;
  }, []);

  const handleInvitationResolved = useCallback(async () => {
    const data = await refreshPendingInvitations();
    if (!data?.user?.userId) return;

    const { data: switcher } = await getFamilySwitcher();
    if (switcher) {
      await syncWithBackend(data.user.userId, switcher);
    }
  }, [refreshPendingInvitations, syncWithBackend]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        const { data } = await getMe();
        if (cancelled || !data?.user?.userId) return;

        if (data.requiresInvitationAction) {
          router.replace("/auth/pending-invite");
          return;
        }

        setPendingInvitations(data.pendingInvitations ?? []);
        setFamilyAccessAlert(data.familyAccessAlert ?? null);

        const uid = data.user.userId;
        setUserId(uid);

        await syncWithBackend(uid, {
          activeFamilyId: data.activeFamilyId,
          primaryFamilyId: data.primaryFamilyId ?? null,
          activeFamily: data.activeFamily,
          families: data.families,
        });
      } catch (err) {
        if (!cancelled) {
          setFamilies([]);
          setActiveFamilyId(null);
          setError(err instanceof Error ? err.message : "Failed to load families");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [syncWithBackend, router]);

  const selectFamily = useCallback(
    async (familyId: string) => {
      if (!userId || familyId === activeFamilyId || switching) return;

      setSwitching(true);
      setError(null);
      setStoredFamilyId(familyId, userId);
      setActiveFamilyId(familyId);
      setFamilies((prev) =>
        prev.map((family) => ({
          ...family,
          isActive: family.familyId === familyId,
        })),
      );

      try {
        const { data } = await switchActiveFamily(familyId);
        if (!data) throw new Error("Failed to switch family");
        commitSwitcher(data, data.activeFamilyId, userId);
      } catch (err) {
        try {
          await refreshFamilies();
        } catch {
          // ignore nested failure
        }
        setError(err instanceof Error ? err.message : "Failed to switch family");
        throw err;
      } finally {
        setSwitching(false);
      }
    },
    [userId, activeFamilyId, switching, commitSwitcher, refreshFamilies],
  );

  const setAsPrimaryFamily = useCallback(
    async (familyId: string) => {
      if (!userId || familyId === primaryFamilyId || switching) return;

      setSwitching(true);
      setError(null);

      try {
        const { data } = await setPrimaryFamily(familyId);
        if (!data) throw new Error("Failed to set primary family");
        commitSwitcher(data, data.activeFamilyId, userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set primary family");
        throw err;
      } finally {
        setSwitching(false);
      }
    },
    [userId, primaryFamilyId, switching, commitSwitcher],
  );

  const createNewFamily = useCallback(
    async (name: string) => {
      if (!userId || switching) return;

      setSwitching(true);
      setError(null);

      try {
        const { switcher } = await createFamily(name.trim());
        if (!switcher) throw new Error("Failed to create family");
        commitSwitcher(switcher, switcher.activeFamilyId, userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create family");
        throw err;
      } finally {
        setSwitching(false);
      }
    },
    [userId, switching, commitSwitcher],
  );

  const activeFamily = useMemo(
    () => families.find((family) => family.familyId === activeFamilyId) ?? null,
    [families, activeFamilyId],
  );

  const value = useMemo(
    () => ({
      userId,
      families,
      activeFamilyId,
      primaryFamilyId,
      activeFamily,
      loading,
      switching,
      error,
      familyAccessAlert,
      dismissFamilyAccessAlert: () => setFamilyAccessAlert(null),
      selectFamily,
      setAsPrimaryFamily,
      createNewFamily,
      refreshFamilies,
    }),
    [
      userId,
      families,
      activeFamilyId,
      primaryFamilyId,
      activeFamily,
      loading,
      switching,
      error,
      familyAccessAlert,
      selectFamily,
      setAsPrimaryFamily,
      createNewFamily,
      refreshFamilies,
    ],
  );

  return (
    <FamilyContext.Provider value={value}>
      {pendingInvitations.length > 0 && (
        <FamilyInvitationModal
          invites={pendingInvitations}
          onResolved={handleInvitationResolved}
        />
      )}
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error("useFamily must be used within FamilyProvider");
  }
  return ctx;
}

export { familyAvatarColor };
