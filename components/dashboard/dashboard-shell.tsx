"use client";

import { usePathname } from "next/navigation";
import { RoleBasedRightPanel } from "./role-based-right-panel";
import { PageHeader } from "./page-header";
import { FamilyAccessBanner } from "@/components/dashboard/family-access-banner";
import { CareRecipientViewRightPanel } from "@/components/dashboard/family/care-recipient-view-right-panel";
import { CareRecipientProfileProvider } from "@/components/dashboard/family/care-recipient-profile-context";
import { CareRecipientScheduleProvider } from "@/components/dashboard/family/care-recipient-schedule-context";
import { RecipientDateProvider } from "@/components/dashboard/recipient/recipient-date-context";
import { useFamily } from "@/components/dashboard/family-context";
import { cn } from "@/lib/utils";
import { MobileMenuButton } from "@/components/dashboard/mobile-menu-button";

function isCareRecipientSplitView(pathname: string) {
  return /^\/dashboard\/family\/[^/]+$/.test(pathname);
}

function isCareRecipientFamilyRoute(pathname: string) {
  return /^\/dashboard\/family\/[^/]+(\/health-record)?$/.test(pathname);
}

function isChatRoute(pathname: string) {
  return pathname === "/dashboard/chat";
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOverview = pathname === "/dashboard";
  const isChat = isChatRoute(pathname);
  const isRecipientView = isCareRecipientSplitView(pathname);
  const isRecipientFamilyRoute = isCareRecipientFamilyRoute(pathname);
  const splitLayout = isOverview || isRecipientView;
  const { familyAccessAlert, dismissFamilyAccessAlert } = useFamily();

  const shell = (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row",
        isChat ? "overflow-hidden" : "overflow-y-auto lg:overflow-hidden",
      )}
    >
      <main
        className={cn(
          "no-scrollbar theme-surface flex min-w-0 flex-col",
          isChat ? "min-h-0 flex-1 overflow-hidden" : "lg:min-h-0 lg:overflow-y-auto",
          splitLayout ? "lg:flex-[3]" : "flex-1",
          !isChat && "flex-1",
        )}
      >
        {!isOverview && !isChat && <PageHeader />}
        {(isOverview || isChat) && (
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 lg:hidden">
            <MobileMenuButton />
            <p className="truncate text-[15px] font-extrabold text-[var(--text-primary)]">
              {isChat ? "Saheli" : "Kavach"}
            </p>
          </div>
        )}
        <div
          className={cn(
            isChat ? "flex min-h-0 flex-1 flex-col" : "px-4 py-4 sm:px-6 sm:py-6",
          )}
        >
          {familyAccessAlert && !isChat && (
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
    </div>
  );

  if (isRecipientFamilyRoute) {
    const wrapped = isRecipientView ? (
      <CareRecipientProfileProvider>
        <RecipientDateProvider>{shell}</RecipientDateProvider>
      </CareRecipientProfileProvider>
    ) : (
      shell
    );
    return <CareRecipientScheduleProvider>{wrapped}</CareRecipientScheduleProvider>;
  }

  return shell;
}
