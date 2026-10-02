import { Suspense } from "react";
import { FamilyTasksPage } from "@/components/care-os/family-tasks-page";

export default function Page() {
  return (
    <Suspense>
      <FamilyTasksPage />
    </Suspense>
  );
}
