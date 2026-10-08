"use client";

import { useSearchParams } from "next/navigation";
import { HealthRecordsPage } from "@/components/dashboard/health-records/health-records-page";
import { usePerson } from "@/components/care-os/person-context";

export function HealthRecordPage() {
  const searchParams = useSearchParams();
  const { selectedId } = usePerson();
  // The topbar person picker decides whose records these are (also when it is your own self care).
  const recipientUserId = searchParams.get("recipient") ?? selectedId ?? null;

  return <HealthRecordsPage key={recipientUserId ?? "none"} recipientUserId={recipientUserId} />;
}
