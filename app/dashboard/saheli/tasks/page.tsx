import { Suspense } from "react";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";
import { SaheliTasksPage } from "@/components/dashboard/saheli/saheli-tasks-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SaheliTasksPage />
    </Suspense>
  );
}
