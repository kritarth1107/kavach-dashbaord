import { Suspense } from "react";
import { CareOsFrame } from "@/components/care-os/frame";
import { FamilyProvider } from "@/components/dashboard/family-context";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";

// The providers hydrate inside the same Suspense boundary as the frame. With the boundary between them, the family
// provider could load the family before the frame had hydrated, and the frame then hydrated against the new state
// ("server rendered HTML didn't match": the person picker's skeleton vs "Add someone to care for").
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense>
      <SidebarProvider>
        <FamilyProvider>
          <CareOsFrame>{children}</CareOsFrame>
        </FamilyProvider>
      </SidebarProvider>
    </Suspense>
  );
}
