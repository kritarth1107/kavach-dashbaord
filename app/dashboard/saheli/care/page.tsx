import { Suspense } from "react";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";
import { SaheliCarePage } from "@/components/dashboard/saheli/saheli-care-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SaheliCarePage />
    </Suspense>
  );
}
