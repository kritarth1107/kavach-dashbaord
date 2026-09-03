"use client";

import { CheckCircle2, ExternalLink, Loader2, Plug, Smartphone, Speaker } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";
import {
  disconnectZepto,
  getFamilyIntegrations,
  startZeptoConnect,
  type FamilyIntegrations,
} from "@/lib/api";

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[var(--input-bg)] px-2.5 py-1 text-[10px] font-bold capitalize text-[var(--text-secondary)]">
      {label.replace(/_/g, " ")}
    </span>
  );
}

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
    const zepto = searchParams.get("zepto");
    const message = searchParams.get("message");
    if (zepto === "connected") {
      setBanner("Zepto connected successfully.");
    } else if (zepto === "error") {
      setBanner(message ? decodeURIComponent(message) : "Zepto connection failed.");
    }
  }, [searchParams]);

  async function handleConnect() {
    if (!activeFamilyId || !canConnect) return;
    setBusy(true);
    setBanner("");
    try {
      const { data: result } = await startZeptoConnect(activeFamilyId);
      if (result?.connected) {
        setBanner("Zepto is already connected.");
        await load();
        return;
      }
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setBanner("Could not start Zepto OAuth. Check redirect URI whitelist.");
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!activeFamilyId || !canConnect) return;
    setBusy(true);
    try {
      await disconnectZepto(activeFamilyId);
      setBanner("Zepto disconnected.");
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
          Connect partner services — Zepto uses the official MCP at mcp.zepto.co.in
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
          <div className="panel-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-primary" />
                <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Zepto</h2>
              </div>
              <StatusPill label={data.zepto.status} />
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
              {data.zepto.description}
            </p>
            {data.zepto.connected && data.zepto.connectedAt && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected {new Date(data.zepto.connectedAt).toLocaleString("en-IN")}
              </p>
            )}
            <p className="mt-3 text-[11px] text-[var(--text-tertiary)]">
              Redirect URI: {data.zepto.redirectUri}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{data.zepto.paymentNote}</p>
            {canConnect && (
              <div className="mt-4 flex flex-wrap gap-2">
                {!data.zepto.connected ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleConnect()}
                    className="rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    Connect Zepto account
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDisconnect()}
                    className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)]"
                  >
                    Disconnect
                  </button>
                )}
                <a
                  href={data.zepto.partnerTrack}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)]"
                >
                  Whitelist help <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

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
