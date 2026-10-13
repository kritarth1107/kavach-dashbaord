import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Food and nutrition report · Kavach CareOS",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PublicNutritionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
