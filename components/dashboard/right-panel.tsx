"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Loader2, MoreHorizontal, Pill } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  approveOrder,
  getPendingApprovals,
  type PendingOrder,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";

const quickActions = [
  { label: "Zepto", logo: "/assets/zepto.png", href: "/dashboard/approvals" },
  { label: "More", icon: MoreHorizontal, href: "/dashboard/integrations" },
] as const;

export function DashboardRightPanel() {
  const { activeFamilyId, activeFamily } = useFamily();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const canApprove = canApproveOrders(activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getPendingApprovals(activeFamilyId);
      setOrders(data?.orders ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(orderId: string) {
    if (!activeFamilyId || !canApprove) return;
    setBusyId(orderId);
    try {
      await approveOrder(activeFamilyId, orderId);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = orders.filter((o) => o.status === "awaiting_approval").length;

  return (
    <aside className="no-scrollbar flex h-screen min-w-0 flex-1 shrink-0 flex-col overflow-y-auto border-l border-[var(--border-strong)] px-5 py-6">
      <div className="mb-5 flex items-center gap-2">
        <Link
          href="/dashboard/approvals"
          className="ml-auto flex items-center gap-1.5 rounded-full bg-[var(--charcoal)] px-4 py-2 text-[11px] font-bold text-white hover:opacity-90"
        >
          Approvals
          {pendingCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px]">{pendingCount}</span>
          )}
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Link>
      </div>

      <p className="mb-3 text-[12px] font-bold text-[var(--text-primary)]">Quick Actions</p>
      <div className="mb-6 grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-2 py-3 transition-colors hover:border-primary"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[var(--card)] shadow-sm">
              {"logo" in action ? (
                <Image
                  src={action.logo}
                  alt={action.label}
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              ) : (
                <action.icon className="h-[17px] w-[17px] text-[var(--text-primary)]" strokeWidth={1.75} />
              )}
            </div>
            <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{action.label}</span>
          </Link>
        ))}
      </div>

      <div className="panel-card mb-4">
        <div className="border-b border-[var(--border-strong)] px-4 py-3">
          <p className="text-[12px] font-bold text-[var(--text-primary)]">Pending approvals</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">Action inbox — not push alerts</p>
        </div>
        <div className="p-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-[var(--text-tertiary)]">All clear.</p>
          ) : (
            orders.slice(0, 4).map((order) => (
              <div
                key={order.order_id}
                className="mb-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--input-bg)] p-3 last:mb-0"
              >
                <p className="text-[12px] font-bold text-[var(--text-primary)]">
                  Zepto · ₹{(order.total_paise / 100).toFixed(0)}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {order.items.map((i) => i.name).join(" · ")}
                </p>
                {canApprove && order.status === "awaiting_approval" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === order.order_id}
                      onClick={() => void handleApprove(order.order_id)}
                      className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <Link
                      href="/dashboard/approvals"
                      className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-1.5 text-[11px] font-bold text-[var(--text-secondary)]"
                    >
                      Later
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="dark-card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-4 bottom-0 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative z-10 max-w-[65%]">
          <p className="text-[11px] font-medium text-white/50">Saheli</p>
          <p className="mt-1 text-[15px] font-extrabold leading-snug text-white">
            Voice-first on WhatsApp · context only, no alerts
          </p>
        </div>
        <div className="absolute -right-1 bottom-0 flex h-[110px] w-[90px] items-end justify-center pb-3">
          <Pill className="h-10 w-10 text-primary/40" strokeWidth={1.5} />
        </div>
      </div>
    </aside>
  );
}
