export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfToday() {
  return startOfDay(new Date());
}

export function addDays(date: Date, delta: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

export function isBeforeDay(a: Date, b: Date) {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

export function isAfterDay(a: Date, b: Date) {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

export function isDateSelectable(date: Date, minDate: Date | null, maxDate: Date) {
  if (isAfterDay(date, maxDate)) return false;
  if (minDate && isBeforeDay(date, minDate)) return false;
  return true;
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function formatDayLabel(date: Date) {
  const today = startOfToday();
  if (isSameDay(date, today)) return "Today";
  const yesterday = addDays(today, -1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

export function parseDocumentDate(doc: {
  record_date?: string | null;
  created_at?: string | null;
}): Date | null {
  const raw = doc.record_date?.trim() || doc.created_at?.trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return startOfDay(parsed);
  const loose = Date.parse(raw);
  if (!Number.isNaN(loose)) return startOfDay(new Date(loose));
  return null;
}

export function isDocumentOnDate(
  doc: { record_date?: string | null; created_at?: string | null },
  date: Date,
) {
  const docDate = parseDocumentDate(doc);
  return docDate ? isSameDay(docDate, date) : false;
}

export function isIsoOnDate(iso: string | null | undefined, date: Date) {
  if (!iso) return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return isSameDay(parsed, date);
}
