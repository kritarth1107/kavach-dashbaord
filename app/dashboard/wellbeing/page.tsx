import { Suspense } from "react";
import { WellbeingPage } from "@/components/care-os/wellbeing-page";

export default function Page() {
  return (
    <Suspense>
      <WellbeingPage />
    </Suspense>
  );
}
