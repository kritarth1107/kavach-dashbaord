"use client";

import { useSearchParams } from "next/navigation";
import { HealthRecordsPanel } from "@/components/dashboard/health-records/health-records-panel";

export function HealthRecordPage() {
  const searchParams = useSearchParams();
  const recipientUserId = searchParams.get("recipient") ?? undefined;

  return (
    <HealthRecordsPanel
      showAddForm
      fixedRecipientUserId={recipientUserId}
    />
  );
}
