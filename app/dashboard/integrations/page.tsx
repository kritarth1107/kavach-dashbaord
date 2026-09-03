import { Suspense } from "react";
import { IntegrationsPage } from "@/components/dashboard/integrations-page";

export default function IntegrationsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <IntegrationsPage />
    </Suspense>
  );
}
