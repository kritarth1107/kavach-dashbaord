import { CareRecipientViewPage } from "@/components/dashboard/family/care-recipient-view-page";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function CareRecipientProfilePage(_props: PageProps) {
  return <CareRecipientViewPage />;
}
