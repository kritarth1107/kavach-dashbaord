"use client";

import { CheckCircle2, Loader2, MapPin, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { approveOrder, payOrder, type SaheliOrderSuggestion } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";
import { cn } from "@/lib/utils";

function formatAddress(addr: { label: string; line1: string; city?: string; pincode?: string }) {
  return [addr.label, addr.line1, addr.city, addr.pincode].filter(Boolean).join(" · ");
}

export function ChatOrderCard({
  order,
  onStatusChange,
}: {
  order: SaheliOrderSuggestion;
  onStatusChange?: (status: string) => void;
}) {
  const { activeFamilyId, activeFamily } = useFamily();
  const canApprove = canApproveOrders(activeFamily?.role);
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const defaultAddressId = useMemo(() => {
    const list = order.addresses ?? [];
    return list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? "";
  }, [order.addresses]);

  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddressId);

  const isLive = order.source && order.source !== "mock";
  const groupedSearch = useMemo(() => {
    const map = new Map<string, Array<{ name: string; pricePaise?: number }>>();
    for (const hit of order.searchResults ?? []) {
      const list = map.get(hit.query) ?? [];
      list.push({ name: hit.name, pricePaise: hit.pricePaise });
      map.set(hit.query, list);
    }
    return map;
  }, [order.searchResults]);

  async function handleApproveAndPlace() {
    if (!activeFamilyId || !canApprove || busy) return;
    if (status !== "awaiting_approval" && status !== "approved") return;

    const selected = order.addresses?.find((a) => a.id === selectedAddressId);
    if ((order.addresses?.length ?? 0) > 0 && !selected) {
      setError("Pick a delivery address first.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      if (status === "awaiting_approval") {
        await approveOrder(activeFamilyId, order.orderId);
        setStatus("approved");
        onStatusChange?.("approved");
      }
      const { data } = await payOrder(activeFamilyId, order.orderId, {
        partnerAddressId: selected?.id,
        deliveryAddress: selected ? formatAddress(selected) : undefined,
      });
      const next = data?.status ?? "paid";
      setStatus(next);
      onStatusChange?.(next);
      if (data?.payment_link) setPaymentLink(data.payment_link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  }

  const placed = status === "paid" || status === "delivered";

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-500/25 bg-emerald-500/5">
      <div className="flex items-center gap-2 border-b border-emerald-500/15 px-3.5 py-2.5">
        <ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300">
          {order.partnerLabel} basket
        </span>
        {isLive ? (
          <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-2.5 w-2.5" />
            Live catalog
          </span>
        ) : (
          <span className="ml-1 rounded-full bg-[var(--input-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-tertiary)]">
            Estimate
          </span>
        )}
        <span className="ml-auto text-[11px] font-semibold capitalize text-[var(--text-tertiary)]">
          {status.replace(/_/g, " ")}
        </span>
      </div>

      <ul className="space-y-2 px-3.5 py-2.5">
        {order.items.map((item, i) => (
          <li key={i}>
            <div className="flex justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
              <span className="min-w-0">
                {item.matchedName && item.matchedName !== item.name ? (
                  <>
                    <span className="font-medium text-[var(--text-primary)]">{item.matchedName}</span>
                    <span className="text-[var(--text-tertiary)]"> · asked “{item.name}”</span>
                  </>
                ) : (
                  item.name
                )}
              </span>
              <span className="shrink-0 text-[var(--text-tertiary)]">
                ×{item.quantity}
                {item.unitPricePaise != null && (
                  <span className="ml-1 text-[var(--text-secondary)]">
                    ₹{((item.unitPricePaise * item.quantity) / 100).toFixed(0)}
                  </span>
                )}
              </span>
            </div>
            {groupedSearch.get(item.name)?.length ? (
              <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                Found:{" "}
                {groupedSearch
                  .get(item.name)!
                  .slice(0, 2)
                  .map((h) => h.name)
                  .join(" · ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {(order.addresses?.length ?? 0) > 0 && !placed && canApprove && (
        <div className="border-t border-emerald-500/15 px-3.5 py-2.5">
          <p className="mb-2 flex items-center gap-1 text-[11px] font-bold text-[var(--text-secondary)]">
            <MapPin className="h-3 w-3" />
            Delivery address
          </p>
          <div className="space-y-1.5">
            {order.addresses!.map((addr) => (
              <label
                key={addr.id}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px]",
                  selectedAddressId === addr.id
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-[var(--border-strong)] bg-[var(--card)]",
                )}
              >
                <input
                  type="radio"
                  name={`addr-${order.orderId}`}
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  className="mt-0.5"
                />
                <span className="text-[var(--text-secondary)]">{formatAddress(addr)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-emerald-500/15 bg-emerald-500/5 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] font-extrabold text-[var(--text-primary)]">
          ₹{(order.totalPaise / 100).toFixed(0)}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {error && <span className="text-[11px] text-red-600">{error}</span>}
          {placed ? (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Order placed
              </span>
              {paymentLink && (
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-primary underline"
                >
                  Complete payment
                </a>
              )}
            </>
          ) : canApprove ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleApproveAndPlace()}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Approve &amp; place order
            </button>
          ) : (
            <Link
              href="/dashboard/approvals"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 px-3 py-1.5 text-[11px] font-bold text-emerald-700"
            >
              Sent for family approval
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
