import { Suspense } from "react";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";
import { SaheliTodayPage } from "@/components/dashboard/saheli/saheli-today-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SaheliTodayPage />
    </Suspense>
  );
}
