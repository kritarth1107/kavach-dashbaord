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
        "absolute z-50 mb-2 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.1)]",
        collapsed
          ? "bottom-0 left-full ml-2 w-64"
          : "bottom-full left-2 right-2",
      )}
    >
      <div className="border-b border-[#f0f0f2] px-4 py-3">
        <p className="truncate text-[13px] font-semibold text-[#111827]">{email}</p>
      </div>

      <div className="p-1.5">
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb]"
        >
          <Settings className="h-4 w-4 text-[#6b7280]" strokeWidth={1.75} />
          Settings
        </Link>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb]"
        >
          <span className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-[#6b7280]" strokeWidth={1.75} />
            Language
          </span>
          <ChevronRight className="h-4 w-4 text-[#9ca3af]" strokeWidth={2} />
        </button>
      </div>

      <div className="border-t border-[#f0f0f2] p-1.5">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
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
            className="block rounded-lg px-3 py-2 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb]"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="border-t border-[#f0f0f2] p-1.5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#dc2626] transition-colors hover:bg-[#fef2f2]"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </div>
  );
}
