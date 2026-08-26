"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe } from "@/lib/api";
import {
  addDays,
  isAfterDay,
  isBeforeDay,
  isDateSelectable,
  isSameDay,
  startOfDay,
  startOfToday,
} from "@/lib/date-utils";

type RecipientDateContextValue = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  today: Date;
  minDate: Date | null;
  isToday: boolean;
  shiftDay: (delta: number) => void;
  goToToday: () => void;
};

const RecipientDateContext = createContext<RecipientDateContextValue | null>(null);

function parseAccountMinDate(iso?: string) {
  if (!iso) return null;
  const parsed = startOfDay(new Date(iso));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function RecipientDateProvider({ children }: { children: React.ReactNode }) {
  const today = useMemo(startOfToday, []);
  const [selectedDate, setSelectedDateState] = useState(today);
  const [minDate, setMinDate] = useState<Date | null>(null);

  useEffect(() => {
    getMe()
      .then(({ data }) => {
        const accountMin = parseAccountMinDate(data?.user?.createdAt);
        if (accountMin) {
          setMinDate(accountMin);
          setSelectedDateState((current) =>
            isBeforeDay(current, accountMin)
              ? accountMin
              : isAfterDay(current, today)
                ? today
                : current,
          );
        }
      })
      .catch(() => undefined);
  }, [today]);

  const setSelectedDate = useCallback(
    (date: Date) => {
      const next = startOfDay(date);
      if (!isDateSelectable(next, minDate, today)) return;
      setSelectedDateState(next);
    },
    [minDate, today],
  );

  const shiftDay = useCallback(
    (delta: number) => {
      const next = addDays(selectedDate, delta);
      if (!isDateSelectable(next, minDate, today)) return;
      setSelectedDateState(next);
    },
    [selectedDate, minDate, today],
  );

  const goToToday = useCallback(() => {
    setSelectedDateState(today);
  }, [today]);

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      today,
      minDate,
      isToday: isSameDay(selectedDate, today),
      shiftDay,
      goToToday,
    }),
    [selectedDate, setSelectedDate, today, minDate, shiftDay, goToToday],
  );

  return (
    <RecipientDateContext.Provider value={value}>{children}</RecipientDateContext.Provider>
  );
}

export function useRecipientDate() {
  const ctx = useContext(RecipientDateContext);
  if (!ctx) {
    throw new Error("useRecipientDate must be used within RecipientDateProvider");
  }
  return ctx;
}

export function useOptionalRecipientDate() {
  return useContext(RecipientDateContext);
}
