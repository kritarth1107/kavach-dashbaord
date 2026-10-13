"use client";

import {
  Check,
  Copy,
  EnvelopeSimple,
  LinkSimple,
  Plus,
  WhatsappLogo,
  X,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  createInviteLink,
  getInvites,
  inviteShareText,
  revokeInviteLink,
  whatsappShareUrl,
  type InviteList,
  type InviteState,
  type InviteView,
} from "@/lib/invites-api";
import { cn } from "@/lib/utils";
import { ErrorNote, PageHeading } from "./feature-kit";
import { usePerson } from "./person-context";
import { Panel, PanelTitle, SmallButton, Tag } from "./ui";

/**
 * Invitations (founder 2026-10-13): Kavach is invite-only for now. Each person can make 5 one-time links in any 7 days,
 * one at a time when they click (never made in advance). Each link lets one family join, once, within 14 days.
 */

const IST = "Asia/Kolkata";
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST }) : "");
const dayTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: IST }) : "";

const STATE_TAG: Record<InviteState, { label: string; tone: "accent" | "dark" | "light" | "ok" }> = {
  active: { label: "Ready to share", tone: "accent" },
  used: { label: "Joined", tone: "ok" },
  expired: { label: "Expired", tone: "light" },
  revoked: { label: "Cancelled", tone: "light" },
};

const WHO = [
  "A friend whose parents live in another city",
  "A cousin keeping track of a parent's medicines",
  "A colleague caring for an ageing parent",
  "Someone who'd like reminders for themselves",
];

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // older browsers: a hidden textarea
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
  }, []);
  return { copied, copy };
}

function ShareButtons({ invite, firstName, copied, onCopy, big }: { invite: InviteView; firstName: string; copied: string | null; onCopy: (key: string, text: string) => void; big?: boolean }) {
  if (!invite.link) return null;
  const shareUrl = whatsappShareUrl(inviteShareText(invite.link, firstName));
  const isCopied = copied === invite.inviteId;
  const base = big ? "h-11 px-5 text-[13.5px]" : "h-8 px-3.5 text-[12px]";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={shareUrl}
        target="_blank"
        rel="noreferrer"
        className={cn("inline-flex items-center gap-1.5 rounded-full bg-[var(--c-solid)] font-medium text-[var(--c-on-solid)] transition-opacity hover:opacity-90", base)}
      >
        <WhatsappLogo size={big ? 18 : 14} weight="fill" /> Share on WhatsApp
      </a>
      <button
        type="button"
        onClick={() => onCopy(invite.inviteId, invite.link!)}
        className={cn("inline-flex items-center gap-1.5 rounded-full border border-[var(--c-line)] bg-[var(--c-frame)] font-medium transition-colors hover:bg-[var(--c-card)]", base)}
        aria-live="polite"
      >
        {isCopied ? <Check size={big ? 16 : 14} weight="bold" /> : <Copy size={big ? 16 : 14} weight="bold" />}
        {isCopied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function Slots({ used, limit }: { used: number; limit: number }) {
  return (
    <div className="mt-4 flex gap-1.5" aria-hidden>
      {Array.from({ length: limit }, (_, i) => (
        <span key={i} className={cn("h-2.5 flex-1 rounded-full", i < limit - used ? "bg-[var(--c-solid)]" : "bg-[var(--c-line)]")} />
      ))}
    </div>
  );
}

function Row({ invite, firstName, copied, onCopy, onRevoke, revoking }: {
  invite: InviteView;
  firstName: string;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
  onRevoke: (id: string) => void;
  revoking: boolean;
}) {
  const tag = STATE_TAG[invite.state];
  const icon: PhosphorIcon = invite.state === "used" ? Check : invite.state === "active" ? LinkSimple : X;
  const Icon = icon;
  const line =
    invite.state === "used"
      ? `${invite.usedByName || "Someone"} joined${invite.usedAt ? ` on ${day(invite.usedAt)}` : ""}`
      : invite.state === "active"
        ? `Made ${day(invite.createdAt)} · open until ${day(invite.expiresAt)}`
        : invite.state === "expired"
          ? `Made ${day(invite.createdAt)} · expired ${day(invite.expiresAt)}, unused`
          : `Made ${day(invite.createdAt)} · cancelled ${day(invite.revokedAt)}`;
  return (
    <li className="flex flex-col gap-3 rounded-[18px] bg-[var(--c-frame)] p-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            invite.state === "used" ? "bg-[var(--c-solid)] text-[var(--c-on-solid)]" : invite.state === "active" ? "bg-[var(--c-accent)] text-[var(--c-accent-ink)]" : "border border-[var(--c-line)] text-[var(--c-ink-3)]",
          )}
        >
          <Icon size={17} weight={invite.state === "active" ? "bold" : "regular"} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Tag tone={tag.tone}>{tag.label}</Tag>
          </div>
          <p className={cn("mt-1 truncate text-[13px]", invite.state === "used" ? "font-medium" : "text-[var(--c-ink-2)]")}>{line}</p>
        </div>
      </div>
      {invite.state === "active" && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <ShareButtons invite={invite} firstName={firstName} copied={copied} onCopy={onCopy} />
          <SmallButton onClick={() => onRevoke(invite.inviteId)} disabled={revoking} title="Cancel this link so nobody can use it">
            {revoking ? "Cancelling" : "Cancel"}
          </SmallButton>
        </div>
      )}
    </li>
  );
}

export function InvitationsPage() {
  const { me } = usePerson();
  const firstName = me.name.split(" ")[0] || "";
  const [data, setData] = useState<InviteList | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<InviteView | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  const load = useCallback(async () => {
    try {
      setData(await getInvites());
      setLoadError("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load your invites");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function create() {
    setCreating(true);
    setError("");
    try {
      const r = await createInviteLink();
      setFresh(r.invite);
      setData((d) => (d ? { ...d, quota: r.quota, invites: [r.invite, ...d.invites] } : d));
    } catch (err) {
      if (err instanceof ApiError && err.code === "invite_limit") {
        const next = typeof err.data?.nextSlotAt === "string" ? err.data.nextSlotAt : null;
        setError(`You've used this week's invites. ${next ? `Your next one opens ${dayTime(next)}.` : "More open up soon."}`);
        void load();
      } else {
        setError(err instanceof Error ? err.message : "Couldn't make a link. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    setRevoking(id);
    setError("");
    try {
      const v = await revokeInviteLink(id);
      setData((d) => (d ? { ...d, invites: d.invites.map((x) => (x.inviteId === id ? v : x)) } : d));
      if (fresh?.inviteId === id) setFresh(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cancel this link");
    } finally {
      setRevoking(null);
    }
  }

  const quota = data?.quota;
  const left = quota?.left ?? 0;
  const limit = quota?.limit ?? data?.perWeek ?? 5;
  const joined = data?.invites.filter((i) => i.state === "used").length ?? 0;
  const validDays = data?.validDays ?? 14;

  return (
    <div className="space-y-4">
      <PageHeading
        light="Invite"
        dark="families"
        sub="Kavach is invite-only for now, and every family on it came through someone who cares. If you know a family who'd be glad of Saheli, send them a link."
        right={
          <button
            type="button"
            onClick={() => void create()}
            disabled={creating || !data || left <= 0}
            className="inline-flex h-12 items-center gap-3 self-start rounded-full bg-[var(--c-solid)] pl-5 pr-1.5 text-[14px] font-medium text-[var(--c-on-solid)] transition-opacity hover:opacity-90 disabled:opacity-40 lg:self-auto"
          >
            {creating ? "Making your link" : "Create invite link"}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c-frame)] text-[var(--c-ink)]">
              <Plus size={16} weight="bold" />
            </span>
          </button>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}
      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {fresh?.link && (
            <Panel className="border border-[var(--c-line)] bg-[var(--c-frame)]">
              <PanelTitle title="Your new link is ready" />
              <p className="mt-2 text-[13px] text-[var(--c-ink-2)]">
                It works for one family, once, and stays open for {validDays} days. Send it to them personally.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-[var(--c-card)] px-4 py-3">
                <LinkSimple size={16} className="shrink-0 text-[var(--c-ink-3)]" />
                <code className="min-w-0 flex-1 truncate font-mono text-[12.5px]" title={fresh.link}>{fresh.link}</code>
              </div>
              <div className="mt-4">
                <ShareButtons invite={fresh} firstName={firstName} copied={copied} onCopy={copy} big />
              </div>
              <p className="mt-3 text-[12px] text-[var(--c-ink-3)]">
                They can tap it to start with Saheli on WhatsApp right away, or sign up here on the dashboard.
              </p>
            </Panel>
          )}

          <Panel>
            <PanelTitle title="Your invite links" right={data ? <span className="text-[12px] text-[var(--c-ink-3)]">{data.invites.length} made</span> : null} />
            {!data && !loadError ? (
              <div className="mt-3 h-[180px] animate-pulse rounded-[18px] bg-[var(--c-frame)]" />
            ) : data && data.invites.length === 0 ? (
              <div className="mt-3 flex flex-col items-center rounded-[18px] bg-[var(--c-frame)] px-6 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-card)]">
                  <EnvelopeSimple size={24} />
                </span>
                <p className="mt-4 text-[17px] font-medium">No links yet</p>
                <p className="mt-1 max-w-sm text-[13px] text-[var(--c-ink-2)]">
                  Make one when you have someone in mind. Links are made one at a time, and each one welcomes one family.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {data?.invites.map((inv) => (
                  <Row key={inv.inviteId} invite={inv} firstName={firstName} copied={copied} onCopy={copy} onRevoke={(id) => void revoke(id)} revoking={revoking === inv.inviteId} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--c-ink-2)]">Invites left this week</p>
            <p className="c-num mt-4 text-[56px] leading-none">
              {data ? left : "–"}
              <span className="text-[var(--c-ink-3)]">/{limit}</span>
            </p>
            {data && <Slots used={quota?.used ?? 0} limit={limit} />}
            <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--c-ink-2)]">
              {data && left <= 0 && quota?.nextSlotAt
                ? `You've shared all ${limit} this week. Your next invite opens ${dayTime(quota.nextSlotAt)}.`
                : `You can make ${limit} links in any 7 days. Each works once and stays open ${validDays} days.`}
            </p>
            {joined > 0 && (
              <p className="mt-3 rounded-[14px] bg-[var(--c-solid-soft)] px-3.5 py-2.5 text-[12.5px] font-medium text-[var(--c-ink)]">
                {joined === 1 ? "1 family has joined through you. Thank you." : `${joined} families have joined through you. Thank you.`}
              </p>
            )}
          </Panel>
          <Panel>
            <PanelTitle title="Who might need Saheli?" />
            <ul className="mt-3 space-y-2 text-[12.5px] text-[var(--c-ink-2)]">
              {WHO.map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--c-ink-3)]">
              Your link lets them skip the waitlist. Saheli greets them on WhatsApp and helps them set up in a few minutes.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
