/**
 * Invite links (the Invitations page), the public join page and the waitlist form. Kavach is invite-only for now:
 * a new account needs a one-time invite link (or an approved waitlist entry); anyone else joins the waitlist.
 */
import { ApiError, SERVER_FAILED_MESSAGE } from "./api";

export type InviteState = "active" | "used" | "expired" | "revoked";

export type InviteView = {
  inviteId: string;
  state: InviteState;
  createdAt: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  usedByName: string | null;
  revokedAt: string | null;
  /** Only while the link can still be used. The friend signs up on the web with it, then meets Saheli on WhatsApp. */
  link: string | null;
};

export type InviteQuota = { limit: number; used: number; left: number; nextSlotAt: string | null };

export type InviteList = { quota: InviteQuota; invites: InviteView[]; perWeek: number; validDays: number };

export type PublicInvite = {
  state: InviteState | "invalid";
  kind: "user" | "waitlist" | null;
  inviterName: string | null;
  expiresAt: string | null;
  saheliNumber: string;
};

export type WaitlistInput = { name: string; email: string; phone?: string; phoneCountryCode?: string; note?: string };

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as { data?: T; message?: string; code?: string; data_?: unknown } | null;
  if (!res.ok) {
    throw new ApiError(res.status >= 500 ? SERVER_FAILED_MESSAGE : json?.message || `Request failed (${res.status})`, res.status, json?.code, (json?.data as Record<string, unknown>) ?? undefined);
  }
  return (json?.data ?? null) as T;
}

const post = (url: string, body: unknown = {}) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });

export async function getInvites(): Promise<InviteList> {
  return parse<InviteList>(await fetch("/api/invites", { credentials: "include", cache: "no-store" }));
}

/** One new link, made now. */
export async function createInviteLink(): Promise<{ invite: InviteView; quota: InviteQuota }> {
  return parse(await post("/api/invites"));
}

export async function revokeInviteLink(inviteId: string): Promise<InviteView> {
  return parse(await post(`/api/invites/${encodeURIComponent(inviteId)}/revoke`));
}

/** Public: what the join page shows for a link. */
export async function lookupInvite(token: string): Promise<PublicInvite> {
  return parse<PublicInvite>(await fetch(`/api/public/invite/${encodeURIComponent(token)}`, { cache: "no-store" }));
}

/** Public: join the waitlist. */
export async function joinWaitlist(input: WaitlistInput): Promise<void> {
  await parse(await post("/api/waitlist", input));
}

/* ── the invite travels through sign-in (email, mobile, Google) ─────────── */

export const INVITE_COOKIE = "kavach_invite";
const TOKEN_RE = /^[0-9A-Za-z]{26}$/;

export function rememberInvite(token: string) {
  if (!TOKEN_RE.test(token)) return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${INVITE_COOKIE}=${token}; path=/; max-age=86400; samesite=lax${secure}`;
}

export function readInvite(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${INVITE_COOKIE}=([0-9A-Za-z]{26})`));
  return m ? m[1] : null;
}

export function forgetInvite() {
  if (typeof document === "undefined") return;
  document.cookie = `${INVITE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** The backend's reasons for "no account without an invite": each one opens the waitlist form. */
export const INVITE_DENY_CODES = ["invite_required", "invite_used", "invite_expired", "invite_revoked", "invite_invalid"] as const;
export type InviteDenyCode = (typeof INVITE_DENY_CODES)[number];
export const isInviteDenyCode = (code: unknown): code is InviteDenyCode =>
  typeof code === "string" && (INVITE_DENY_CODES as readonly string[]).includes(code);

export const INVITE_DENY_COPY: Record<InviteDenyCode, string> = {
  invite_required: "Kavach is invite-only for now. Join the waitlist and we'll let you in soon.",
  invite_used: "This invite link has already been used. Ask for a new one, or join the waitlist.",
  invite_expired: "This invite link has expired. Ask for a new one, or join the waitlist.",
  invite_revoked: "This invite link was cancelled. Ask for a new one, or join the waitlist.",
  invite_invalid: "This invite link isn't valid. Check the link, or join the waitlist.",
};

/** What a friend receives when the link is shared on WhatsApp: they sign up and set up on the web, then meet Saheli. */
export function inviteShareText(link: string, inviterFirstName?: string) {
  const from = inviterFirstName ? `${inviterFirstName} here. ` : "";
  return `${from}I use Kavach to look after my family. Saheli, its companion on WhatsApp, reminds parents of their medicines and checks in every day, in their language. Here's a personal invite for you (it works once). You set up on the web in a few minutes, then meet Saheli on WhatsApp: ${link}`;
}

export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
