"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function AcceptInviteRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  useEffect(() => {
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    router.replace(`/auth/login${params.toString() ? `?${params}` : ""}`);
  }, [router, email]);

  return (
    <div className="relative flex min-h-full w-full items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-[400px] rounded-2xl border border-[#eef0f2] bg-white px-8 py-9 text-center shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="mt-4 text-[13px] text-[#6b7280]">
          Sign in with your email to accept the invitation.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 inline-block text-[13px] font-semibold text-primary hover:underline"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <AcceptInviteRedirect />
    </Suspense>
  );
}
