"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

export function CareRecipientScheduleProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const recipientUserId = params.userId as string | undefined;
  const { activeFamilyId } = useFamily();
  const [schedules, setSchedules] = useState<CareScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);

  const refresh = useCallback(async () => {
    if (!activeFamilyId || !recipientUserId) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await getCareSchedule(activeFamilyId, recipientUserId);
      setSchedules(data?.schedules ?? []);
      setCanManage(Boolean(data?.canManage));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load care schedule");
      setSchedules([]);
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, recipientUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      loading,
      saving,
      error,
      canManage,
      refresh,
      addSchedule,
      updateSchedule,
      removeSchedule,
    }),
    [schedules, loading, saving, error, canManage, refresh, addSchedule, updateSchedule, removeSchedule],
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
