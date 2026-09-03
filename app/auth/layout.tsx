export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <div className="h-full min-h-screen bg-[var(--auth-bg)]">{children}</div>
  );
}
