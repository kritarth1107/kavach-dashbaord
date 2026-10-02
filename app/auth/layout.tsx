export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return <div className="care-os h-full min-h-screen overflow-auto bg-[var(--c-frame)]">{children}</div>;
}
