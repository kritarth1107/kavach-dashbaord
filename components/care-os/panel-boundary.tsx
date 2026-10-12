"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { catchError, type ErrorInfo } from "next/error";
import { useEffect } from "react";
import { reportClientError } from "@/lib/client-errors";
import { Panel, SmallButton } from "./ui";

function Reported({ error, where }: { error: unknown; where: string }) {
  useEffect(() => reportClientError(error, where), [error, where]);
  return null;
}

function PanelFallback({ name, className }: { name: string; className?: string }, { error, reset }: ErrorInfo) {
  return (
    <Panel className={className} role="alert">
      <Reported error={error} where={`panel:${name}`} />
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] text-[var(--c-ink-2)]">
          <WarningCircle size={18} className="shrink-0 text-[var(--c-accent)]" />
          {name} couldn&apos;t load. The rest of the page works.
        </p>
        <SmallButton onClick={() => reset()}>Try again</SmallButton>
      </div>
    </Panel>
  );
}

/** One panel that fails shows a short note in its place; the page around it keeps working. */
export const PanelBoundary = catchError(PanelFallback);
