"use client";

import { Check, ExternalLink, Loader2, MessageCircle, Sparkles } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";
import {
  disconnectMcp,
  getFamilyIntegrations,
  startMcpConnect,
  syncPartnerAddresses,
  type FamilyIntegrations,
  type McpIntegrationInfo,
  type McpIntegrationPartner,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type ConnectionState = "connected" | "partial" | "disconnected";

function ConnectionPill({ state, label }: { state: ConnectionState; label?: string }) {
  const styles: Record<ConnectionState, string> = {
    connected: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    partial: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    disconnected: "border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text-secondary)]",
  };

  const dot: Record<ConnectionState, string> = {
    connected: "bg-emerald-500",
    partial: "bg-amber-500",
    disconnected: "bg-[var(--text-tertiary)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        styles[state],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[state])} />
      {label ??
        (state === "connected" ? "Connected" : state === "partial" ? "Partially connected" : "Not connected")}
    </span>
  );
}

function PartnerLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <Image src={src} alt={alt} width={40} height={40} className="h-10 w-10 object-cover" />
    </div>
  );
}

function ServiceRow({
  label,
  logoSrc,
  description,
  connected,
  connectedAt,
  canConnect,
  busy,
  onConnect,
  onDisconnect,
  onSyncAddresses,
}: {
  label: string;
  logoSrc?: string;
  description: string;
  connected: boolean;
  connectedAt: string | null;
  canConnect: boolean;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSyncAddresses?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-strong)] pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        {logoSrc && <PartnerLogo src={logoSrc} alt={label} />}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-bold text-[var(--text-primary)]">{label}</p>
            <ConnectionPill
              state={connected ? "connected" : "disconnected"}
              label={connected ? "Connected" : "Not connected"}
            />
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
          {connected && connectedAt && (
            <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">
              Linked{" "}
              {new Date(connectedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
      {canConnect && (
        <div className="flex shrink-0 gap-2">
          {!connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={onConnect}
              className="rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Connect
            </button>
          ) : (
            <>
              {onSyncAddresses ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSyncAddresses}
                  className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:border-primary/30 hover:text-primary"
                >
                  Sync addresses
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={onDisconnect}
                className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:border-red-300 hover:text-red-600"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PartnerCard({
  logoSrc,
  title,
  subtitle,
  children,
  pill,
}: {
  logoSrc: string;
  title: string;
  subtitle: string;
  pill: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel-card overflow-hidden">
      <div className="border-b border-[var(--border-strong)] bg-[var(--surface)]/50 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <PartnerLogo src={logoSrc} alt={title} />
            <div>
              <h2 className="text-[15px] font-extrabold text-[var(--text-primary)]">{title}</h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-secondary)]">{subtitle}</p>
            </div>
          </div>
          {pill}
        </div>
      </div>
      {children && <div className="space-y-4 px-5 py-4">{children}</div>}
    </div>
  );
}

function ZeptoCard({
  info,
  canConnect,
  busy,
  onConnect,
  onDisconnect,
}: {
  info: McpIntegrationInfo;
  canConnect: boolean;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <PartnerCard
      logoSrc="/assets/zepto.svg"
      title="Zepto"
      subtitle="10-minute grocery delivery."
      pill={<ConnectionPill state={info.connected ? "connected" : "disconnected"} />}
    >
      <p className="text-[12px] text-[var(--text-secondary)]">{info.description}</p>
      {canConnect && (
        <div className="flex flex-wrap gap-2">
          {!info.connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={onConnect}
              className="rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50"
            >
              Connect Zepto
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onDisconnect}
              className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)]"
            >
              Disconnect
            </button>
          )}
          <a
            href={info.partnerTrack}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)]"
          >
            Partner docs <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </PartnerCard>
  );
}

function SwiggyCard({
  food,
  groceries,
  canConnect,
  busy,
  onConnect,
  onDisconnect,
  onSyncAddresses,
}: {
  food: McpIntegrationInfo;
  groceries: McpIntegrationInfo;
  canConnect: boolean;
  busy: boolean;
  onConnect: (partner: McpIntegrationPartner) => void;
  onDisconnect: (partner: McpIntegrationPartner) => void;
  onSyncAddresses: (partner: McpIntegrationPartner) => void;
}) {
  const foodOn = food.connected;
  const groceryOn = groceries.connected;
  const overall: ConnectionState =
    foodOn && groceryOn ? "connected" : foodOn || groceryOn ? "partial" : "disconnected";
  const pillLabel =
    overall === "connected"
      ? "Food & groceries"
      : foodOn
        ? "Food only"
        : groceryOn
          ? "Groceries only"
          : undefined;

  return (
    <PartnerCard
      logoSrc="/assets/swiggy.svg"
      title="Swiggy"
      subtitle="Same Swiggy login — connect Food and Instamart separately for full ordering from Saheli."
      pill={<ConnectionPill state={overall} label={pillLabel} />}
    >
      <ServiceRow
        label="Swiggy Food"
        logoSrc="/assets/swiggy.svg"
        description="Restaurant meals and food delivery."
        connected={foodOn}
        connectedAt={food.connectedAt}
        canConnect={canConnect}
        busy={busy}
        onConnect={() => onConnect("swiggy")}
        onDisconnect={() => onDisconnect("swiggy")}
        onSyncAddresses={() => onSyncAddresses("swiggy")}
      />
      <ServiceRow
        label="Instamart"
        logoSrc="/assets/instamart.svg"
        description="Groceries and daily essentials."
        connected={groceryOn}
        connectedAt={groceries.connectedAt}
        canConnect={canConnect}
        busy={busy}
        onConnect={() => onConnect("instamart")}
        onDisconnect={() => onDisconnect("instamart")}
        onSyncAddresses={() => onSyncAddresses("instamart")}
      />
    </PartnerCard>
  );
}

function WhatsAppCard({ info }: { info: FamilyIntegrations["whatsapp"] }) {
  const displayNumber = info.kavachNumber ?? "+91 83109 05372";

  return (
    <div className="panel-card p-5">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <MessageCircle className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-bold text-[var(--text-primary)]">WhatsApp</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">
            {info.description}
          </p>
          <p className="mt-3 text-[20px] font-extrabold tracking-tight text-[var(--text-primary)]">
            {displayNumber}
          </p>
          <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
            Save this number and message Saheli anytime — no setup in the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

const OAUTH_PARTNERS: McpIntegrationPartner[] = ["zepto", "swiggy", "instamart"];

const PARTNER_LABELS: Record<McpIntegrationPartner, string> = {
  zepto: "Zepto",
  swiggy: "Swiggy Food",
  instamart: "Instamart",
};

export function IntegrationsPage() {
  const { activeFamilyId, activeFamily } = useFamily();
  const searchParams = useSearchParams();
  const [data, setData] = useState<FamilyIntegrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const canConnect = canApproveOrders(activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: integrations } = await getFamilyIntegrations(activeFamilyId);
      setData(integrations ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    for (const partner of OAUTH_PARTNERS) {
      const result = searchParams.get(partner);
      const message = searchParams.get("message");
      if (result === "connected") {
        setBanner({
          type: "success",
          text: `${PARTNER_LABELS[partner]} connected — Saheli can order from here in chat.`,
        });
        void load();
        break;
      }
      if (result === "error") {
        setBanner({
          type: "error",
          text: message ? decodeURIComponent(message) : `${PARTNER_LABELS[partner]} connection failed.`,
        });
        break;
      }
    }
  }, [searchParams, load]);

  async function handleConnect(partner: McpIntegrationPartner) {
    if (!activeFamilyId || !canConnect) return;
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
      setBanner({ type: "error", text: "Could not start sign-in. Ask your admin to check partner access." });
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Connect failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncAddresses(partner: McpIntegrationPartner) {
    if (!activeFamilyId || !canConnect) return;
    setBusy(true);
    setBanner(null);
    try {
      const { data } = await syncPartnerAddresses(activeFamilyId, partner);
      setBanner({
        type: "success",
        text: `Synced ${data?.synced ?? 0} delivery address${data?.synced === 1 ? "" : "es"}.`,
      });
      await load();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Sync failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect(partner: McpIntegrationPartner) {
    if (!activeFamilyId || !canConnect) return;
    setBusy(true);
    try {
      await disconnectMcp(activeFamilyId, partner);
      setBanner({ type: "success", text: `${PARTNER_LABELS[partner]} disconnected.` });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const connectedCount =
    data && [data.zepto, data.swiggy, data.instamart].filter((p) => p.connected).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)]">Integrations</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          Connect delivery partners so Saheli can search items, build carts, and place orders from chat.
        </p>
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

      {!canConnect && activeFamilyId && (
        <p className="rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-4 py-3 text-[12px] text-[var(--text-secondary)]">
          Only family admins can connect delivery accounts.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <p className="py-16 text-center text-[13px] text-[var(--text-tertiary)]">
          Select a family to manage integrations.
        </p>
      ) : (
        <>
          {connectedCount !== null && connectedCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-light px-4 py-3 text-[12px] text-primary">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                {connectedCount} delivery {connectedCount === 1 ? "partner" : "partners"} connected — ask Saheli
                in chat to order.
              </span>
            </div>
          )}

          <section className="space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Order delivery
            </h2>
            <SwiggyCard
              food={data.swiggy}
              groceries={data.instamart}
              canConnect={canConnect}
              busy={busy}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSyncAddresses={handleSyncAddresses}
            />
            <ZeptoCard
              info={data.zepto}
              canConnect={canConnect}
              busy={busy}
              onConnect={() => handleConnect("zepto")}
              onDisconnect={() => handleDisconnect("zepto")}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Message Saheli
            </h2>
            <WhatsAppCard info={data.whatsapp} />
          </section>

          {(data.partnerAddresses?.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Saved delivery addresses
              </h2>
              <div className="panel-card divide-y divide-[var(--border-strong)]">
                {data.partnerAddresses!.map((addr) => (
                  <div key={addr.address_id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-semibold capitalize text-[var(--text-primary)]">
                        {addr.partner}
                      </p>
                      {addr.is_default && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                      {addr.label || addr.line1}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {[addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(", ")}
                    </p>
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
