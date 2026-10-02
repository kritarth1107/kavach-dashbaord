import { Suspense } from "react";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";
import { SaheliMemoryPage } from "@/components/dashboard/saheli/saheli-memory-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SaheliMemoryPage />
    </Suspense>
  );
}
