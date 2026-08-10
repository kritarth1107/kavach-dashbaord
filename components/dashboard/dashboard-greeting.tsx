"use client";

import { useEffect, useState } from "react";
import { getMe } from "@/lib/api";

function getTimeGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDisplayName(fullName: string, firstName?: string): string {
  if (firstName?.trim()) return firstName.trim();
  return fullName.trim().split(/\s+/)[0] || "there";
}

const subtitles = {
  caregiver:
    "Mama is doing well today — morning check-in was cheerful and both medicines are taken. One grocery payment needs your approval.",
  recipient:
    "Here is your care summary for today — check-ins, medicines, and reports in one place. Your family is kept in the loop automatically.",
} as const;

export function DashboardGreeting({
  variant = "caregiver",
}: {
  variant?: "caregiver" | "recipient";
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    getMe()
      .then(({ data }) => {
        if (data?.user) {
          setName(getDisplayName(data.user.fullName, data.user.firstName));
        }
      })
      .catch(() => undefined);
  }, []);

  const now = new Date();
  const greeting = getTimeGreeting(now);
  const heading = name ? `${greeting}, ${name}` : greeting;

  return (
    <div className="mb-6">
      <p className="text-[12px] font-semibold text-[#9ca3af]">
        {formatHeaderDate(now)}
      </p>
      <h1 className="mt-1 text-[1.75rem] font-extrabold leading-tight tracking-[-0.03em] text-[#1a1a1a]">
        {heading}
      </h1>
      <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-[#9ca3af]">
        {subtitles[variant]}
      </p>
    </div>
  );
}
