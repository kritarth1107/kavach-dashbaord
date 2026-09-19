"use client";

import { Loader2, MapPin, ShoppingBag, Store } from "lucide-react";
import { ChatConnectPartnerCard } from "@/components/dashboard/chat/chat-connect-partner-card";
import type { McpIntegrationPartner } from "@/lib/api";
import { useMemo, useState } from "react";
import {
  addOrderFlowCartItem,
  loadOrderFlowRestaurantMenu,
  searchOrderFlowCatalog,
  selectOrderFlowAddress,
  submitOrderFlowCart,
  updateOrderFlowCartItem,
  type SaheliOrderFlow,
  type SaheliOrderFlowCatalogItem,
  type SaheliOrderSuggestion,
} from "@/lib/api";
import { useFamily } from "@/components/dashboard/family-context";
import { cn } from "@/lib/utils";

function formatAddress(addr: { label: string; line1: string; city?: string; pincode?: string }) {
  return [addr.label, addr.line1, addr.city, addr.pincode].filter(Boolean).join(" · ");
}

function formatPrice(paise?: number) {
  if (paise == null) return "";
  return `₹${(paise / 100).toFixed(0)}`;
}

const STEPS = [
  { id: "select_address", label: "Address" },
  { id: "browse", label: "Browse" },
  { id: "review_cart", label: "Cart" },
  { id: "submitted", label: "Done" },
] as const;

export function OrderFlowContainer({
  flow: initialFlow,
  onFlowUpdate,
  onOrderSubmitted,
}: {
  flow: SaheliOrderFlow;
  onFlowUpdate?: (flow: SaheliOrderFlow) => void;
  onOrderSubmitted?: (order: SaheliOrderSuggestion) => void;
}) {
  const { activeFamilyId } = useFamily();
  const [flow, setFlow] = useState(initialFlow);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState(
    initialFlow.selectedAddressId ?? initialFlow.addresses?.find((a) => a.isDefault)?.id ?? "",
  );
  const [dishQty, setDishQty] = useState<Record<string, number>>({});
  const [catalogQuery, setCatalogQuery] = useState(initialFlow.query ?? "");
  const isInstamart = flow.partner === "instamart";

  const stepIndex = STEPS.findIndex((s) => s.id === flow.phase);

  const cartTotal = useMemo(
    () =>
      (flow.cartItems ?? []).reduce(
        (sum, item) => sum + item.quantity * item.pricePaise,
        0,
      ),
    [flow.cartItems],
  );

  async function applyFlow(next: SaheliOrderFlow | undefined) {
    if (!next) return;
    setFlow(next);
    onFlowUpdate?.(next);
    if (next.selectedAddressId) setSelectedAddressId(next.selectedAddressId);
  }

  async function handleSelectAddress() {
    if (!activeFamilyId || !flow.sessionId || !selectedAddressId) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await selectOrderFlowAddress(activeFamilyId, flow.sessionId, selectedAddressId);
      await applyFlow(data ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not select address");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestaurantClick(restaurant: SaheliOrderFlowCatalogItem) {
    const restaurantId = restaurant.restaurantId ?? restaurant.id;
    if (!activeFamilyId || !flow.sessionId || !restaurantId) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await loadOrderFlowRestaurantMenu(
        activeFamilyId,
        flow.sessionId,
        restaurantId,
      );
      await applyFlow(data ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load menu");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddDish(dish: SaheliOrderFlowCatalogItem) {
    if (!activeFamilyId || !flow.sessionId) return;
    const key = dish.itemId ?? dish.id ?? dish.name;
    const quantity = dishQty[key] ?? 1;
    setBusy(true);
    setError("");
    try {
      const { data } = await addOrderFlowCartItem(activeFamilyId, flow.sessionId, {
        itemId: dish.itemId ?? dish.id,
        name: dish.name,
        quantity,
        pricePaise: dish.pricePaise,
        restaurantId: dish.restaurantId,
        restaurantName: dish.restaurantName,
      });
      await applyFlow(data ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setBusy(false);
    }
  }

  async function handleCartQtyChange(index: number, quantity: number) {
    if (!activeFamilyId || !flow.sessionId) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await updateOrderFlowCartItem(
        activeFamilyId,
        flow.sessionId,
        index,
        quantity,
      );
      await applyFlow(data ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update cart");
    } finally {
      setBusy(false);
    }
  }

  async function handleSearchCatalog() {
    if (!activeFamilyId || !flow.sessionId || !catalogQuery.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await searchOrderFlowCatalog(
        activeFamilyId,
        flow.sessionId,
        catalogQuery.trim(),
      );
      await applyFlow(data ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeAddress() {
    setFlow((prev) => ({ ...prev, phase: "select_address" }));
  }

  async function handleSubmitCart() {
    if (!activeFamilyId || !flow.sessionId) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await submitOrderFlowCart(activeFamilyId, flow.sessionId);
      if (data?.flow) await applyFlow(data.flow);
      if (data?.order) onOrderSubmitted?.(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit basket");
    } finally {
      setBusy(false);
    }
  }

  if (!flow.sessionId) {
    const connectPartner = (flow.connectPartner ?? flow.partner) as McpIntegrationPartner;
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-3">
        <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">
          {flow.message ?? `Connect ${flow.partnerLabel} to continue this order.`}
        </p>
        <div className="mt-2">
          <ChatConnectPartnerCard
            connect={{
              partner: flow.partner,
              partnerLabel: flow.partnerLabel,
              connectPartner,
              connectUrl: flow.connectUrl ?? undefined,
              note: flow.query ? `Then say: order ${flow.query} from ${flow.partnerLabel.toLowerCase()}` : undefined,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 border-b border-primary/15 px-3.5 py-2.5">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <span className="text-[12px] font-bold text-[var(--text-primary)]">
          {flow.partnerLabel} · {flow.query}
        </span>
      </div>

      <div className="flex gap-1 border-b border-primary/10 px-3 py-2">
        {STEPS.map((step, idx) => (
          <div
            key={step.id}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-center text-[10px] font-semibold",
              idx <= stepIndex
                ? "bg-primary/15 text-primary"
                : "text-[var(--text-tertiary)]",
            )}
          >
            {step.label}
          </div>
        ))}
      </div>

      <div className="space-y-3 px-3.5 py-3">
        {error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-600">{error}</p>
        ) : null}

        {flow.phase === "select_address" && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
              <MapPin className="h-3.5 w-3.5" />
              Pick delivery address
            </p>
            <ul className="space-y-1.5">
              {(flow.addresses ?? []).map((addr) => (
                <label
                  key={addr.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-[12px]",
                    selectedAddressId === addr.id
                      ? "border-primary bg-primary/10"
                      : "border-[var(--border-strong)]",
                  )}
                >
                  <input
                    type="radio"
                    name={`order-flow-address-${flow.sessionId}`}
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-0.5"
                  />
                  <span>{formatAddress(addr)}</span>
                </label>
              ))}
            </ul>
            <button
              type="button"
              disabled={busy || !selectedAddressId}
              onClick={() => void handleSelectAddress()}
              className="w-full rounded-lg bg-primary px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
            >
              {busy
                ? isInstamart
                  ? "Loading products…"
                  : "Loading restaurants…"
                : isInstamart
                  ? "Continue to products"
                  : "Continue to restaurants"}
            </button>
          </div>
        )}

        {flow.disambiguation?.candidates?.length ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Which &ldquo;{flow.disambiguation.query}&rdquo; did you mean?
            </p>
            <ul className="space-y-1.5">
              {flow.disambiguation.candidates.map((item) => (
                <li key={item.candidateId ?? item.name}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void handleAddDish({
                        itemId: item.candidateId ?? item.name,
                        name: item.name,
                        pricePaise: item.pricePaise,
                        kind: item.kind as SaheliOrderFlowCatalogItem["kind"],
                      })
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--border-strong)] px-3 py-2 text-left text-[12px] hover:border-primary/40"
                  >
                    <span>{item.name}</span>
                    {item.pricePaise ? (
                      <span className="font-semibold text-primary">{formatPrice(item.pricePaise)}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(flow.phase === "browse" || flow.phase === "review_cart") && (
          <div className="space-y-3">
            {flow.selectedAddressId ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Delivering to:{" "}
                  {formatAddress(
                    flow.addresses?.find((a) => a.id === flow.selectedAddressId) ?? {
                      label: "Saved",
                      line1: "",
                    },
                  )}
                </p>
                {flow.phase === "browse" && (
                  <button
                    type="button"
                    onClick={() => void handleChangeAddress()}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Change address
                  </button>
                )}
              </div>
            ) : null}

            {flow.phase === "browse" && (
              <div className="flex gap-2">
                <input
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  placeholder={isInstamart ? "Search Instamart products…" : "Try broader search…"}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-1.5 text-[12px]"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSearchCatalog()}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            )}

            {flow.phase === "browse" && !isInstamart && (flow.catalog?.restaurants.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <Store className="h-3.5 w-3.5" />
                  Restaurants nearby
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {flow.catalog!.restaurants.slice(0, 8).map((rest) => (
                    <button
                      key={rest.id ?? rest.name}
                      type="button"
                      disabled={busy}
                      onClick={() => void handleRestaurantClick(rest)}
                      className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-3 py-1 text-[11px] font-medium hover:border-primary/40"
                    >
                      {rest.name}
                      {rest.pricePaise ? ` · ${formatPrice(rest.pricePaise)}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {flow.phase === "browse" && isInstamart && (flow.catalog?.products?.length ?? 0) === 0 && (
              <p className="text-[11px] text-[var(--text-tertiary)]">
                No products found — try a broader grocery search.
              </p>
            )}

            {flow.phase === "browse" && isInstamart && (flow.catalog?.products?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                  Products for &ldquo;{flow.query}&rdquo;
                </p>
                <ul className="space-y-2">
                  {flow.catalog!.products!.slice(0, 12).map((product) => {
                    const key = product.itemId ?? product.id ?? product.name;
                    return (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-strong)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold">{product.name}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {product.pricePaise ? (
                            <span className="text-[11px] font-bold">{formatPrice(product.pricePaise)}</span>
                          ) : null}
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={dishQty[key] ?? 1}
                            onChange={(e) =>
                              setDishQty((prev) => ({
                                ...prev,
                                [key]: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                              }))
                            }
                            className="w-12 rounded border border-[var(--border-strong)] bg-[var(--input-bg)] px-1 py-0.5 text-center text-[11px]"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleAddDish(product)}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {flow.phase === "browse" && !isInstamart && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                  Dishes for &ldquo;{flow.query}&rdquo;
                </p>
                {(flow.catalog?.dishes.length ?? 0) === 0 ? (
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    No dishes found — try another restaurant above.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {flow.catalog!.dishes.slice(0, 12).map((dish) => {
                      const key = dish.itemId ?? dish.id ?? dish.name;
                      return (
                        <li
                          key={key}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-strong)] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold">{dish.name}</p>
                            {dish.restaurantName ? (
                              <p className="truncate text-[10px] text-[var(--text-tertiary)]">
                                {dish.restaurantName}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {dish.pricePaise ? (
                              <span className="text-[11px] font-bold">{formatPrice(dish.pricePaise)}</span>
                            ) : null}
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={dishQty[key] ?? 1}
                              onChange={(e) =>
                                setDishQty((prev) => ({
                                  ...prev,
                                  [key]: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                                }))
                              }
                              className="w-12 rounded border border-[var(--border-strong)] bg-[var(--input-bg)] px-1 py-0.5 text-center text-[11px]"
                            />
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleAddDish(dish)}
                              className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
                            >
                              Add
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {(flow.cartItems?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">Your basket</p>
                <ul className="space-y-1.5">
                  {flow.cartItems!.map((item, idx) => (
                    <li
                      key={`${item.name}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-[var(--card)] px-3 py-2 text-[12px]"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        {item.restaurantName ? (
                          <p className="text-[10px] text-[var(--text-tertiary)]">{item.restaurantName}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleCartQtyChange(idx, item.quantity - 1)}
                          className="h-6 w-6 rounded border text-[12px]"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-[11px]">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleCartQtyChange(idx, item.quantity + 1)}
                          className="h-6 w-6 rounded border text-[12px]"
                        >
                          +
                        </button>
                        <span className="w-10 text-right text-[11px] font-bold">
                          {formatPrice(item.quantity * item.pricePaise)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between text-[12px] font-bold">
                  <span>Total</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                {flow.phase === "review_cart" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSubmitCart()}
                    className="mt-2 w-full rounded-lg bg-primary px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Preparing basket…
                      </span>
                    ) : (
                      "Confirm basket for family approval"
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {flow.phase === "submitted" && (
          <p className="text-[12px] text-emerald-700 dark:text-emerald-300">
            Basket submitted — use the order card below for family approval.
          </p>
        )}
      </div>
    </div>
  );
}
