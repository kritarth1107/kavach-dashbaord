"use client";

import { useFamily } from "@/components/dashboard/family-context";
import { isCareRecipientRole } from "@/components/dashboard/family/family-data";
import { CaregiverDashboardHome } from "@/components/dashboard/caregiver/caregiver-dashboard-home";
import { RecipientDashboardHome } from "@/components/dashboard/recipient/recipient-dashboard-home";
import { RecipientDateProvider } from "@/components/dashboard/recipient/recipient-date-context";

export function DashboardHome() {
  const { activeFamily, loading } = useFamily();
  const isRecipient = isCareRecipientRole(activeFamily?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isRecipient) {
    return (
      <RecipientDateProvider>
        <RecipientDashboardHome />
      </RecipientDateProvider>
    );
  }

  return <CaregiverDashboardHome />;
}
