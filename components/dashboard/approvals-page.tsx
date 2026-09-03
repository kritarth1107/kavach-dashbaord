"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  approveOrder,
  getPendingApprovals,
  payOrder,
  rejectOrder,
  type PendingOrder,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";

export function ApprovalsPage() {
  const { activeFamilyId, activeFamily } = useFamily();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const canApprove = canApproveOrders(activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await getPendingApprovals(activeFamilyId);
      setOrders(data?.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
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
    setError("");
    try {
      await approveOrder(activeFamilyId, orderId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay(orderId: string) {
    if (!activeFamilyId || !canApprove) return;
    setBusyId(orderId);
    setError("");
    try {
      const { data } = await payOrder(activeFamilyId, orderId);
      if (data?.payment_link) {
        setBanner(`Complete payment in Zepto: ${data.payment_link}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(orderId: string) {
    if (!activeFamilyId || !canApprove) return;
    setBusyId(orderId);
    setError("");
    try {
      await rejectOrder(activeFamilyId, orderId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decline failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel-card p-5">
        <h1 className="text-[18px] font-extrabold text-[var(--text-primary)]">Approvals</h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Zepto baskets — approve, pay (mock in pilot), or open in Zepto app. No push alerts.
        </p>
      </div>

      {banner && (
        <div className="rounded-xl border border-primary/30 bg-primary-light px-4 py-3 text-[12px] text-primary">
          {banner}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[12px] text-[#b91c1c]">
          {error}
        </div>
      )}

      <div className="panel-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <p className="px-5 py-16 text-center text-[13px] text-[var(--text-tertiary)]">
            Nothing awaiting approval.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-strong)]">
            {orders.map((order) => (
              <li key={order.order_id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">
                      Zepto · ₹{(order.total_paise / 100).toFixed(0)}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                      {order.items.map((i) => `${i.name} x${i.quantity}`).join(" · ")}
                    </p>
                    <p className="mt-1 text-[11px] capitalize text-[var(--text-tertiary)]">
                      {order.status.replace(/_/g, " ")}
                    </p>
                    {order.deep_link && (
                      <a
                        href={order.deep_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-[11px] font-semibold text-primary hover:underline"
                      >
                        Open in Zepto app →
                      </a>
                    )}
                  </div>
                  {canApprove && (
                    <div className="flex flex-wrap gap-2">
                      {order.status === "awaiting_approval" && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === order.order_id}
                            onClick={() => void handleApprove(order.order_id)}
                            className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === order.order_id}
                            onClick={() => void handleReject(order.order_id)}
                            className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {order.status === "approved" && (
                        <button
                          type="button"
                          disabled={busyId === order.order_id}
                          onClick={() => void handlePay(order.order_id)}
                          className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                        >
                          Pay order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
