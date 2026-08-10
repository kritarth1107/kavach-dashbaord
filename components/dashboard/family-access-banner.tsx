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
          ? "mb-4 flex items-start gap-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3"
          : "mb-4 flex items-start gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3"
      }
    >
      <AlertTriangle
        className={isBlocked ? "mt-0.5 h-4 w-4 shrink-0 text-[#dc2626]" : "mt-0.5 h-4 w-4 shrink-0 text-[#d97706]"}
        strokeWidth={2.25}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[#111827]">
          {isBlocked
            ? `You were blocked from ${alert.familyName}`
            : `You were removed from ${alert.familyName}`}
        </p>
        <p className="mt-0.5 text-[12px] text-[#6b7280]">
          {isBlocked
            ? "You no longer have access to that family. We've switched you to your available family."
            : "You no longer have access to that family. We've moved you to your own family workspace."}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded-lg p-1 text-[#9ca3af] hover:bg-black/5 hover:text-[#374151]"
      >
        <X className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
