import { Suspense } from "react";
import { MemberFormPage } from "@/components/care-os/member-form-page";

export default function Page() {
  return (
    <Suspense>
      <MemberFormPage />
    </Suspense>
  );
}
