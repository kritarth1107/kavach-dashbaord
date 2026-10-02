import { Suspense } from "react";
import { SpendingPage } from "@/components/care-os/spending-page";

export default function Page() {
  return (
    <Suspense>
      <SpendingPage />
    </Suspense>
  );
}
