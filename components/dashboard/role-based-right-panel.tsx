"use client";

import { useFamily } from "@/components/dashboard/family-context";
import { isCareRecipientRole } from "@/components/dashboard/family/family-data";
import { DashboardRightPanel } from "@/components/dashboard/right-panel";
import { RecipientRightPanel } from "@/components/dashboard/recipient/recipient-right-panel";

export function RoleBasedRightPanel() {
  const { activeFamily, loading } = useFamily();

  if (loading) {
    return (
      <aside className="flex h-screen min-w-0 flex-1 shrink-0 items-center justify-center border-l border-[#f0f0f2]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </aside>
    );
  }

  if (isCareRecipientRole(activeFamily?.role)) {
    return <RecipientRightPanel />;
  }

  return <DashboardRightPanel />;
}
