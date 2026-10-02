"use client";

import { useSearchParams } from "next/navigation";
import { HealthRecordsPanel } from "@/components/dashboard/health-records/health-records-panel";
import { usePerson } from "@/components/care-os/person-context";

export function HealthRecordPage() {
  const searchParams = useSearchParams();
  const { selectedId } = usePerson();
  // The topbar person picker decides whose records these are (also when it is your own self care).
  const recipientUserId = searchParams.get("recipient") ?? selectedId ?? undefined;

  return <HealthRecordsPanel key={recipientUserId ?? "all"} showAddForm fixedRecipientUserId={recipientUserId} />;
}
