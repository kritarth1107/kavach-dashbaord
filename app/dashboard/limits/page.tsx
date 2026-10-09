import { Suspense } from "react";
import { LimitsPage } from "@/components/care-os/limits-page";

export default function Page() {
  return (
    <Suspense>
      <LimitsPage />
    </Suspense>
  );
}
