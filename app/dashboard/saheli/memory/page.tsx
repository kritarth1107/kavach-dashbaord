import { Suspense } from "react";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";
import { MemoryPage as SaheliMemoryPage } from "@/components/care-os/memory-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SaheliMemoryPage />
    </Suspense>
  );
}
