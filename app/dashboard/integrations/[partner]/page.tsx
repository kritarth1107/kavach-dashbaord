import { Suspense } from "react";
import { notFound } from "next/navigation";
import { IntegrationPartnerPage } from "@/components/dashboard/integration-partner-page";
import { isIntegrationPartner } from "@/components/dashboard/integrations-data";

type PageProps = {
  params: Promise<{ partner: string }>;
};

export default async function IntegrationPartnerRoute({ params }: PageProps) {
  const { partner } = await params;
  if (!isIntegrationPartner(partner)) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <IntegrationPartnerPage partner={partner} />
    </Suspense>
  );
}
