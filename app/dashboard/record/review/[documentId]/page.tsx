import { Suspense } from "react";
import { RecordReviewPage } from "@/components/dashboard/health-records/review-page";

type RouteProps = {
  params: Promise<{ documentId: string }>;
};

export default async function RecordReviewRoute({ params }: RouteProps) {
  const { documentId } = await params;
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-busy="true" aria-label="Loading the report">
          <div className="h-[72px] w-full max-w-[420px] animate-pulse rounded-[20px] bg-[var(--c-card)]" />
          <div className="h-[420px] animate-pulse rounded-[24px] bg-[var(--c-card)]" />
        </div>
      }
    >
      <RecordReviewPage documentId={documentId} />
    </Suspense>
  );
}
