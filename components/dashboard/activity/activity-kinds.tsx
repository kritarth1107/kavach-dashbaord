import {
  AlarmClock,
  AlertTriangle,
  Bot,
  Camera,
  Car,
  CircleDot,
  HeartPulse,
  MessageCircle,
  Mic,
  PackageCheck,
  PackageX,
  ShoppingBag,
  Siren,
  Smile,
  type LucideIcon,
} from "lucide-react";
import type { ActivityItem, ActivitySeverity } from "@/lib/activity-api";

export type Tone = "green" | "blue" | "purple" | "amber" | "red" | "gray";

export type KindMeta = { label: string; icon: LucideIcon; tone: Tone };

export const KIND_META: Record<string, KindMeta> = {
  message_in: { label: "Message", icon: MessageCircle, tone: "blue" },
  voice_note: { label: "Voice note", icon: Mic, tone: "purple" },
  message_out: { label: "Saheli replied", icon: Bot, tone: "green" },
  order_step: { label: "Order step", icon: ShoppingBag, tone: "blue" },
  order_confirm_card: { label: "Order confirmation", icon: ShoppingBag, tone: "amber" },
  order_placed: { label: "Order placed", icon: PackageCheck, tone: "green" },
  order_failed: { label: "Order stopped", icon: PackageX, tone: "red" },
  order_cancelled: { label: "Order cancelled", icon: PackageX, tone: "gray" },
  order_interrupt: { label: "Message during order", icon: MessageCircle, tone: "blue" },
  ride: { label: "Ride", icon: Car, tone: "blue" },
  reminder: { label: "Reminder", icon: AlarmClock, tone: "purple" },
  mood: { label: "Mood", icon: Smile, tone: "amber" },
  health: { label: "Health", icon: HeartPulse, tone: "amber" },
  caregiver_alert: { label: "Caregiver alert", icon: Siren, tone: "amber" },
  diag: { label: "Diagnostics", icon: Camera, tone: "gray" },
};

const FALLBACK: KindMeta = { label: "Activity", icon: CircleDot, tone: "gray" };

export function kindMeta(item: Pick<ActivityItem, "kind" | "severity">): KindMeta {
  const meta = KIND_META[item.kind] ?? FALLBACK;
  if (item.severity === "error") return { ...meta, tone: "red", icon: meta.tone === "red" ? meta.icon : item.kind === "health" ? HeartPulse : AlertTriangle };
  if (item.severity === "warn" && meta.tone !== "red") return { ...meta, tone: "amber" };
  return meta;
}

export const TONE_CHIP: Record<Tone, string> = {
  green: "icon-chip-green",
  blue: "icon-chip-blue",
  purple: "icon-chip-purple",
  amber: "icon-chip-yellow",
  red: "icon-chip-red",
  gray: "bg-[var(--surface)] text-[var(--text-tertiary)]",
};

export function severityCardClass(severity: ActivitySeverity): string {
  if (severity === "error") return "border-[var(--danger-border)] bg-[var(--danger-bg)]";
  if (severity === "warn") return "border-[var(--warning-border)] bg-[var(--warning-bg)]";
  return "border-[var(--border)] bg-[var(--card)]";
}

export const ORDER_KINDS = new Set([
  "order_step",
  "order_confirm_card",
  "order_placed",
  "order_failed",
  "order_cancelled",
  "order_interrupt",
  "diag",
]);

export const TERMINAL_ORDER_KINDS = new Set(["order_placed", "order_failed", "order_cancelled"]);

export type FilterKey = "all" | "alerts" | "conversations" | "orders" | "rides" | "reminders";

export const FILTERS: Array<{ key: FilterKey; label: string; kinds: string[] | null }> = [
  { key: "all", label: "All", kinds: null },
  { key: "alerts", label: "Health & alerts", kinds: ["health", "caregiver_alert", "mood"] },
  { key: "conversations", label: "Conversations", kinds: ["message_in", "voice_note", "message_out"] },
  { key: "orders", label: "Orders", kinds: [...ORDER_KINDS] },
  { key: "rides", label: "Rides", kinds: ["ride"] },
  { key: "reminders", label: "Reminders", kinds: ["reminder"] },
];

export function isFilterKey(value: string | null): value is FilterKey {
  return FILTERS.some((f) => f.key === value);
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && !!v.trim()) : [];
}

/** Only accept inline image data URLs for screenshots (never remote URLs). */
export function screenshotOf(item: ActivityItem): string | null {
  const url = str(item.data?.screenshotDataUrl);
  return url && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(url) ? url : null;
}
