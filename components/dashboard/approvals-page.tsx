"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  approveOrder,
  getOrderHistory,
  getPendingApprovals,
  payOrder,
  rejectOrder,
  type PendingOrder,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";

function partnerDisplay(order: PendingOrder): { label: string; openLabel: string } {
  const raw = (order.partner_label || order.partner || "").toLowerCase();
  if (raw.includes("instamart")) return { label: "Instamart", openLabel: "Open in Instamart →" };
  if (raw.includes("swiggy")) return { label: "Swiggy", openLabel: "Open in Swiggy →" };
  if (raw.includes("zepto")) return { label: "Zepto", openLabel: "Open in Zepto app →" };
  if (raw.includes("apollo")) return { label: "Apollo", openLabel: "Open in Apollo →" };
  if (raw.includes("pharmeasy")) return { label: "PharmEasy", openLabel: "Open in PharmEasy →" };
  if (raw.includes("1mg") || raw.includes("tata")) return { label: "Tata 1mg", openLabel: "Open in 1mg →" };
  if (order.partner_label) return { label: order.partner_label, openLabel: `Open in ${order.partner_label} →` };
  return { label: "Partner", openLabel: "Open partner app →" };
}

function statusLabel(status: string): string {
  if (status === "paid" || status === "delivered") return "placed · caregivers notified";
  if (status === "awaiting_approval") return "awaiting approval";
  if (status === "approved") return "approved — ready to place";
  return status.replace(/_/g, " ");
}

export function ApprovalsPage() {
  const { activeFamilyId, activeFamily } = useFamily();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [recentPlaced, setRecentPlaced] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const canApprove = canApproveOrders(activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setOrders([]);
      setRecentPlaced([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [{ data }, history] = await Promise.all([
        getPendingApprovals(activeFamilyId),
        getOrderHistory(activeFamilyId).catch(() => ({ data: { orders: [] as PendingOrder[] } })),
      ]);
      setOrders(data?.orders ?? []);
      const placed = (history.data?.orders ?? [])
        .filter((o) => o.status === "paid" || o.status === "delivered")
        .slice(0, 8);
      setRecentPlaced(placed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
      setOrders([]);
      setRecentPlaced([]);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApproveAndPlace(order: PendingOrder) {
    if (!activeFamilyId || !canApprove) return;
    setBusyId(order.order_id);
    setError("");
    setBanner("");
    const { label } = partnerDisplay(order);
    try {
      if (order.status === "awaiting_approval") {
        await approveOrder(activeFamilyId, order.order_id);
      }
      const { data } = await payOrder(activeFamilyId, order.order_id, {
        partnerAddressId: order.partner_address_id ?? undefined,
      });
      if (data?.payment_link) {
        setBanner(`Complete payment in ${label}: ${data.payment_link}`);
      } else {
        setBanner(`Order placed on ${label}.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve / place failed");
      try {
        await load();
      } catch {
        /* ignore */
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay(order: PendingOrder) {
    if (!activeFamilyId || !canApprove) return;
    setBusyId(order.order_id);
    setError("");
    setBanner("");
    const { label } = partnerDisplay(order);
    try {
      const { data } = await payOrder(activeFamilyId, order.order_id, {
        partnerAddressId: order.partner_address_id ?? undefined,
      });
      if (data?.payment_link) {
        setBanner(`Complete payment in ${label}: ${data.payment_link}`);
      } else {
        setBanner(`Order placed on ${label}.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment / checkout failed");
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
          Caregiver-initiated baskets needing action. Elder WhatsApp orders place directly — they
          show below as placed / notified, not pending approve.
        </p>
      </div>

      {banner && (
        <div className="rounded-xl border border-primary/30 bg-primary-light px-4 py-3 text-[12px] text-primary">
          {banner}
        </div>
      )}

      {error && (
        <div className="alert-error rounded-lg px-4 py-3 text-[12px]">
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
            {orders.map((order) => {
              const partner = partnerDisplay(order);
              return (
              <li key={order.order_id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">
                      {partner.label} · ₹{(order.total_paise / 100).toFixed(0)}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                      {order.items.map((i) => `${i.name} x${i.quantity}`).join(" · ")}
                    </p>
                    <p className="mt-1 text-[11px] capitalize text-[var(--text-tertiary)]">
                      {statusLabel(order.status)}
                    </p>
                    {order.deep_link && (
                      <a
                        href={order.deep_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-[11px] font-semibold text-primary hover:underline"
                      >
                        {partner.openLabel}
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
                            onClick={() => void handleApproveAndPlace(order)}
                            className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                          >
                            Approve & place
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
                          onClick={() => void handlePay(order)}
                          className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                        >
                          Place order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && recentPlaced.length > 0 && (
        <div className="panel-card overflow-hidden">
          <div className="border-b border-[var(--border-strong)] px-5 py-3">
            <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">
              Recently placed · notified
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
              Elder WhatsApp orders — no approve action needed.
            </p>
          </div>
          <ul className="divide-y divide-[var(--border-strong)]">
            {recentPlaced.map((order) => {
              const partner = partnerDisplay(order);
              return (
                <li key={`placed-${order.order_id}`} className="px-5 py-3">
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">
                    {partner.label} · ₹{(order.total_paise / 100).toFixed(0)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                    {order.items.map((i) => `${i.name} x${i.quantity}`).join(" · ")}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                    {statusLabel(order.status)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
