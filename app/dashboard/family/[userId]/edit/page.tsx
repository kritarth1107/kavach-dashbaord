import { Suspense } from "react";
import { MemberFormPage } from "@/components/care-os/member-form-page";

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return (
    <Suspense>
      <MemberFormPage memberId={decodeURIComponent(userId)} />
    </Suspense>
  );
}
