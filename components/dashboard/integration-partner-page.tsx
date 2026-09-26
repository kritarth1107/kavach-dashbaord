"use client";

import {
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";
import { INTEGRATION_PARTNER_BY_KEY } from "@/components/dashboard/integrations-data";
import {
  disconnectMcp,
  getPartnerIntegrationDetail,
  startMcpConnect,
  syncPartnerAddresses,
  updatePartnerOrderSettings,
  type McpIntegrationPartner,
  type PartnerIntegrationDetail,
  type PartnerOrderSettings,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        connected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text-secondary)]",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          connected ? "bg-emerald-500" : "bg-[var(--text-tertiary)]",
        )}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

function formatConnectedAt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOrderStatus(status: string) {
  return status.replace(/_/g, " ");
}

function OrderApprovalSettings({
  settings,
  canManage,
  busy,
  onSave,
}: {
  settings: PartnerOrderSettings;
  canManage: boolean;
  busy: boolean;
  onSave: (patch: {
    allowRecipientDirectOrders?: boolean;
    approvalThresholdRupees?: number | null;
  }) => Promise<void>;
}) {
  const [allowDirect, setAllowDirect] = useState(settings.allowRecipientDirectOrders);
  const [thresholdEnabled, setThresholdEnabled] = useState(
    settings.approvalThresholdPaise != null,
  );
  const [thresholdRupees, setThresholdRupees] = useState(
    settings.approvalThresholdPaise != null
      ? String(Math.round(settings.approvalThresholdPaise / 100))
      : "2000",
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setAllowDirect(settings.allowRecipientDirectOrders);
    setThresholdEnabled(settings.approvalThresholdPaise != null);
    setThresholdRupees(
      settings.approvalThresholdPaise != null
        ? String(Math.round(settings.approvalThresholdPaise / 100))
        : "2000",
    );
    setDirty(false);
  }, [settings]);

  async function handleSave() {
    await onSave({
      allowRecipientDirectOrders: allowDirect,
      approvalThresholdRupees: thresholdEnabled ? Number(thresholdRupees) || null : null,
    });
    setDirty(false);
  }

  return (
    <section className="panel-card overflow-hidden">
      <div className="border-b border-[var(--border-strong)] px-5 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={2.25} />
          <div>
            <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">Elder ordering</h2>
            <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
              Elders order from their own WhatsApp — caregivers are notified, not asked to approve.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3">
          <input
            type="radio"
            name="approval-mode"
            className="mt-1"
            checked={!allowDirect}
            disabled={!canManage || busy}
            onChange={() => {
              setAllowDirect(false);
              setDirty(true);
            }}
          />
          <div>
            <p className="text-[13px] font-bold text-[var(--text-primary)]">Legacy: approval required</p>
            <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
              Not recommended — Saheli WhatsApp still lets elders place; this only affects older dashboard flows.
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3">
          <input
            type="radio"
            name="approval-mode"
            className="mt-1"
            checked={allowDirect}
            disabled={!canManage || busy}
            onChange={() => {
              setAllowDirect(true);
              setDirty(true);
            }}
          />
          <div>
            <p className="text-[13px] font-bold text-[var(--text-primary)]">
              Elder can order · caregivers notified
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
              Default — Amma places from her WhatsApp; you get a summary notification (no approve step).
            </p>
          </div>
        </label>

        {allowDirect && (
          <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]/50 px-4 py-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={thresholdEnabled}
                disabled={!canManage || busy}
                onChange={(e) => {
                  setThresholdEnabled(e.target.checked);
                  setDirty(true);
                }}
              />
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                Require approval for large orders
              </span>
            </label>
            {thresholdEnabled && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[12px] text-[var(--text-secondary)]">Orders above</span>
                <div className="flex items-center rounded-lg border border-[var(--border-strong)] bg-[var(--card)]">
                  <span className="px-2 text-[12px] text-[var(--text-tertiary)]">₹</span>
                  <input
                    type="number"
                    min={1}
                    step={100}
                    value={thresholdRupees}
                    disabled={!canManage || busy}
                    onChange={(e) => {
                      setThresholdRupees(e.target.value);
                      setDirty(true);
                    }}
                    className="w-24 border-0 bg-transparent py-2 pr-2 text-[13px] font-semibold text-[var(--text-primary)] outline-none"
                  />
                </div>
                <span className="text-[12px] text-[var(--text-secondary)]">need approval</span>
              </div>
            )}
          </div>
        )}

        <p className="rounded-lg bg-primary-light px-3 py-2 text-[11px] leading-relaxed text-primary">
          Instinct parity: elders never wait on caregiver approval for groceries. Caregiver-initiated
          orders also checkout directly. You always get a notify when Amma places.
        </p>

        {canManage && dirty && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50"
          >
            Save elder-order settings
          </button>
        )}
      </div>
    </section>
  );
}

export function IntegrationPartnerPage({ partner }: { partner: McpIntegrationPartner }) {
  const meta = INTEGRATION_PARTNER_BY_KEY[partner];
  const { activeFamilyId, activeFamily } = useFamily();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PartnerIntegrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const canManage = canApproveOrders(activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: detail } = await getPartnerIntegrationDetail(activeFamilyId, partner);
      setData(detail ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, partner]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const result = searchParams.get(partner);
    const message = searchParams.get("message");
    if (result === "connected") {
      setBanner({
        type: "success",
        text: `${meta.title} connected — Saheli can order from here in chat.`,
      });
      void load();
    } else if (result === "error") {
      setBanner({
        type: "error",
        text: message ? decodeURIComponent(message) : `${meta.title} connection failed.`,
      });
    }
  }, [searchParams, partner, meta.title, load]);

  async function handleConnect() {
    if (!activeFamilyId || !canManage) return;
    setBusy(true);
    setBanner(null);
    try {
      const { data: result } = await startMcpConnect(activeFamilyId, partner);
      if (result?.connected) {
        setBanner({ type: "success", text: "Already connected." });
        await load();
        return;
      }
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setBanner({ type: "error", text: "Could not start sign-in." });
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Connect failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!activeFamilyId || !canManage) return;
    if (
      !window.confirm(
        `Disconnect ${meta.title} for the whole family? Saheli will fall back to the ${meta.title} website, which asks for an OTP.`,
      )
    )
      return;
    setBusy(true);
    try {
      await disconnectMcp(activeFamilyId, partner);
      setBanner({ type: "success", text: `${meta.title} disconnected.` });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncAddresses() {
    if (!activeFamilyId || !canManage) return;
    setBusy(true);
    setBanner(null);
    try {
      const { data: syncResult } = await syncPartnerAddresses(activeFamilyId, partner);
      setBanner({
        type: "success",
        text: `Synced ${syncResult?.synced ?? 0} delivery address${syncResult?.synced === 1 ? "" : "es"}.`,
      });
      await load();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Sync failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSettings(patch: {
    allowRecipientDirectOrders?: boolean;
    approvalThresholdRupees?: number | null;
  }) {
    if (!activeFamilyId || !canManage) return;
    setBusy(true);
    setBanner(null);
    try {
      const { data: updated } = await updatePartnerOrderSettings(activeFamilyId, partner, patch);
      if (updated) {
        setData((prev) => (prev ? { ...prev, orderSettings: updated } : prev));
      }
      setBanner({ type: "success", text: "Elder-order settings saved." });
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/integrations"
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-secondary)] hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All integrations
        </Link>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <Image src={meta.logoSrc} alt={meta.title} width={48} height={48} className="h-12 w-12 object-cover" />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)]">
              {meta.title}
            </h1>
            <p className="mt-1 text-[14px] text-[var(--text-secondary)]">{meta.tagline}</p>
          </div>
        </div>
      </div>

      {banner && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-xl border px-4 py-3 text-[13px]",
            banner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300",
          )}
        >
          {banner.type === "success" ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
          {banner.text}
        </div>
      )}

      {!canManage && activeFamilyId && (
        <p className="rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
          Only family admins can connect accounts or change approval settings.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <p className="py-16 text-center text-[13px] text-[var(--text-tertiary)]">
          Select a family to manage this integration.
        </p>
      ) : (
        <>
          {data.connected && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-light px-4 py-3 text-[12px] text-primary">
              <Sparkles className="h-4 w-4 shrink-0" />
              Your family member can now ask Saheli on WhatsApp — pick an option, reply
              &quot;confirm&quot;, no OTP. Cash on Delivery, family address book only.
            </div>
          )}

          <section className="panel-card overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-[var(--border-strong)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">Connection</h2>
                  <ConnectionPill connected={data.connected} />
                </div>
                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{data.description}</p>
                {data.connected && data.connectedAt && (
                  <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">
                    {data.connectedByMe === false && data.connectedByName
                      ? `Linked by ${data.connectedByName} · `
                      : data.connectedByMe
                        ? "Linked by you · "
                        : ""}
                    Connected {formatConnectedAt(data.connectedAt)}
                    {data.addressCount > 0
                      ? ` · ${data.addressCount} saved address${data.addressCount === 1 ? "" : "es"}`
                      : ""}
                  </p>
                )}
              </div>
              {canManage && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {!data.connected ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleConnect()}
                      className="rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      Connect {meta.title}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSyncAddresses()}
                        className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:border-primary/30 hover:text-primary"
                      >
                        Sync addresses
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDisconnect()}
                        className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:border-red-300 hover:text-red-600"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Payment
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  {data.paymentNote}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Partner docs
                </p>
                <a
                  href={data.partnerTrack}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                >
                  View documentation <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </section>

          <section className="panel-card overflow-hidden">
            <div className="border-b border-[var(--border-strong)] px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" strokeWidth={2.25} />
                <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">What you can do</h2>
              </div>
            </div>
            <ul className="space-y-2 px-5 py-4">
              {data.capabilities.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <OrderApprovalSettings
            settings={data.orderSettings}
            canManage={canManage}
            busy={busy}
            onSave={handleSaveSettings}
          />

          {data.addresses.length > 0 && (
            <section className="panel-card overflow-hidden">
              <div className="border-b border-[var(--border-strong)] px-5 py-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" strokeWidth={2.25} />
                  <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">
                    Saved delivery addresses
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-[var(--border-strong)]">
                {data.addresses.map((addr) => (
                  <div key={addr.address_id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-bold text-[var(--text-primary)]">
                        {addr.label || "Saved address"}
                      </p>
                      {addr.is_default && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{addr.line1}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {[addr.line2, addr.city, addr.pincode].filter(Boolean).join(", ")}
                    </p>
                    {addr.synced_at && (
                      <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
                        Synced {formatConnectedAt(addr.synced_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.recentOrders.length > 0 && (
            <section className="panel-card overflow-hidden">
              <div className="border-b border-[var(--border-strong)] px-5 py-4">
                <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">Recent orders</h2>
                {data.pendingApprovals > 0 && (
                  <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                    {data.pendingApprovals} awaiting action ·{" "}
                    <Link href="/dashboard/approvals" className="font-semibold text-primary hover:underline">
                      View approvals
                    </Link>
                  </p>
                )}
              </div>
              <div className="divide-y divide-[var(--border-strong)]">
                {data.recentOrders.map((order) => (
                  <div
                    key={order.order_id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div>
                      <p className="text-[12px] font-bold text-[var(--text-primary)]">
                        ₹{(order.total_paise / 100).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] capitalize text-[var(--text-tertiary)]">
                        {formatOrderStatus(order.status)}
                        {order.created_at
                          ? ` · ${new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
