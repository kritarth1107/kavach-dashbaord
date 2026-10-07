export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return <div className="care-os h-full min-h-screen overflow-auto bg-[var(--c-frame)]">{children}</div>;
}
