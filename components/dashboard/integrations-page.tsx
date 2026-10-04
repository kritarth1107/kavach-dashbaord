"use client";

import { ArrowRight, ArrowSquareOut, CheckCircle, Lightning, LockSimple, MapPin, Money, WhatsappLogo } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Panel, PanelTitle, Tag } from "@/components/care-os/ui";
import { useFamily } from "@/components/dashboard/family-context";
import { canApproveOrders } from "@/components/dashboard/family/family-data";
import { INTEGRATION_PARTNERS } from "@/components/dashboard/integrations-data";
import { usePerson } from "@/components/care-os/person-context";
import { getLogins, type ServiceLogin } from "@/lib/care-features-api";
import {
  disconnectMcp,
  getFamilyIntegrations,
  startMcpConnect,
  type FamilyIntegrations,
  type McpIntegrationPartner,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function partnerInfo(data: FamilyIntegrations, key: McpIntegrationPartner) {
  if (key === "swiggy") return data.swiggy;
  if (key === "instamart") return data.instamart;
  return data.zepto;
}

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

const APP_NAMES: Record<string, string> = {
  instamart: "Swiggy Instamart", zepto: "Zepto", blinkit: "Blinkit", bigbasket: "BigBasket", pharmeasy: "PharmEasy",
  uber: "Uber", ola: "Ola", rapido: "Rapido",
};

const LOGIN_TAG: Record<ServiceLogin["state"], { label: string; tone: "dark" | "light" | "accent" }> = {
  ok: { label: "Logged in", tone: "dark" },
  expired: { label: "Needs login", tone: "accent" },
  unknown: { label: "Not sure", tone: "light" },
};

function WebsiteLogins() {
  const { familyId, selectedId, isCaregiver } = usePerson();
  const [rows, setRows] = useState<ServiceLogin[] | null>(null);

  useEffect(() => {
    if (!familyId || !selectedId || !isCaregiver) return;
    let live = true;
    getLogins(familyId, selectedId)
      .then((r) => live && setRows(r.logins))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [familyId, selectedId, isCaregiver]);

  if (!isCaregiver || !rows) return null;
  return (
    <Panel>
      <PanelTitle title="Website logins" />
      <p className="mt-1 text-[12px] text-[var(--c-ink-3)]">What Saheli saw the last time it used each website. A login that ran out asks for an OTP on the next order.</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[var(--c-ink-2)]">Saheli has not used any website for this family yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--c-line)]">
          {rows.map((r) => (
            <li key={r.service} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium">{APP_NAMES[r.service] ?? r.service}</p>
                <p className="text-[11.5px] text-[var(--c-ink-3)]">
                  {[r.lastLoginOkAt && `Last worked ${shortDate(r.lastLoginOkAt)}`, r.state !== "ok" && r.problem].filter(Boolean).join(" · ") || "No successful login yet"}
                </p>
              </div>
              <Tag tone={LOGIN_TAG[r.state].tone}>{LOGIN_TAG[r.state].label}</Tag>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const RULES = [
  { icon: Money, title: "Cash on delivery", body: "Saheli never pays online. Every order is COD." },
  { icon: MapPin, title: "Saved addresses only", body: "Orders go to a place in your family address book." },
  { icon: CheckCircle, title: "Confirm before ordering", body: "Nothing is placed until someone replies “confirm”." },
];

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
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
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
    if (!window.confirm(`Disconnect ${title} for the whole family? Saheli will use the website instead, which asks for an OTP.`)) return;
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

  const connected = data ? INTEGRATION_PARTNERS.filter((p) => partnerInfo(data, p.key).connected).length : 0;
  const number = data?.whatsapp.kavachNumber ?? "+91 83109 05372";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 pb-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[40px] leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            <span className="block font-light text-[var(--c-ink-3)]">Connected</span>
            <span className="block font-medium">Apps</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] text-[var(--c-ink-2)]">
            Link your family&apos;s accounts once. Then anyone just asks Saheli on WhatsApp and replies “confirm”. No OTP each time.
          </p>
        </div>
      </div>

      {error && <p className="rounded-[14px] bg-[var(--c-accent-soft)] px-4 py-2.5 text-[13px] text-[var(--c-accent-soft-ink)]">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelTitle title="Delivery apps" right={data && <span className="text-[12px] text-[var(--c-ink-3)]">{connected} of {INTEGRATION_PARTNERS.length} linked</span>} />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {loading
                ? INTEGRATION_PARTNERS.map((p) => <div key={p.key} className="h-[230px] animate-pulse rounded-[20px] bg-[var(--c-frame)]" />)
                : INTEGRATION_PARTNERS.map((p) => {
                    const info = data ? partnerInfo(data, p.key) : null;
                    const on = Boolean(info?.connected);
                    const by = info?.connectedByMe ? "you" : info?.connectedByName;
                    return (
                      <div key={p.key} className="flex flex-col rounded-[20px] bg-[var(--c-frame)] p-4">
                        <div className="flex items-start justify-between">
                          <Image src={p.logoSrc} alt={p.title} width={56} height={56} className="h-14 w-14 rounded-[16px]" />
                          {on ? <Tag tone="dark">Linked</Tag> : <Tag tone="light">Not linked</Tag>}
                        </div>
                        <p className="mt-4 text-[16px] font-medium">{p.title}</p>
                        <p className="text-[12px] text-[var(--c-ink-2)]">{p.subtitle}</p>
                        <p className="mt-3 flex-1 text-[11.5px] leading-relaxed text-[var(--c-ink-3)]">
                          {on
                            ? [by && `Linked by ${by}`, shortDate(info?.connectedAt ?? null), info?.addressCount ? `${info.addressCount} saved address${info.addressCount === 1 ? "" : "es"}` : null]
                                .filter(Boolean)
                                .join(" · ")
                            : "Saheli can still order through the website, but it will ask for an OTP."}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                          {canManage && (
                            <button
                              type="button"
                              disabled={busyKey === p.key || !data}
                              onClick={() => void (on ? disconnect(p.key, p.title) : connect(p.key))}
                              className={cn(
                                "h-9 flex-1 rounded-full text-[12.5px] font-medium transition-colors disabled:opacity-50",
                                on ? "border border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-[#d92d20] hover:text-[#d92d20]" : "bg-[var(--c-ink)] text-white hover:opacity-90",
                              )}
                            >
                              {busyKey === p.key ? "…" : on ? "Disconnect" : "Connect"}
                            </button>
                          )}
                          <Link
                            href={p.href}
                            aria-label={`${p.title} details`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--c-line)] hover:bg-[var(--c-card)]"
                          >
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </Panel>

          <WebsiteLogins />

          <Panel>
            <PanelTitle title="How ordering works" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {RULES.map((r) => (
                <div key={r.title} className="rounded-[18px] bg-[var(--c-frame)] p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--c-line)]">
                    <r.icon size={17} />
                  </span>
                  <p className="mt-3 text-[13.5px] font-medium">{r.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--c-ink-2)]">{r.body}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel accent className="flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/80">Saheli on WhatsApp</p>
              <WhatsappLogo size={22} weight="fill" className="text-white" />
            </div>
            <p className="c-num mt-6 text-[26px] leading-none text-white">{number}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-white/85">Save this number. Your family messages Saheli here; nothing to set up.</p>
            <a
              href={`https://wa.me/${number.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-white px-4 text-[12.5px] font-medium text-[var(--c-ink)]"
            >
              Open chat <ArrowSquareOut size={13} />
            </a>
          </Panel>
          <Panel>
            <p className="flex items-center gap-2 text-[14px] font-medium">
              <Lightning size={16} className="text-[var(--c-accent)]" /> Linked vs not linked
            </p>
            <ul className="mt-3 space-y-2 text-[12.5px] text-[var(--c-ink-2)]">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-ink)]" /> Linked: Saheli orders straight from the app with live prices.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-ink-3)]" /> Not linked: Saheli uses the website and asks for a login OTP.
              </li>
            </ul>
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-[var(--c-ink-3)]">
              <LockSimple size={12} /> Your family&apos;s own accounts. Saheli only places cash-on-delivery orders.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
