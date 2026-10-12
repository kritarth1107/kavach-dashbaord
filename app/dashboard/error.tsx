"use client";

import { WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/lib/client-errors";

/**
 * A dashboard page that fails keeps the frame (menu, person switcher) and says so, instead of Next's blank
 * "This page couldn't load" screen; the error goes to the server log.
 */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportClientError(error, "page"), [error]);
  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-[24px] bg-[var(--c-card)] p-6 text-center">
      <WarningCircle size={32} className="mx-auto text-[var(--c-accent-text)]" />
      <h1 className="mt-3 text-[20px] font-medium">This page couldn&apos;t load</h1>
      <p className="mt-2 text-[13px] text-[var(--c-ink-2)]">Nothing was changed. Try again, or open another page; we have been told about it.</p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={() => retry()} className="inline-flex h-10 items-center rounded-full bg-[var(--c-solid)] px-5 text-[13px] font-medium text-[var(--c-on-solid)]">
          Try again
        </button>
        <Link href="/dashboard" className="inline-flex h-10 items-center rounded-full border border-[var(--c-line)] px-5 text-[13px] font-medium">
          Home
        </Link>
      </div>
    </div>
  );
}
