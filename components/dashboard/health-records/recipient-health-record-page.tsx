"use client";

import { useParams } from "next/navigation";
import { HealthRecordsPage } from "@/components/dashboard/health-records/health-records-page";

/** /dashboard/family/[userId]/health-record: the same health records page, with a way back to the profile. */
export function RecipientHealthRecordPage() {
  const params = useParams();
  const userId = params.userId as string;
  return <HealthRecordsPage key={userId} recipientUserId={userId} from="family" />;
}
