export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <div className="h-full min-h-screen bg-[#fafafa]">{children}</div>
  );
}
