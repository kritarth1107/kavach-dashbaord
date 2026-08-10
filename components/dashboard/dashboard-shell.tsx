"use client";

import { usePathname } from "next/navigation";
import { RoleBasedRightPanel } from "./role-based-right-panel";
import { PageHeader } from "./page-header";
import { FamilyAccessBanner } from "@/components/dashboard/family-access-banner";
import { CareRecipientViewRightPanel } from "@/components/dashboard/family/care-recipient-view-right-panel";
import { CareRecipientScheduleProvider } from "@/components/dashboard/family/care-recipient-schedule-context";
import { useFamily } from "@/components/dashboard/family-context";
import { cn } from "@/lib/utils";

function isCareRecipientView(pathname: string) {
  return /^\/dashboard\/family\/[^/]+$/.test(pathname);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOverview = pathname === "/dashboard";
  const isRecipientView = isCareRecipientView(pathname);
  const splitLayout = isOverview || isRecipientView;
  const { familyAccessAlert, dismissFamilyAccessAlert } = useFamily();

  const shell = (
    <>
      <main
        className={cn(
          "no-scrollbar flex min-w-0 flex-col overflow-y-auto bg-white",
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

  if (isRecipientView) {
    return <CareRecipientScheduleProvider>{shell}</CareRecipientScheduleProvider>;
  }

  return shell;
}
