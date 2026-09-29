"use client";

import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

export function MobileMenuButton({ className }: { className?: string }) {
  const { setMobileOpen } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Open menu"
      onClick={() => setMobileOpen(true)}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-primary)] lg:hidden",
        className,
      )}
    >
      <Menu className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}
