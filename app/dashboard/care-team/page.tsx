import { Suspense } from "react";
import { CareTeamPage } from "@/components/care-os/care-team-page";

export default function Page() {
  return (
    <Suspense>
      <CareTeamPage />
    </Suspense>
  );
}
