"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getMe } from "@/lib/api";
import { cn } from "@/lib/utils";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday() {
  return startOfDay(new Date());
}

function addDays(date: Date, delta: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isBeforeDay(a: Date, b: Date) {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

function isAfterDay(a: Date, b: Date) {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

function isDateSelectable(date: Date, minDate: Date | null, maxDate: Date) {
  if (isAfterDay(date, maxDate)) return false;
  if (minDate && isBeforeDay(date, minDate)) return false;
  return true;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

function buildMonthDays(year: number, month: number) {
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    return startOfDay(new Date(year, month, i + 1));
  });
}

function buildMonthGrid(viewMonth: Date) {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function parseAccountMinDate(iso?: string) {
  if (!iso) return null;
  const parsed = startOfDay(new Date(iso));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function CalendarPopover({
  open,
  onClose,
  selected,
  minDate,
  maxDate,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  selected: Date;
  minDate: Date | null;
  maxDate: Date;
  onSelect: (date: Date) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  useEffect(() => {
    if (open) {
      setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [open, selected]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  const monthLabel = viewMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const grid = buildMonthGrid(viewMonth);
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div
      ref={ref}
      className="absolute left-1/2 top-full z-30 mt-2 w-[280px] -translate-x-1/2 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setViewMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
            )
          }
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f5f5f7]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <p className="text-[13px] font-bold text-[#111827]">{monthLabel}</p>
        <button
          type="button"
          onClick={() =>
            setViewMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
            )
          }
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f5f5f7]"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {weekDays.map((day) => (
          <span
            key={day}
            className="py-1 text-center text-[10px] font-semibold text-[#9ca3af]"
          >
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((date) => {
          const inMonth = isSameMonth(date, viewMonth);
          const active = isSameDay(date, selected);
          const selectable = inMonth && isDateSelectable(date, minDate, maxDate);

          return (
            <button
              key={dateKey(date)}
              type="button"
              disabled={!selectable}
              onClick={() => {
                if (!selectable) return;
                onSelect(date);
                onClose();
              }}
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-lg text-[12px] font-semibold transition-colors",
                !inMonth && "text-[#d1d5db]",
                inMonth && !selectable && "cursor-not-allowed text-[#d1d5db]",
                inMonth &&
                  selectable &&
                  !active &&
                  "text-[#374151] hover:bg-primary-light hover:text-primary",
                active && "bg-primary text-white",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RecipientDateHeader() {
  const today = useMemo(startOfToday, []);
  const [selected, setSelected] = useState(startOfToday);
  const [minDate, setMinDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    getMe()
      .then(({ data }) => {
        const accountMin = parseAccountMinDate(data?.user?.createdAt);
        if (accountMin) {
          setMinDate(accountMin);
          setSelected((current) =>
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

  const bounds = minDate;
  const days = useMemo(
    () => buildMonthDays(selected.getFullYear(), selected.getMonth()),
    [selected],
  );

  const monthLabel = selected.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const canGoPrev = isDateSelectable(addDays(selected, -1), bounds, today);
  const canGoNext = isDateSelectable(addDays(selected, 1), bounds, today);

  function centerDate(date: Date, smooth = true) {
    const el = dayRefs.current.get(dateKey(date));
    const container = scrollRef.current;
    if (!el || !container) return;

    const targetLeft = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: smooth ? "smooth" : "auto",
    });
  }

  useLayoutEffect(() => {
    centerDate(selected, false);
  }, [selected, days]);

  function selectDate(date: Date) {
    if (!isDateSelectable(date, bounds, today)) return;
    setSelected(startOfDay(date));
  }

  function shiftDay(delta: number) {
    const next = addDays(selected, delta);
    if (!isDateSelectable(next, bounds, today)) return;
    setSelected(next);
  }

  function goToToday() {
    setSelected(today);
  }

  return (
    <div className="mb-6">
      <div className="relative mb-3 flex justify-center">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCalendarOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-[15px] font-bold text-[#111827] transition-colors hover:bg-[#f5f5f7]"
            aria-expanded={calendarOpen}
            aria-label="Open calendar"
          >
            <Calendar className="h-4 w-4 text-primary" strokeWidth={2.25} />
            {monthLabel}
          </button>
          {!isSameDay(selected, today) && (
            <button
              type="button"
              onClick={goToToday}
              className="rounded-lg px-2 py-1 text-[12px] font-semibold text-primary transition-colors hover:bg-primary-light"
            >
              Today
            </button>
          )}
        </div>
        <CalendarPopover
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          selected={selected}
          minDate={bounds}
          maxDate={today}
          onSelect={selectDate}
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => shiftDay(-1)}
          disabled={!canGoPrev}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6b7280] shadow-sm transition-colors",
            canGoPrev
              ? "hover:bg-primary-light hover:text-primary"
              : "cursor-not-allowed opacity-40",
          )}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <div
          ref={scrollRef}
          className="no-scrollbar flex min-w-0 flex-1 gap-0.5 overflow-x-auto scroll-smooth pb-0.5"
        >
          {days.map((date) => {
            const active = isSameDay(date, selected);
            const isToday = isSameDay(date, today);
            const selectable = isDateSelectable(date, bounds, today);

            return (
              <button
                key={dateKey(date)}
                ref={(el) => {
                  const key = dateKey(date);
                  if (el) dayRefs.current.set(key, el);
                  else dayRefs.current.delete(key);
                }}
                type="button"
                disabled={!selectable}
                onClick={() => selectDate(date)}
                className={cn(
                  "flex w-[46px] shrink-0 flex-col items-center rounded-xl py-2 transition-all",
                  !selectable && "cursor-not-allowed opacity-35",
                  selectable && active
                    ? "bg-white shadow-[0_1px_4px_rgba(22,163,74,0.06)]"
                    : selectable && "hover:bg-white/80",
                )}
              >
                <span className="text-[10px] font-semibold text-[#9ca3af]">
                  {date.toLocaleDateString("en-IN", { weekday: "short" })}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[15px] font-extrabold leading-none",
                    active ? "text-primary" : "text-[#374151]",
                  )}
                >
                  {date.getDate()}
                </span>
                <span className="mt-1 flex h-1 w-1 items-center justify-center">
                  {isToday && (
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full",
                        active ? "bg-primary" : "bg-primary/50",
                      )}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => shiftDay(1)}
          disabled={!canGoNext}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6b7280] shadow-sm transition-colors",
            canGoNext
              ? "hover:bg-primary-light hover:text-primary"
              : "cursor-not-allowed opacity-40",
          )}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
