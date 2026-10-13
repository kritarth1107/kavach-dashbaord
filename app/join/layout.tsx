import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're invited · Kavach CareOS",
  robots: { index: false, follow: false },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
