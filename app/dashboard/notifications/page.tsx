import { Suspense } from "react";
import { NotificationsPage } from "@/components/dashboard/notifications/notifications-page";

export default function Page() {
  return (
    <Suspense>
      <NotificationsPage />
    </Suspense>
  );
}
