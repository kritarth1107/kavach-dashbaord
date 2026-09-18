"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFamily } from "@/components/dashboard/family-context";
import { searchFamily, type SearchResult } from "@/lib/api";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const router = useRouter();
  const { activeFamilyId } = useFamily();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!activeFamilyId) return;
      setLoading(true);
      try {
        const { data } = await searchFamily(activeFamilyId, q);
        setResults(data?.results ?? []);
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [activeFamilyId],
  );

  useEffect(() => {
    if (!open || !activeFamilyId) return;
    const timer = setTimeout(() => void runSearch(query), 200);
    return () => clearTimeout(timer);
  }, [open, query, activeFamilyId, runSearch]);

  function navigate(result: SearchResult) {
    setOpen(false);
    router.push(result.url);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[activeIndex]) {
                navigate(results[activeIndex]);
              }
            }}
            placeholder="Search people, reports, chats, orders…"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--text-tertiary)]"
          />
          <kbd className="rounded border border-[var(--border-strong)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
            Esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-[var(--text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-[var(--text-secondary)]">
              {query ? "No results" : "Type to search or pick a page"}
            </p>
          ) : (
            results.map((result, idx) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                onClick={() => navigate(result)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left",
                  idx === activeIndex ? "bg-primary/10" : "hover:bg-[var(--input-bg)]",
                )}
              >
                <span className="mt-0.5 rounded-md bg-[var(--input-bg)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                  {result.type}
                </span>
                <span className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{result.title}</p>
                  <p className="truncate text-[11px] text-[var(--text-secondary)]">{result.subtitle}</p>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
