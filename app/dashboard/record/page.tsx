import { Suspense } from "react";
import { HealthRecordPage } from "@/components/dashboard/health-record-page";

export default function RecordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <span className="text-[13px] text-[var(--text-tertiary)]">Loading health records…</span>
        </div>
      }
    >
      <HealthRecordPage />
    </Suspense>
  );
}
