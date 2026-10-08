"use client";

import Link from "next/link";
import {
  Bell,
  CaretRight,
  Checks,
  FirstAidKit,
  Heartbeat,
  ShoppingBag,
  Siren,
  Sparkle,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getNotifications, markAllNotificationsRead, markNotificationRead, type NotificationItem } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { cn } from "@/lib/utils";
import { usePerson } from "./person-context";
import { Avatar, Panel, PillTabs, SmallButton, Tag } from "./ui";

type Filter = "all" | "unread" | "urgent";

const KIND: Record<string, { icon: PhosphorIcon; label: string; urgent?: boolean }> = {
  emergency: { icon: Siren, label: "Emergency", urgent: true },
  care_alert: { icon: Heartbeat, label: "Care" },
  order_placed: { icon: ShoppingBag, label: "Order" },
  lab: { icon: FirstAidKit, label: "Records" },
};

function meta(item: NotificationItem) {
  const k = KIND[item.kind] ?? { icon: Sparkle, label: "Update" };
  const urgent = k.urgent || /urgent/i.test(item.title);
  return { ...k, urgent };
}

const IST = "Asia/Kolkata";
function dayLabel(iso: string | null) {
  if (!iso) return "Earlier";
  const d = new Date(iso);
  const key = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: IST });
  const today = new Date();
  const yest = new Date(Date.now() - 86_400_000);
  if (key(d) === key(today)) return "Today";
  if (key(d) === key(yest)) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: IST });
}
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: IST }) : "");

export function NotificationsPage() {
  const { activeFamilyId } = useFamily();
  const { people } = usePerson();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    if (!activeFamilyId) return;
    try {
      const { data } = await getNotifications(activeFamilyId);
      setItems(data?.notifications ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const unread = items.filter((i) => !i.readAt).length;
  const urgent = items.filter((i) => meta(i).urgent).length;
  const shown = useMemo(
    () => items.filter((i) => (filter === "unread" ? !i.readAt : filter === "urgent" ? meta(i).urgent : true)),
    [items, filter],
  );
  const groups = useMemo(() => {
    const g: Array<{ day: string; items: NotificationItem[] }> = [];
    for (const it of shown) {
      const day = dayLabel(it.createdAt);
      const last = g[g.length - 1];
      if (last?.day === day) last.items.push(it);
      else g.push({ day, items: [it] });
    }
    return g;
  }, [shown]);

  async function read(item: NotificationItem) {
    if (!activeFamilyId || item.readAt) return;
    setItems((xs) => xs.map((x) => (x.notificationId === item.notificationId ? { ...x, readAt: new Date().toISOString() } : x)));
    await markNotificationRead(activeFamilyId, item.notificationId).catch(() => undefined);
  }
  async function readAll() {
    if (!activeFamilyId) return;
    setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    await markAllNotificationsRead(activeFamilyId).catch(() => undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block font-light text-[var(--c-ink-3)]">Your</span>
            <span className="block font-medium">Notifications</span>
          </h1>
          <p className="mt-2 text-[13px] text-[var(--c-ink-2)]">{unread ? `${unread} unread` : "You're all caught up."}</p>
        </div>
        {unread > 0 && (
          <SmallButton dark icon={Checks} onClick={() => void readAll()}>
            Mark all read
          </SmallButton>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <PillTabs<Filter>
            value={filter}
            onChange={setFilter}
            tabs={[
              { id: "all", label: `All · ${items.length}` },
              { id: "unread", label: `Unread · ${unread}` },
              { id: "urgent", label: `Urgent · ${urgent}` },
            ]}
          />
          {loading ? (
            <div className="h-[300px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          ) : groups.length === 0 ? (
            <Panel className="flex flex-col items-center py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-frame)]">
                <Bell size={24} />
              </span>
              <p className="mt-4 text-[18px] font-medium">Nothing here</p>
              <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">Saheli tells you about orders, records and anything that needs your attention.</p>
            </Panel>
          ) : (
            groups.map((g) => (
              <Panel key={g.day}>
                <p className="flex items-center gap-2.5 text-[14px] font-medium">
                  <span className="h-[14px] w-[14px] rounded-[4px] bg-[var(--c-accent)]" /> {g.day}
                </p>
                <ul className="mt-3 space-y-2">
                  {g.items.map((it) => {
                    const m = meta(it);
                    const person = people.find((p) => p.id === it.recipientUserId);
                    const body = (
                      <div className={cn("flex items-start gap-3 rounded-[18px] p-3.5 transition-colors", it.readAt ? "bg-[var(--c-frame)]/60" : "bg-[var(--c-frame)]")}>
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            m.urgent ? "bg-[var(--c-accent)] text-white" : it.readAt ? "border border-[var(--c-line)]" : "bg-[var(--c-solid)] text-white",
                          )}
                        >
                          <m.icon size={18} weight={m.urgent ? "fill" : "regular"} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("truncate text-[14px]", it.readAt ? "text-[var(--c-ink-2)]" : "font-medium")}>{it.title}</p>
                            <span className="shrink-0 text-[11px] tabular-nums text-[var(--c-ink-3)]">{time(it.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">{it.body}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Tag tone={m.urgent ? "accent" : "light"}>{m.label}</Tag>
                            {person && (
                              <span className="flex items-center gap-1.5 text-[11px] text-[var(--c-ink-2)]">
                                <Avatar name={person.name} src={person.photo} size={18} /> {person.name.split(" ").slice(-2).join(" ")}
                              </span>
                            )}
                          </div>
                        </div>
                        {!it.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--c-accent)]" aria-label="unread" />}
                        {it.actionUrl && <CaretRight size={14} className="mt-1 shrink-0 text-[var(--c-ink-3)]" />}
                      </div>
                    );
                    return (
                      <li key={it.notificationId}>
                        {it.actionUrl ? (
                          <Link href={it.actionUrl} onClick={() => void read(it)} className="block">
                            {body}
                          </Link>
                        ) : (
                          <button type="button" onClick={() => void read(it)} className="block w-full text-left">
                            {body}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ))
          )}
        </div>
        <aside className="space-y-4">
          <Panel accent className="flex flex-col">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Unread</p>
            <p className="c-num mt-4 text-[56px] leading-none text-white">{unread}</p>
            <p className="mt-2 text-[12px] text-white/80">of {items.length} in the last 30 days</p>
          </Panel>
          <Panel>
            <p className="text-[14px] font-medium">What reaches your WhatsApp</p>
            <ul className="mt-3 space-y-2 text-[12.5px] text-[var(--c-ink-2)]">
              {["A medical red flag", "No answer to a check that matters", "A confident mood or safety concern", "An order that needs your OK"].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-[var(--c-ink-3)]">Everything else stays here and in the daily snapshot.</p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
