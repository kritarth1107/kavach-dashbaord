import { Suspense } from "react";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";
import { CarePlanPage } from "@/components/care-os/care-plan-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <CarePlanPage />
    </Suspense>
  );
}
