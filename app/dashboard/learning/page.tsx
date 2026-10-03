import { Suspense } from "react";
import { LearningPage } from "@/components/care-os/learning-page";

export default function Page() {
  return (
    <Suspense>
      <LearningPage />
    </Suspense>
  );
}
