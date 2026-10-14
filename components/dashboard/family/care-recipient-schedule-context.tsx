"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  createCareScheduleItem,
  deleteCareScheduleItem,
  getCareSchedule,
  updateCareScheduleItem,
  type CareScheduleItem,
  type CareSchedulePayload,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { useRun } from "@/lib/use-run";

type CareScheduleContextValue = {
  schedules: CareScheduleItem[];
  loading: boolean;
  saving: boolean;
  error: string;
  canManage: boolean;
  refresh: () => Promise<void>;
  addSchedule: (payload: CareSchedulePayload) => Promise<void>;
  updateSchedule: (scheduleId: string, payload: Partial<CareSchedulePayload>) => Promise<void>;
  removeSchedule: (scheduleId: string) => Promise<void>;
};

const CareScheduleContext = createContext<CareScheduleContextValue | null>(null);
const NO_SCHEDULES: CareScheduleItem[] = [];

export function CareRecipientScheduleProvider({
  children,
  recipientUserId: recipientUserIdProp,
}: {
  children: React.ReactNode;
  recipientUserId?: string;
}) {
  const params = useParams();
  const recipientUserId = recipientUserIdProp ?? (params.userId as string | undefined);
  const { activeFamilyId } = useFamily();
  // Schedules are keyed by family + person: after a switch the previous person's list (and the counts built on it)
  // is never shown, and a late response for them is dropped.
  const key = activeFamilyId && recipientUserId ? `${activeFamilyId}|${recipientUserId}` : "";
  const [loaded, setLoaded] = useState<{ key: string; schedules: CareScheduleItem[]; canManage: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reqRef = useRef(0);

  const refresh = useCallback(async () => {
    const reqId = ++reqRef.current;
    if (!activeFamilyId || !recipientUserId) {
      setLoaded(null);
      setLoading(false);
      return;
    }
    const forKey = `${activeFamilyId}|${recipientUserId}`;

    setLoading(true);
    setError("");
    try {
      const { data } = await getCareSchedule(activeFamilyId, recipientUserId);
      if (reqId !== reqRef.current) return;
      setLoaded({ key: forKey, schedules: data?.schedules ?? [], canManage: Boolean(data?.canManage) });
    } catch (err) {
      if (reqId !== reqRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load care schedule");
      setLoaded({ key: forKey, schedules: [], canManage: false });
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, [activeFamilyId, recipientUserId]);

  const current = loaded && loaded.key === key ? loaded : null;
  const schedules = current?.schedules ?? NO_SCHEDULES;
  const canManage = current?.canManage ?? false;
  const busy = loading || (Boolean(key) && !current);

  useRun(refresh);

  const addSchedule = useCallback(
    async (payload: CareSchedulePayload) => {
      if (!activeFamilyId || !recipientUserId) return;
      setSaving(true);
      setError("");
      try {
        await createCareScheduleItem(activeFamilyId, recipientUserId, payload);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add schedule item");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [activeFamilyId, recipientUserId, refresh],
  );

  const updateSchedule = useCallback(
    async (scheduleId: string, payload: Partial<CareSchedulePayload>) => {
      if (!activeFamilyId || !recipientUserId) return;
      setSaving(true);
      setError("");
      try {
        await updateCareScheduleItem(activeFamilyId, recipientUserId, scheduleId, payload);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update schedule item");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [activeFamilyId, recipientUserId, refresh],
  );

  const removeSchedule = useCallback(
    async (scheduleId: string) => {
      if (!activeFamilyId || !recipientUserId) return;
      setSaving(true);
      setError("");
      try {
        await deleteCareScheduleItem(activeFamilyId, recipientUserId, scheduleId);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove schedule item");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [activeFamilyId, recipientUserId, refresh],
  );

  const value = useMemo(
    () => ({
      schedules,
      loading: busy,
      saving,
      error,
      canManage,
      refresh,
      addSchedule,
      updateSchedule,
      removeSchedule,
    }),
    [schedules, busy, saving, error, canManage, refresh, addSchedule, updateSchedule, removeSchedule],
  );

  return (
    <CareScheduleContext.Provider value={value}>{children}</CareScheduleContext.Provider>
  );
}

export function useCareSchedule() {
  const ctx = useContext(CareScheduleContext);
  if (!ctx) {
    throw new Error("useCareSchedule must be used within CareRecipientScheduleProvider");
  }
  return ctx;
}

export function useOptionalCareSchedule() {
  return useContext(CareScheduleContext);
}
