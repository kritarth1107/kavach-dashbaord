"use client";

import { AlertTriangle, X } from "lucide-react";
import type { FamilyAccessAlert } from "@/lib/api";

type FamilyAccessBannerProps = {
  alert: FamilyAccessAlert;
  onDismiss: () => void;
};

export function FamilyAccessBanner({ alert, onDismiss }: FamilyAccessBannerProps) {
  const isBlocked = alert.type === "blocked";

  return (
    <div
      className={
        isBlocked
          ? "mb-4 flex items-start gap-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3"
          : "mb-4 flex items-start gap-3 alert-warning rounded-xl px-4 py-3"
      }
    >
      <AlertTriangle
        className={isBlocked ? "mt-0.5 h-4 w-4 shrink-0 text-[var(--danger-text)]" : "mt-0.5 h-4 w-4 shrink-0 text-[var(--warning-text)]"}
        strokeWidth={2.25}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[var(--text-primary)]">
          {isBlocked
            ? `You were blocked from ${alert.familyName}`
            : `You were removed from ${alert.familyName}`}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
          {isBlocked
            ? "You no longer have access to that family. We've switched you to your available family."
            : "You no longer have access to that family. We've moved you to your own family workspace."}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
      >
        <X className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
