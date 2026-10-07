import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/flow";

export const metadata: Metadata = { title: "Set up Saheli · Kavach CareOS" };

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
