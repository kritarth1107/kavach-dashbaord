import { Suspense } from "react";
import { ActivityFeedPage } from "@/components/dashboard/activity/activity-feed-page";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ActivityFeedPage />
    </Suspense>
  );
}
