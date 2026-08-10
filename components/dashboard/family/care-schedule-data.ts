import {
  Activity,
  Calendar,
  ClipboardList,
  Pill,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { CareScheduleItem, CareScheduleType } from "@/lib/api";

export type ScheduleFormData = {
  type: CareScheduleType;
  title: string;
  time: string;
  dosage: string;
  instructions: string;
  daysOfWeek: number[];
  active: boolean;
};

export const scheduleTypeOptions: {
  value: CareScheduleType;
  label: string;
  icon: LucideIcon;
  description: string;
}[] = [
  { value: "MEDICINE", label: "Medicine", icon: Pill, description: "Daily dose or prescription" },
  { value: "CHECK_IN", label: "Check-in", icon: Sun, description: "Wellness or Saheli check-in" },
  { value: "VITALS", label: "Vitals", icon: Activity, description: "BP, sugar, weight, etc." },
  { value: "APPOINTMENT", label: "Appointment", icon: Calendar, description: "Doctor or clinic visit" },
  { value: "CUSTOM", label: "Custom", icon: ClipboardList, description: "Any other care task" },
];

export const timeOptions = [
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "4:00 PM",
  "6:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
];

export const dayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export function emptyScheduleForm(): ScheduleFormData {
  return {
    type: "MEDICINE",
    title: "",
    time: "8:00 AM",
    dosage: "",
    instructions: "",
    daysOfWeek: [],
    active: true,
  };
}

export function scheduleToForm(item: CareScheduleItem): ScheduleFormData {
  return {
    type: item.type,
    title: item.title,
    time: item.time,
    dosage: item.dosage ?? "",
    instructions: item.instructions ?? "",
    daysOfWeek: item.daysOfWeek ?? [],
    active: item.active,
  };
}

export function getScheduleTypeMeta(type: CareScheduleType) {
  return scheduleTypeOptions.find((opt) => opt.value === type) ?? scheduleTypeOptions[4];
}

export function formatScheduleDays(days: number[]) {
  if (!days.length) return "Every day";
  const labels = dayOptions
    .filter((d) => days.includes(d.value))
    .map((d) => d.label);
  return labels.join(", ");
}

export function sortSchedules(items: CareScheduleItem[]) {
  return [...items].sort((a, b) => {
    const timeA = timeOptions.indexOf(a.time);
    const timeB = timeOptions.indexOf(b.time);
    if (timeA !== -1 && timeB !== -1 && timeA !== timeB) return timeA - timeB;
    return a.time.localeCompare(b.time);
  });
}

export function getActiveSchedulesForToday(items: CareScheduleItem[]) {
  const today = new Date().getDay();
  return sortSchedules(
    items.filter((item) => item.active && (!item.daysOfWeek.length || item.daysOfWeek.includes(today))),
  );
}

export function getNextScheduleItem(items: CareScheduleItem[]) {
  const todayItems = getActiveSchedulesForToday(items);
  if (!todayItems.length) return null;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function toMinutes(time: string) {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return Number.MAX_SAFE_INTEGER;
    let hours = Number(match[1]) % 12;
    const minutes = Number(match[2]);
    if (match[3].toUpperCase() === "PM") hours += 12;
    return hours * 60 + minutes;
  }

  return todayItems.find((item) => toMinutes(item.time) >= nowMinutes) ?? todayItems[0];
}
