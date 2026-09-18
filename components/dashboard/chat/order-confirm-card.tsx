"use client";

import { CheckCircle2, Loader2, MapPin, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { placeCodOrder, type SaheliOrderPreview } from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";

function formatPrice(paise: number) {
  return `₹${(paise / 100).toFixed(0)}`;
}

export function OrderConfirmCard({
  preview,
  onPlaced,
}: {
  preview: SaheliOrderPreview;
  onPlaced?: (orderId: string) => void;
}) {
  const { activeFamilyId, activeFamily } = useFamily();
  const canPlace = canApproveOrders(activeFamily?.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  async function handlePlaceCod() {
    if (!activeFamilyId || !canPlace || busy || placed) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await placeCodOrder(activeFamilyId, preview.previewId);
      if (data?.orderId) {
        setOrderId(data.orderId);
        setPlaced(true);
        onPlaced?.(data.orderId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place COD order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-primary/25 bg-primary/5">
      <div className="flex items-center gap-2 border-b border-primary/15 px-3.5 py-2.5">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <div>
          <p className="text-[12px] font-bold text-[var(--text-primary)]">Confirm COD order</p>
          <p className="text-[10px] text-[var(--text-tertiary)]">{preview.partnerLabel}</p>
        </div>
      </div>

      <div className="space-y-2 px-3.5 py-3">
        <p className="flex items-start gap-1.5 text-[11px] text-[var(--text-secondary)]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{preview.deliveryAddress}</span>
        </p>
        <ul className="space-y-1">
          {preview.items.map((item) => (
            <li
              key={`${item.name}-${item.quantity}`}
              className="flex items-center justify-between text-[12px]"
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <span className="font-semibold">{formatPrice(item.quantity * item.unitPricePaise)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-primary/15 bg-primary/5 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] font-extrabold">{formatPrice(preview.totalPaise)}</span>
        <div className="flex flex-wrap items-center gap-2">
          {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
          {placed ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              COD order placed{orderId ? ` · ${orderId.slice(0, 8)}` : ""}
            </span>
          ) : canPlace ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handlePlaceCod()}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Place COD order
            </button>
          ) : (
            <span className="text-[11px] text-[var(--text-tertiary)]">Caregiver approval required</span>
          )}
        </div>
      </div>
    </div>
  );
}
