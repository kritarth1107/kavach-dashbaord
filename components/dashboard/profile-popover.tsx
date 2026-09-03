"use client";

import { LogOut, Settings, Globe, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/api";
import { clearStoredFamilyId } from "@/lib/family-storage";

type ProfilePopoverProps = {
  open: boolean;
  onClose: () => void;
  email: string;
  collapsed: boolean;
};

export function ProfilePopover({
  open,
  onClose,
  email,
  collapsed,
}: ProfilePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  async function handleLogout() {
    onClose();
    clearStoredFamilyId();
    await logout().catch(() => undefined);
    await signOut({ redirect: false });
    router.push("/auth/login");
  }

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mb-2 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--card)] shadow-[0_8px_30px_rgba(0,0,0,0.1)]",
        collapsed
          ? "bottom-0 left-full ml-2 w-64"
          : "bottom-full left-2 right-2",
      )}
    >
      <div className="border-b border-[var(--border-strong)] px-4 py-3">
        <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{email}</p>
      </div>

      <div className="p-1.5">
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--input-bg)]"
        >
          <Settings className="h-4 w-4 text-[var(--text-secondary)]" strokeWidth={1.75} />
          Settings
        </Link>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--input-bg)]"
        >
          <span className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-[var(--text-secondary)]" strokeWidth={1.75} />
            Language
          </span>
          <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" strokeWidth={2} />
        </button>
      </div>

      <div className="border-t border-[var(--border-strong)] p-1.5">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Legal
        </p>
        {[
          { label: "Privacy Policy", href: "https://kavach.care/privacy" },
          { label: "Terms of Service", href: "https://kavach.care/terms" },
          { label: "Safety", href: "https://kavach.care/safety" },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="block rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--input-bg)]"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="border-t border-[var(--border-strong)] p-1.5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-bg)]"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </div>
  );
}
