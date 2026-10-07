"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getMe } from "@/lib/api";
import { setStoredFamilyId } from "@/lib/family-storage";

class CareRecipientLogin extends Error {}

async function ensureSessionCookie() {
  const res = await fetch("/api/auth/establish-session", {
    method: "POST",
    credentials: "include",
  });

  if (res.status === 401) {
    return false;
  }

  if (res.status === 403) {
    throw new CareRecipientLogin();
  }

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(json?.message ?? "Failed to establish session");
  }

  return true;
}

export function PostLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      try {
        await ensureSessionCookie();

        const { data } = await getMe();
        if (!data?.user?.userId) {
          router.replace("/auth/login");
          return;
        }

        if (data.requiresInvitationAction) {
          router.replace("/auth/pending-invite");
          return;
        }

        if (data.activeFamilyId) {
          setStoredFamilyId(data.activeFamilyId, data.user.userId);
        }

        // A new caregiver tells Saheli about their family first; everyone else goes straight in.
        router.replace(data.user.onboardingRequired ? "/onboarding" : "/dashboard");
      } catch (err) {
        router.replace(err instanceof CareRecipientLogin ? "/auth/login?error=care_recipient" : "/auth/login");
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
