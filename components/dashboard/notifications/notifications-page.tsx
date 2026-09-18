"use client";

import { Bell, CheckCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { useFamily } from "@/components/dashboard/family-context";
import { formatWhen } from "@/components/dashboard/family/morning-briefing-card";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export function NotificationsPage() {
  const { activeFamilyId } = useFamily();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getNotifications(activeFamilyId);
      setItems(data?.notifications ?? []);
      setUnreadCount(data?.unreadCount ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRead(item: NotificationItem) {
    if (!activeFamilyId || item.readAt) return;
    await markNotificationRead(activeFamilyId, item.notificationId);
    void load();
  }

  async function handleReadAll() {
    if (!activeFamilyId) return;
    await markAllNotificationsRead(activeFamilyId);
    void load();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-bold">Notifications</h1>
              <p className="text-[12px] text-[var(--text-secondary)]">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleReadAll()}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[11px] font-semibold"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="panel-card flex flex-col items-center py-16 text-center">
              <Bell className="mb-3 h-8 w-8 text-[var(--text-tertiary)]" />
              <p className="text-[14px] font-semibold">No notifications yet</p>
              <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                Saheli will notify you about orders, labs, and check-ins.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const content = (
                  <div
                    className={cn(
                      "rounded-2xl border px-4 py-3",
                      item.readAt
                        ? "border-[var(--border-strong)] bg-[var(--card)] opacity-80"
                        : "border-primary/25 bg-primary/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-bold">{item.title}</p>
                        <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{item.body}</p>
                      </div>
                      {!item.readAt && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {item.createdAt && (
                      <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">
                        {formatWhen(item.createdAt)}
                      </p>
                    )}
                  </div>
                );

                if (item.actionUrl) {
                  return (
                    <li key={item.notificationId}>
                      <Link
                        href={item.actionUrl}
                        onClick={() => void handleRead(item)}
                        className="block"
                      >
                        {content}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={item.notificationId}>
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => void handleRead(item)}
                    >
                      {content}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
