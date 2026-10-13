import { Suspense } from "react";
import { InvitationsPage } from "@/components/care-os/invitations-page";

export default function Page() {
  return (
    <Suspense>
      <InvitationsPage />
    </Suspense>
  );
}
