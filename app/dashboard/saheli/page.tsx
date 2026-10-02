import { Suspense } from "react";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";
import { DayCalendarPage as SaheliTodayPage } from "@/components/care-os/day-calendar-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SaheliTodayPage />
    </Suspense>
  );
}
