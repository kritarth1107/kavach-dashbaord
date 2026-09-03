"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useFamily } from "@/components/dashboard/family-context";
import { getOrderHistory, type OrderHistoryItem } from "@/lib/api";

export function BillingPage() {
  const { activeFamilyId } = useFamily();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getOrderHistory(activeFamilyId);
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

  return (
    <div className="space-y-4">
      <div className="panel-card p-5">
        <h1 className="text-[18px] font-extrabold text-[var(--text-primary)]">Billing & orders</h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Care-commerce order history — approve and pay in{" "}
          <Link href="/dashboard/approvals" className="font-semibold text-primary hover:underline">
            Approvals
          </Link>
        </p>
      </div>

      <div className="panel-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <p className="px-5 py-16 text-center text-[13px] text-[var(--text-tertiary)]">
            No orders yet. Saheli will suggest Zepto baskets when refills are due.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-strong)]">
            {orders.map((order) => (
              <li key={order.order_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-[14px] font-bold text-[var(--text-primary)]">
                    Zepto · ₹{(order.total_paise / 100).toFixed(0)}
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    {order.items.map((i) => i.name).join(" · ")}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--input-bg)] px-3 py-1 text-[10px] font-bold capitalize text-[var(--text-secondary)]">
                  {order.status.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
