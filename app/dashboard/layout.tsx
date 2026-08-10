import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FamilyProvider } from "@/components/dashboard/family-context";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <SidebarProvider>
      <FamilyProvider>
        <div className="flex h-screen w-full overflow-hidden bg-white">
          <DashboardSidebar />
          <DashboardShell>{children}</DashboardShell>
        </div>
      </FamilyProvider>
    </SidebarProvider>
  );
}
