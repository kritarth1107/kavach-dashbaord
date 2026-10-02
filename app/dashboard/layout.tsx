import { Suspense } from "react";
import { CareOsFrame } from "@/components/care-os/frame";
import { FamilyProvider } from "@/components/dashboard/family-context";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <SidebarProvider>
      <FamilyProvider>
        <Suspense>
          <CareOsFrame>{children}</CareOsFrame>
        </Suspense>
      </FamilyProvider>
    </SidebarProvider>
  );
}
