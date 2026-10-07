import type { Metadata } from "next";
import { OnboardingChat } from "@/components/onboarding/chat/chat";

export const metadata: Metadata = { title: "Set up Saheli · Kavach CareOS" };

export default function OnboardingPage() {
  return <OnboardingChat />;
}
