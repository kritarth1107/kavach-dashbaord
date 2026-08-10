import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Shield,
  Stethoscope,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Care",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Health Record", href: "/dashboard/record", icon: Stethoscope },
      { label: "Activity Log", href: "/dashboard/alerts", icon: TrendingUp },
    ],
  },
  {
    title: "Family",
    items: [
      { label: "Family Members", href: "/dashboard/family", icon: Users },
      {
        label: "Messages",
        href: "/dashboard/chat",
        icon: MessageSquare,
        badge: "3",
      },
    ],
  },
  {
    title: "Records",
    items: [
      { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
      { label: "Documents", href: "/dashboard/record", icon: FileText },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
      { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
      { label: "Settings", href: "/dashboard/settings", icon: Shield },
    ],
  },
];

export const allNavItems = navGroups.flatMap((group) => group.items);

export const recipientNavGroups: NavGroup[] = [
  {
    title: "My care",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Health Record", href: "/dashboard/record", icon: Stethoscope },
      { label: "Activity Log", href: "/dashboard/alerts", icon: TrendingUp },
    ],
  },
  {
    title: "Records",
    items: [
      { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
      { label: "Documents", href: "/dashboard/record", icon: FileText },
    ],
  },
  {
    title: "Connect",
    items: [
      {
        label: "Messages",
        href: "/dashboard/chat",
        icon: MessageSquare,
        badge: "3",
      },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Settings", href: "/dashboard/settings", icon: Shield }],
  },
];

export function getNavGroupsForRole(role: string | null | undefined): NavGroup[] {
  if (role?.toUpperCase() === "CARE_RECIPIENT") {
    return recipientNavGroups;
  }
  return navGroups;
}
