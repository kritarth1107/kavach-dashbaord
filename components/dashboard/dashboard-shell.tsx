"use client";

import { usePathname } from "next/navigation";
import { RoleBasedRightPanel } from "./role-based-right-panel";
import { PageHeader } from "./page-header";
import { FamilyAccessBanner } from "@/components/dashboard/family-access-banner";
import { CareRecipientViewRightPanel } from "@/components/dashboard/family/care-recipient-view-right-panel";
import { CareRecipientScheduleProvider } from "@/components/dashboard/family/care-recipient-schedule-context";
import { RecipientDateProvider } from "@/components/dashboard/recipient/recipient-date-context";
import { useFamily } from "@/components/dashboard/family-context";
import { cn } from "@/lib/utils";

function isCareRecipientSplitView(pathname: string) {
  return /^\/dashboard\/family\/[^/]+$/.test(pathname);
}

function isCareRecipientFamilyRoute(pathname: string) {
  return /^\/dashboard\/family\/[^/]+(\/health-record)?$/.test(pathname);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOverview = pathname === "/dashboard";
  const isRecipientView = isCareRecipientSplitView(pathname);
  const isRecipientFamilyRoute = isCareRecipientFamilyRoute(pathname);
  const splitLayout = isOverview || isRecipientView;
  const { familyAccessAlert, dismissFamilyAccessAlert } = useFamily();

  const shell = (
    <>
      <main
        className={cn(
          "no-scrollbar theme-surface flex min-w-0 flex-col overflow-y-auto",
          splitLayout ? "flex-[3]" : "flex-1",
        )}
      >
        {!isOverview && <PageHeader />}
        <div className="px-6 py-6">
          {familyAccessAlert && (
            <FamilyAccessBanner
              alert={familyAccessAlert}
              onDismiss={dismissFamilyAccessAlert}
            />
          )}
          {children}
        </div>
      </main>
      {isOverview && <RoleBasedRightPanel />}
      {isRecipientView && <CareRecipientViewRightPanel />}
    </>
  );

  if (isRecipientFamilyRoute) {
    const wrapped = isRecipientView ? (
      <RecipientDateProvider>{shell}</RecipientDateProvider>
    ) : (
      shell
    );
    return <CareRecipientScheduleProvider>{wrapped}</CareRecipientScheduleProvider>;
  }

  return shell;
}
