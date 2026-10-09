import { Suspense } from "react";
import { TasksPage } from "@/components/care-os/tasks-page";

export default function Page() {
  return (
    <Suspense>
      <TasksPage />
    </Suspense>
  );
}
