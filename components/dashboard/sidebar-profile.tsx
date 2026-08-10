"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getMe, type AuthUser } from "@/lib/api";
import { ProfilePopover } from "./profile-popover";

function getInitials(name?: string, email?: string) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "?";
}

export function SidebarProfile({ collapsed }: { collapsed: boolean }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getMe()
      .then(({ data }) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => undefined);
  }, []);

  const name = user?.fullName ?? "User";
  const email = user?.email ?? "";
  const initials = getInitials(user?.fullName, user?.email);

  return (
    <div className={cn("relative mt-auto pt-3", collapsed ? "pr-0" : "pr-1")}>
      <ProfilePopover
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        email={email}
        collapsed={collapsed}
      />
      <button
        type="button"
        onClick={() => setProfileOpen((v) => !v)}
        title={collapsed ? name : undefined}
        className={cn(
          "flex w-full items-center rounded-lg py-2 text-left transition-colors hover:bg-white",
          profileOpen && "bg-white",
          collapsed ? "justify-center px-0" : "gap-3 px-2",
        )}
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#86efac] to-[#16a34a] text-xs font-bold text-white">
            {initials}
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#111827]">
              {name}
            </p>
            <p className="truncate text-[11px] text-[#9ca3af]">{email}</p>
          </div>
        )}
      </button>
    </div>
  );
}
