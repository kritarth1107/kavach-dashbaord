"use client";

import { Loader2, Shield, Users } from "lucide-react";
import { useState } from "react";
import {
  acceptInvitationById,
  rejectInvitationById,
  type PendingInvitation,
} from "@/lib/api";

type FamilyInvitationModalProps = {
  invites: PendingInvitation[];
  onResolved: () => Promise<void>;
};

export function FamilyInvitationModal({
  invites,
  onResolved,
}: FamilyInvitationModalProps) {
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  const invite = invites[0];
  if (!invite) return null;

  async function handleAccept() {
    setActing(true);
    setError("");
    try {
      await acceptInvitationById(invite.inviteId);
      await onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    setActing(true);
    setError("");
    try {
      await rejectInvitationById(invite.inviteId);
      await onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline invitation");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0f172a]/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-invite-title"
        className="relative w-full max-w-[420px] rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-8 py-9 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
      >
        <div className="mb-5 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
            <Users className="h-6 w-6 text-primary" strokeWidth={2} />
          </div>
        </div>

        <h2
          id="family-invite-title"
          className="text-center text-[20px] font-extrabold text-[var(--text-primary)]"
        >
          Family invitation
        </h2>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{invite.invitedByName}</span>{" "}
          invited you to join{" "}
          <span className="font-semibold text-[var(--text-primary)]">{invite.familyName}</span> as{" "}
          {invite.roleLabel.toLowerCase()}.
        </p>
        <p className="mt-2 text-center text-[12px] text-[var(--text-tertiary)]">
          Your current family stays as your primary workspace unless you switch later.
        </p>

        {invites.length > 1 && (
          <p className="mt-3 text-center text-[11px] font-medium text-[var(--text-secondary)]">
            {invites.length} pending invitations — respond to continue
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-[var(--danger-bg)] px-3 py-2 text-center text-[12px] text-[var(--danger-text)]">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={acting}
            onClick={() => void handleAccept()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[13px] font-bold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
          >
            {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept invitation"}
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={() => void handleReject()}
            className="w-full rounded-xl py-3 text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface)] disabled:opacity-60"
          >
            Decline
          </button>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
          <Shield className="h-3.5 w-3.5" strokeWidth={2} />
          Accept or decline to continue using the dashboard
        </p>
      </div>
    </div>
  );
}
