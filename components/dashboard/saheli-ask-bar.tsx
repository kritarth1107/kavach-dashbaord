"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SaheliAskBar({
  recipientUserId,
  placeholder = "Ask Saheli anything — labs, mood, order from Swiggy…",
  className,
  compact,
}: {
  recipientUserId?: string | null;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function go(text: string) {
    const q = text.trim();
    if (!q) return;
    const base = recipientUserId
      ? `/dashboard/chat?recipient=${encodeURIComponent(recipientUserId)}`
      : "/dashboard/chat";
    const url = `${base}&q=${encodeURIComponent(q)}`;
    router.push(url);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(query);
      }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] shadow-sm",
        compact ? "px-3 py-2" : "px-4 py-3",
        className,
      )}
    >
      <Sparkles className={cn("shrink-0 text-primary", compact ? "h-4 w-4" : "h-5 w-5")} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[var(--text-primary)] placeholder:font-normal placeholder:text-[var(--text-tertiary)] outline-none"
      />
      <button
        type="submit"
        disabled={!query.trim()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </form>
  );
}
