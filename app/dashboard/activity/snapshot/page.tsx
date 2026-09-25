import { Suspense } from "react";
import { DailySnapshotPage } from "@/components/dashboard/activity/daily-snapshot-page";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DailySnapshotPage />
    </Suspense>
  );
}
