import { Suspense } from "react";
import { ReportPage } from "@/components/care-os/report-page";

export default function Page() {
  return (
    <Suspense>
      <ReportPage />
    </Suspense>
  );
}
