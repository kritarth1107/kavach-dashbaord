"use client";

import {
  Check,
  ExternalLink,
  Loader2,
  MessageCircle,
  Phone,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";
import {
  disconnectMcp,
  getFamilyIntegrations,
  getFamilyMembers,
  linkChannelIdentity,
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

function ServiceRow({
  label,
  description,
  connected,
  connectedAt,
  canConnect,
  busy,
  onConnect,
  onDisconnect,
}: {
  label: string;
  description: string;
  connected: boolean;
  connectedAt: string | null;
  canConnect: boolean;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-strong)] pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
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
            Linked {new Date(connectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
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
            <button
              type="button"
              disabled={busy}
              onClick={onDisconnect}
              className="rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)] hover:border-red-300 hover:text-red-600"
            >
              Disconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PartnerCard({
  icon: Icon,
  title,
  subtitle,
  children,
  pill,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
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
      icon={Zap}
      title="Zepto"
      subtitle="10-minute grocery delivery when Swiggy isn't connected."
      pill={
        <ConnectionPill state={info.connected ? "connected" : "disconnected"} />
      }
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
}: {
  food: McpIntegrationInfo;
  groceries: McpIntegrationInfo;
  canConnect: boolean;
  busy: boolean;
  onConnect: (partner: McpIntegrationPartner) => void;
  onDisconnect: (partner: McpIntegrationPartner) => void;
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
      icon={UtensilsCrossed}
      title="Swiggy"
      subtitle="One account for restaurant orders and Instamart groceries. Saheli picks the right service automatically."
      pill={<ConnectionPill state={overall} label={pillLabel} />}
    >
      <ServiceRow
        label="Swiggy Food"
        description="Order meals and restaurant food for your parent."
        connected={foodOn}
        connectedAt={food.connectedAt}
        canConnect={canConnect}
        busy={busy}
        onConnect={() => onConnect("swiggy")}
        onDisconnect={() => onDisconnect("swiggy")}
      />
      <ServiceRow
        label="Instamart"
        description="Groceries, essentials, and household items — delivered fast."
        connected={groceryOn}
        connectedAt={groceries.connectedAt}
        canConnect={canConnect}
        busy={busy}
        onConnect={() => onConnect("instamart")}
        onDisconnect={() => onDisconnect("instamart")}
      />
      <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
        Food and groceries use separate Swiggy sign-ins. Connect both so Saheli can order khana or doodh from chat.
      </p>
    </PartnerCard>
  );
}

function WhatsAppCard({
  familyId,
  info,
  canConnect,
  busy,
  members,
  onLinked,
}: {
  familyId: string;
  info: FamilyIntegrations["whatsapp"];
  canConnect: boolean;
  busy: boolean;
  members: Array<{ userId: string; name: string; role: string }>;
  onLinked: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [memberUserId, setMemberUserId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  const linkableMembers = members.filter((m) => m.userId);

  async function handleLink() {
    if (!memberUserId || !phone.trim()) return;
    setLinkError(null);
    const member = linkableMembers.find((m) => m.userId === memberUserId);
    if (!member) return;
    try {
      await linkChannelIdentity(familyId, {
        channelType: "whatsapp",
        channelIdentifier: phone.trim(),
        userId: memberUserId,
        role: member.role,
        label: member.name,
      });
      setPhone("");
      onLinked();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Could not link number");
    }
  }

  const status = info.status;
  const connected = status === "baileys_connected";

  return (
    <div className="panel-card overflow-hidden sm:col-span-2">
      <div className="flex gap-4 border-b border-[var(--border-strong)] p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <MessageCircle className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-bold text-[var(--text-primary)]">WhatsApp</h2>
            <ConnectionPill
              state={connected ? "connected" : status === "baileys_disconnected" ? "partial" : "disconnected"}
              label={connected ? "Pilot live" : status === "baileys_disconnected" ? "Bridge offline" : "Setup needed"}
            />
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{info.description}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        {info.identities.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Linked numbers
            </p>
            {info.identities.map((row) => (
              <div
                key={row.identifier}
                className="flex items-center justify-between rounded-xl border border-[var(--border-strong)] px-3 py-2"
              >
                <div>
                  <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {row.label || row.identifier}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    {row.identifier} · {row.role.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--text-secondary)]">
            Link your parent&apos;s or caregiver&apos;s WhatsApp number so Saheli can chat with them here.
          </p>
        )}

        {canConnect && (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <select
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-[12px]"
            >
              <option value="">Family member</option>
              {linkableMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.role.replace(/_/g, " ").toLowerCase()})
                </option>
              ))}
            </select>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--input-bg)] px-3 py-2 text-[12px]"
            />
            <button
              type="button"
              disabled={busy || !phone.trim() || !memberUserId}
              onClick={() => void handleLink()}
              className="rounded-full bg-primary px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50"
            >
              Link
            </button>
          </div>
        )}
        {linkError && <p className="text-[12px] text-red-600">{linkError}</p>}
      </div>
    </div>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  description,
  status,
  comingSoon,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  status: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="panel-card flex gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--input-bg)] text-[var(--text-secondary)]">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[14px] font-bold text-[var(--text-primary)]">{title}</h2>
          <ConnectionPill
            state={comingSoon ? "disconnected" : "disconnected"}
            label={comingSoon ? "Coming soon" : status.replace(/_/g, " ")}
          />
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
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
  const [members, setMembers] = useState<Array<{ userId: string; name: string; role: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const canConnect = canApproveOrders(activeFamily?.role);

  const load = useCallback(async () => {
    if (!activeFamilyId) {
      setData(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: integrations }, membersRes] = await Promise.all([
        getFamilyIntegrations(activeFamilyId),
        getFamilyMembers(activeFamilyId),
      ]);
      setData(integrations ?? null);
      setMembers(
        (membersRes.data?.members ?? [])
          .filter((m) => m.userId && m.status === "JOINED")
          .map((m) => ({
            userId: m.userId as string,
            name: m.name ?? "Family member",
            role: m.role,
          })),
      );
    } catch {
      setData(null);
      setMembers([]);
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
          text: `${PARTNER_LABELS[partner]} connected — syncing saved addresses and enabling orders for Saheli.`,
        });
        if (activeFamilyId) {
          void syncPartnerAddresses(activeFamilyId, partner).then(() => load());
        }
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
  }, [searchParams]);

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
    data &&
    [data.zepto, data.swiggy, data.instamart].filter((p) => p.connected).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)]">Integrations</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          Connect delivery partners so Saheli can suggest orders from chat. Your family approves every basket before
          checkout.
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
          {banner.type === "success" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
          ) : null}
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
                {connectedCount} delivery {connectedCount === 1 ? "partner" : "partners"} connected — ask Saheli to
                order groceries or food in chat.
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
              Stay in touch
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeFamilyId && (
                <WhatsAppCard
                  familyId={activeFamilyId}
                  info={data.whatsapp}
                  canConnect={canConnect}
                  busy={busy}
                  members={members}
                  onLinked={() => void load()}
                />
              )}
              <ChannelCard
                icon={Phone}
                title="Phone & voice"
                description="Call or smart-speaker check-ins — same Saheli, hands-free for your parent."
                status={data.phone.status}
                comingSoon
              />
            </div>
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

          {data.recentOrders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Recent orders
              </h2>
              <div className="panel-card divide-y divide-[var(--border-strong)]">
                {data.recentOrders.slice(0, 5).map((o) => (
                  <div key={o.order_id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <div>
                        <p className="text-[12px] font-semibold capitalize text-[var(--text-primary)]">
                          {o.partner?.replace(/_/g, " ") ?? "Order"}
                        </p>
                        <p className="text-[11px] capitalize text-[var(--text-tertiary)]">
                          {o.status.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">
                      ₹{(o.total_paise / 100).toFixed(0)}
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
