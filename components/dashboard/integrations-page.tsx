"use client";

import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plug,
  ShoppingBag,
  Smartphone,
  Speaker,
  UtensilsCrossed,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";
import {
  disconnectMcp,
  getFamilyIntegrations,
  startMcpConnect,
  type FamilyIntegrations,
  type McpIntegrationInfo,
  type McpIntegrationPartner,
} from "@/lib/api";

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[var(--input-bg)] px-2.5 py-1 text-[10px] font-bold capitalize text-[var(--text-secondary)]">
      {label.replace(/_/g, " ")}
    </span>
  );
}

function McpPartnerCard({
  title,
  icon: Icon,
  partner,
  info,
  canConnect,
  busy,
  onConnect,
  onDisconnect,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  partner: McpIntegrationPartner;
  info: McpIntegrationInfo;
  canConnect: boolean;
  busy: boolean;
  onConnect: (partner: McpIntegrationPartner) => void;
  onDisconnect: (partner: McpIntegrationPartner) => void;
}) {
  return (
    <div className="panel-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-bold text-[var(--text-primary)]">{title}</h2>
        </div>
        <StatusPill label={info.status} />
      </div>
      <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">{info.description}</p>
      {info.connected && info.connectedAt && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Connected {new Date(info.connectedAt).toLocaleString("en-IN")}
        </p>
      )}
      <p className="mt-3 text-[11px] text-[var(--text-tertiary)]">
        MCP: {info.mcpUrl ?? "—"}
      </p>
      <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
        Redirect URI: {info.redirectUri}
      </p>
      <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{info.paymentNote}</p>
      {canConnect && (
        <div className="mt-4 flex flex-wrap gap-2">
          {!info.connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onConnect(partner)}
              className="rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50"
            >
              Connect {title} account
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onDisconnect(partner)}
              className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)]"
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
            MCP docs <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

const OAUTH_PARTNERS: McpIntegrationPartner[] = ["zepto", "swiggy", "instamart"];

export function IntegrationsPage() {
  const { activeFamilyId, activeFamily } = useFamily();
  const searchParams = useSearchParams();
  const [data, setData] = useState<FamilyIntegrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
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
        setBanner(`${partner === "instamart" ? "Instamart" : partner === "swiggy" ? "Swiggy" : "Zepto"} connected successfully.`);
        break;
      }
      if (result === "error") {
        setBanner(
          message
            ? decodeURIComponent(message)
            : `${partner} connection failed.`,
        );
        break;
      }
    }
  }, [searchParams]);

  async function handleConnect(partner: McpIntegrationPartner) {
    if (!activeFamilyId || !canConnect) return;
    setBusy(true);
    setBanner("");
    try {
      const { data: result } = await startMcpConnect(activeFamilyId, partner);
      if (result?.connected) {
        setBanner("Already connected.");
        await load();
        return;
      }
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setBanner("Could not start OAuth. Check redirect URI whitelist.");
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect(partner: McpIntegrationPartner) {
    if (!activeFamilyId || !canConnect) return;
    setBusy(true);
    try {
      await disconnectMcp(activeFamilyId, partner);
      setBanner("Disconnected.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel-card p-5">
        <h1 className="text-[18px] font-extrabold text-[var(--text-primary)]">Integrations</h1>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
          Connect partner MCP services — Zepto, Swiggy Food, and Instamart use official OAuth MCP
          servers
        </p>
      </div>

      {banner && (
        <div className="rounded-xl border border-primary/30 bg-primary-light px-4 py-3 text-[12px] text-primary">
          {banner}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <p className="py-12 text-center text-[13px] text-[var(--text-tertiary)]">
          Select a family to view integrations.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <McpPartnerCard
            title="Zepto"
            icon={Plug}
            partner="zepto"
            info={data.zepto}
            canConnect={canConnect}
            busy={busy}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          <McpPartnerCard
            title="Swiggy Food"
            icon={UtensilsCrossed}
            partner="swiggy"
            info={data.swiggy}
            canConnect={canConnect}
            busy={busy}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          <McpPartnerCard
            title="Instamart"
            icon={ShoppingBag}
            partner="instamart"
            info={data.instamart}
            canConnect={canConnect}
            busy={busy}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />

          <div className="panel-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <h2 className="text-[15px] font-bold text-[var(--text-primary)]">WhatsApp</h2>
              </div>
              <StatusPill label={data.whatsapp.status} />
            </div>
            <p className="text-[12px] text-[var(--text-secondary)]">{data.whatsapp.description}</p>
          </div>

          <div className="panel-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Phone (mock)</h2>
              <StatusPill label={data.phone.status} />
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">{data.phone.webhook}</p>
          </div>

          <div className="panel-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Speaker className="h-4 w-4 text-primary" />
                <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Smart speaker</h2>
              </div>
              <StatusPill label={data.smartSpeaker.status} />
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">{data.smartSpeaker.webhook}</p>
          </div>
        </div>
      )}
    </div>
  );
}
