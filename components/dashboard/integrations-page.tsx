"use client";

import { ChevronRight, Loader2, MessageCircle, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";
import { INTEGRATION_PARTNERS } from "@/components/dashboard/integrations-data";
import {
  disconnectMcp,
  getFamilyIntegrations,
  startMcpConnect,
  type FamilyIntegrations,
  type McpIntegrationPartner,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        connected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text-secondary)]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-500" : "bg-[var(--text-tertiary)]")} />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

function PartnerOverviewCard({
  title,
  subtitle,
  logoSrc,
  href,
  connected,
  addressCount,
  connectedAt,
  linkedBy,
  canManage,
  busy,
  onConnect,
  onDisconnect,
}: {
  title: string;
  subtitle: string;
  logoSrc: string;
  href: string;
  connected: boolean;
  addressCount?: number;
  connectedAt: string | null;
  linkedBy?: string | null;
  canManage: boolean;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="panel-card flex items-center gap-3 p-5 transition-colors hover:border-primary/30">
      <Link href={href} className="group flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <Image src={logoSrc} alt={title} width={44} height={44} className="h-11 w-11 object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-extrabold text-[var(--text-primary)]">{title}</h2>
            <ConnectionDot connected={connected} />
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{subtitle}</p>
          {connected ? (
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              {linkedBy ? `Linked by ${linkedBy}` : "Linked"}
              {connectedAt
                ? ` · ${new Date(connectedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                : null}
              {typeof addressCount === "number" && addressCount > 0
                ? ` · ${addressCount} store address${addressCount === 1 ? "" : "es"}`
                : null}
              {" · WhatsApp orders without OTP"}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              Not linked — Saheli uses the website instead (asks for an OTP).
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
      {canManage && (
        <button
          type="button"
          disabled={busy}
          onClick={connected ? onDisconnect : onConnect}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold disabled:opacity-50",
            connected
              ? "border border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-red-300 hover:text-red-600"
              : "bg-primary text-white",
          )}
        >
          {connected ? "Disconnect" : "Connect"}
        </button>
      )}
    </div>
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

function partnerInfo(data: FamilyIntegrations, key: McpIntegrationPartner) {
  if (key === "swiggy") return data.swiggy;
  if (key === "instamart") return data.instamart;
  return data.zepto;
}

export function IntegrationsPage() {
  const { activeFamilyId, activeFamily } = useFamily();
  const [data, setData] = useState<FamilyIntegrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<McpIntegrationPartner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = canApproveOrders(activeFamily?.role);

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

  async function connect(key: McpIntegrationPartner) {
    if (!activeFamilyId) return;
    setBusyKey(key);
    setError(null);
    try {
      const { data: result } = await startMcpConnect(activeFamilyId, key);
      if (result?.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusyKey(null);
    }
  }

  async function disconnect(key: McpIntegrationPartner, title: string) {
    if (!activeFamilyId) return;
    if (!window.confirm(`Disconnect ${title} for the whole family? Saheli will fall back to the website, which asks for an OTP.`)) return;
    setBusyKey(key);
    setError(null);
    try {
      await disconnectMcp(activeFamilyId, key);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setBusyKey(null);
    }
  }

  const connectedCount =
    data && [data.zepto, data.swiggy, data.instamart].filter((p) => p.connected).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)]">Integrations</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          Link your family&apos;s Swiggy (Food + Instamart) and Zepto accounts once. After that your family
          member just asks Saheli on WhatsApp, picks an option and replies &quot;confirm&quot; — no OTP. Always
          Cash on Delivery, always to a place in your family address book.
        </p>
      </div>

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

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-700">{error}</p>
          )}
          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Order delivery
            </h2>
            {INTEGRATION_PARTNERS.map((partner) => {
              const info = partnerInfo(data, partner.key);
              return (
                <PartnerOverviewCard
                  key={partner.key}
                  title={partner.title}
                  subtitle={partner.subtitle}
                  logoSrc={partner.logoSrc}
                  href={partner.href}
                  connected={info.connected}
                  addressCount={info.addressCount}
                  connectedAt={info.connectedAt}
                  linkedBy={info.connectedByMe ? "you" : info.connectedByName}
                  canManage={canManage}
                  busy={busyKey === partner.key}
                  onConnect={() => void connect(partner.key)}
                  onDisconnect={() => void disconnect(partner.key, partner.title)}
                />
              );
            })}
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Message Saheli
            </h2>
            <WhatsAppCard info={data.whatsapp} />
          </section>
        </>
      )}
    </div>
  );
}
