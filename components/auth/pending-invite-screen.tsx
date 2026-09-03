"use client";

import { Loader2, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  acceptInvitationById,
  getMe,
  rejectInvitationById,
  type PendingInvitation,
} from "@/lib/api";
import { setStoredFamilyId } from "@/lib/family-storage";

export function PendingInviteScreen() {
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMe()
      .then(({ data }) => {
        if (!data) throw new Error("Failed to load session");
        if (data.requiresInvitationAction && data.pendingInvitations?.length) {
          setInvites(data.pendingInvitations);
        } else {
          router.replace("/dashboard");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load invitation");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleAccept(invite: PendingInvitation) {
    setActing(true);
    setError("");
    try {
      const { data } = await acceptInvitationById(invite.inviteId);
      const me = await getMe();
      const familyId = data?.activeFamilyId ?? me.data?.activeFamilyId;
      const userId = me.data?.user?.userId;
      if (familyId && userId) {
        setStoredFamilyId(familyId, userId);
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      setActing(false);
    }
  }

  async function handleReject(invite: PendingInvitation) {
    setActing(true);
    setError("");
    try {
      await rejectInvitationById(invite.inviteId);
      const me = await getMe();
      const familyId = me.data?.activeFamilyId;
      const userId = me.data?.user?.userId;
      if (familyId && userId) {
        setStoredFamilyId(familyId, userId);
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decline invitation");
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const invite = invites[0];

  if (!invite) {
    return null;
  }

  return (
    <div className="relative flex min-h-full w-full items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-[420px] rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] px-8 py-9 shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-5 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
            <Users className="h-6 w-6 text-primary" strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-center text-[20px] font-extrabold text-[var(--text-primary)]">
          Family invitation
        </h1>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{invite.invitedByName}</span>{" "}
          invited you to join{" "}
          <span className="font-semibold text-[var(--text-primary)]">{invite.familyName}</span> as{" "}
          {invite.roleLabel.toLowerCase()}.
        </p>

        {error && (
          <p className="mt-4 rounded-xl bg-[var(--danger-bg)] px-3 py-2 text-center text-[12px] text-[var(--danger-text)]">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={acting}
            onClick={() => void handleAccept(invite)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[13px] font-bold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
          >
            {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept & join family"}
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={() => void handleReject(invite)}
            className="w-full rounded-xl py-3 text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface)] disabled:opacity-60"
          >
            Decline invitation
          </button>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
          <Shield className="h-3.5 w-3.5" strokeWidth={2} />
          If you decline, we&apos;ll create your own family to get started
        </p>
      </div>
    </div>
  );
}
