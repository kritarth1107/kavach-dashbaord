"use client";
/**
 * A doctor's read-only view of the food and nutrition report (plan §N10). The family made this link on purpose; it
 * expires, can be turned off, and shows the person's name and the report only (no phone numbers).
 */
import { FilePdf, ForkKnife, LinkBreak } from "@phosphor-icons/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PrintSheet } from "@/components/care-os/care-kit";
import type { NutritionReport } from "@/components/care-os/nutrition-data";
import { NutritionReportView } from "@/components/care-os/nutrition-report";

type Shared = { person: { name: string }; days: number; sharedAt: string | null; expiresAt: string; report: NutritionReport };
type State = { status: "loading" } | { status: "ok"; data: Shared } | { status: "error"; message: string };

async function getShared(token: string): Promise<Shared> {
  const res = await fetch(`/api/public/nutrition/${encodeURIComponent(token)}`, { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as { data?: Shared; message?: string } | null;
  if (!res.ok || !json?.data) throw new Error(json?.message || "This link is not active");
  return json.data;
}

export default function PublicNutritionPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let off = false;
    getShared(token)
      .then((data) => !off && setState({ status: "ok", data }))
      .catch((e: unknown) => !off && setState({ status: "error", message: e instanceof Error ? e.message : "This link is not active" }));
    return () => {
      off = true;
    };
  }, [token]);

  return (
    <div className="care-os h-dvh overflow-y-auto">
      <main className="mx-auto w-full max-w-[900px] px-4 pb-10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--c-accent-text)]">
            <ForkKnife size={15} weight="fill" /> Kavach CareOS
          </p>
          {state.status === "ok" && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--c-solid)] px-4 text-[13px] font-medium text-[var(--c-on-solid)] hover:opacity-90"
            >
              <FilePdf size={16} weight="bold" /> Save as PDF
            </button>
          )}
        </div>

        {state.status === "loading" && (
          <div className="mt-4 space-y-3" aria-busy="true">
            <div className="h-[90px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
            <div className="h-[260px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
            <div className="h-[200px] animate-pulse rounded-[22px] bg-[var(--c-card)]" />
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-6 flex flex-col items-center rounded-[24px] bg-[var(--c-card)] px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-frame)]">
              <LinkBreak size={24} />
            </span>
            <h1 className="mt-4 text-[22px] font-medium tracking-[-0.02em]">This link is not active</h1>
            <p className="mt-2 max-w-sm text-[14px] text-[var(--c-ink-2)]">It has expired, or the family turned it off. Ask them for a new link.</p>
          </div>
        )}

        {state.status === "ok" && (
          <div className="mt-4">
            <NutritionReportView report={state.data.report} name={state.data.person.name} sharedAt={state.data.sharedAt} expiresAt={state.data.expiresAt} />
            <PrintSheet>
              <NutritionReportView report={state.data.report} name={state.data.person.name} sharedAt={state.data.sharedAt} />
            </PrintSheet>
          </div>
        )}
      </main>
    </div>
  );
}
