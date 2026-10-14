"use client";
/** The store or ride app's own icon (public/logos), or its first letter when Kavach has no icon for it. */

import { cn } from "@/lib/utils";

const LOGOS = new Set(["swiggy", "instamart", "zepto", "blinkit", "zomato", "apollo", "1mg", "pharmeasy", "uber", "ola", "rapido"]);

export function ServiceLogo({ service, label, size = 36, className }: { service: string; label?: string; size?: number; className?: string }) {
  const key = (service || "").toLowerCase();
  const radius = Math.round(size * 0.28);
  if (LOGOS.has(key)) {
    // the logo's own backdrop stays light in both themes (the store marks are drawn for a light tile, some with
    // see-through edges); on-solid is the theme's near-white
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/logos/${key}.png`} alt={label ? `${label} logo` : ""} width={size} height={size} className={cn("shrink-0 bg-[var(--c-on-solid)] object-cover", className)} style={{ borderRadius: radius }} />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center bg-[var(--c-solid-soft)] font-medium text-[var(--c-solid)]", className)}
      style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.42) }}
    >
      {(label || service || "?").charAt(0).toUpperCase()}
    </span>
  );
}
