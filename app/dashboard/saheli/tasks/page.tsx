import { Suspense } from "react";
import { PageSpinner } from "@/components/dashboard/activity/activity-shared";
import { OrdersPage } from "@/components/care-os/orders-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <OrdersPage />
    </Suspense>
  );
}
