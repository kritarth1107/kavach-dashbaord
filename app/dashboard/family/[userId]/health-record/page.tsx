import { RecipientHealthRecordPage } from "@/components/dashboard/health-records/recipient-health-record-page";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function CareRecipientHealthRecordPage(_props: PageProps) {
  return <RecipientHealthRecordPage />;
}
