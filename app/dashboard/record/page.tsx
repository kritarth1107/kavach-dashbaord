import { Suspense } from "react";
import { HealthRecordPage } from "@/components/dashboard/health-record-page";

export default function RecordPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-busy="true" aria-label="Loading health records">
          <div className="h-[110px] w-full max-w-[320px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
          <div className="h-[320px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
        </div>
      }
    >
      <HealthRecordPage />
    </Suspense>
  );
}
