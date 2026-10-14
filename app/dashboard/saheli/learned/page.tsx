import { Suspense } from "react";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";
import { LearnedPage } from "@/components/care-os/learned-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LearnedPage />
    </Suspense>
  );
}
