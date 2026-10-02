import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emergency card · Kavach CareOS",
  robots: { index: false, follow: false },
};

export default function PublicEmergencyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
