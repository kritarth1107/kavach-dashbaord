/**
 * A person's Saheli reminders (backend /reminders): every reminder that is not a medicine, with its schedule, the next
 * time, and per day what happened to each time. Everything here can also be done by telling Saheli on WhatsApp.
 */
import { request } from "./activity-api";

export type ReminderRepeat = "daily" | "weekly" | "once";

export type Reminder = {
  reminderId: string;
  recipientUserId: string;
  text: string;
  kind: "multi_time" | "hourly_window";
  times: string[];
  windowStartMinutes: number | null;
  windowEndMinutes: number | null;
  repeat: ReminderRepeat;
  date: string | null;
  /** 0 = Sunday … 6 = Saturday */
  daysOfWeek: number[];
  startDate: string | null;
  endDate: string | null;
  skips: string[];
  /** "Every day at 19:30", "Every hour 14:00–03:00", "Once on Wed 15 Oct at 17:00" */
  schedule: string;
  next: { day: string; time: string } | null;
  status: "active" | "completed" | "cancelled";
  createdBy: string;
  createdAt: string | null;
  stoppedAt: string | null;
  stoppedBy: string | null;
};

export type ReminderOccurrence = {
  reminderId: string;
  text: string;
  time: string;
  status: "scheduled" | "sent" | "failed" | "not_sent" | "skipped";
  reason?: string;
  schedule: string;
  /** More than three times that day (an hourly one): drawn smaller. */
  many: boolean;
  stopped: boolean;
};

export type ReminderDay = { day: string; occurrences: ReminderOccurrence[]; reminders: Reminder[] };

function base(familyId: string, subjectUserId: string) {
  return `/api/families/${encodeURIComponent(familyId)}/subjects/${encodeURIComponent(subjectUserId)}/reminders`;
}

function send<T>(url: string, body: unknown, method: "POST" | "PATCH" = "POST") {
  return request<T>(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, 30_000);
}

export async function getReminderDay(familyId: string, subjectUserId: string, day: string): Promise<ReminderDay> {
  const data = await request<ReminderDay>(`${base(familyId, subjectUserId)}/day?day=${day}`, {}, 30_000);
  return data ?? { day, occurrences: [], reminders: [] };
}

export async function listReminders(familyId: string, subjectUserId: string, all = true): Promise<Reminder[]> {
  const data = await request<{ reminders: Reminder[] }>(`${base(familyId, subjectUserId)}${all ? "?status=all" : ""}`, {}, 30_000);
  return data?.reminders ?? [];
}

export async function stopReminder(familyId: string, subjectUserId: string, reminderId: string) {
  return send<{ ok: boolean; reminder: Reminder }>(`${base(familyId, subjectUserId)}/${encodeURIComponent(reminderId)}/stop`, {});
}

/** Without a day: the next time it would go out. */
export async function skipReminder(familyId: string, subjectUserId: string, reminderId: string, opts: { day?: string; time?: string; undo?: boolean } = {}) {
  return send<{ ok: boolean; reminder: Reminder; skipped: string }>(`${base(familyId, subjectUserId)}/${encodeURIComponent(reminderId)}/skip`, opts);
}

export async function changeReminder(
  familyId: string,
  subjectUserId: string,
  reminderId: string,
  change: { times?: string[]; windowStart?: string; windowEnd?: string; repeat?: ReminderRepeat; date?: string; days?: number[]; endDate?: string | null; text?: string },
) {
  return send<{ ok: boolean; reminder: Reminder }>(`${base(familyId, subjectUserId)}/${encodeURIComponent(reminderId)}`, change, "PATCH");
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
