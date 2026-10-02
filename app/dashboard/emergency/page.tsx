import { Suspense } from "react";
import { EmergencyPage } from "@/components/care-os/emergency-page";

export default function Page() {
  return (
    <Suspense>
      <EmergencyPage />
    </Suspense>
  );
}
